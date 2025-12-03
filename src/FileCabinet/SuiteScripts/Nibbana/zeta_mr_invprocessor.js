/**
* @NApiVersion 2.1
* @NScriptType MapReduceScript
*/

/*
File: zeta_mr_cr_to_invrec.js
Author: Jaswanth Vardireddy <jvardireddy@nibbanaconsulting.com>
Client: Zeta Global
Purpose: Handling the approval mechanism on employee records
Copyright (c) 2024 Nibbana Consulting Private Limited
All rights reserved. No part of this code may be copied or used without express, written permission from Nibbana.
*/

define(['N/record', 'N/search', 'N/runtime', 'N/email'],
    /**
* @param{record} record
* @param{search} search
*/
    (record, search, runtime, email) => {

        const getInputData = (inputContext) => {
            log.debug('In Get inp data')
            const dateRange = JSON.parse(runtime.getCurrentScript().getParameter({
                name: 'custscript_ud_daterange'
            }))
            log.debug("date Range ", dateRange)

            return search.create({
                type: 'customrecord_zeta_rec_so',
                filters: [
                    ['custrecord_zeta_cr_inv_isinvvoicecreated', 'is', 'F'],
                    "AND",
                    ["custrecord_zeta_cr_inv_date","within", dateRange.fromDate, dateRange.toDate]
                ],
                columns: ['internalid', 'custrecord_zeta_cr_inv_so_no']
            });
        }

        const map = (mapContext) => {

            var soCr = JSON.parse(mapContext.value);
            var customRecordId = soCr.id;
            var salesOrderId = soCr.values.custrecord_zeta_cr_inv_so_no;
            log.debug("crId", customRecordId)
            log.debug("salesOrderId", salesOrderId)

            mapContext.write({
                key: salesOrderId,
                value: customRecordId
            });
        }

        const reduce = (reduceContext) => {

            try {
                var salesOrderId = JSON.parse(reduceContext.key);
                var customRecordIds = reduceContext.values;
                const biller = runtime.getCurrentScript().getParameter({
                    name: 'custscript_ud_biller'
                });

                var invoiceRec = record.transform({
                    fromType: record.Type.SALES_ORDER,
                    fromId: salesOrderId.value,
                    toType: record.Type.INVOICE,
                    isDynamic: true
                });
                
                var results = processCustomRecords(customRecordIds, salesOrderId, invoiceRec);
                log.debug("Processed results ", results)
                log.debug("results", results.invOppIds, results.wrongIds)

                var errorMessage = null;

                if (results.wrongIds.length == 0) {

                    removeLines( invoiceRec, results.invOppIds)
                    // Save the invoice record only if no incorrect opportunity ID was found
                    invoiceRec.setValue('custbody_cretd_by', biller)
                    var invId = invoiceRec.save();
                    log.debug('Invoice created successfully', 'Invoice ID: ' + invId);

                    var invRec = record.load({
                        type: record.Type.INVOICE,
                        id: invId
                    });
                    var invTranid = invRec.getValue('tranid')
                    log.debug("invTranid", invTranid)

                    updateCustomRecordsWithInvoice(customRecordIds, invTranid)

                } else {
                    log.error('Error', 'One or more custom records have an invalid crSalesForceId.');
                    errorMessage = 'One or more custom records have an invalid crSalesForceId.';
                }
            } catch (e) {
                log.error('Error processing custom records', e);
                // need to update records with error message
                var finalErrorMessage = errorMessage || e.message
                updateFailedCustomRecords(customRecordIds, finalErrorMessage)
            }
        }

        const summarize = (summaryContext) => {
            summaryContext.mapSummary.errors.iterator().each(function (key, error, executionNo) {
                log.error('Map Error for Key: ' + key, error);
                return true;
            });

            summaryContext.reduceSummary.errors.iterator().each(function (key, error, executionNo) {
                log.error('Reduce Error for Key: ' + key, error);
                return true;
            });

            const dateRange = JSON.parse(runtime.getCurrentScript().getParameter({
                name: 'custscript_ud_daterange'
            }))

            var udsearch = search.create({
                type: "customrecord_zeta_rec_so",
                filters:
                    [
                        ['custrecord_zeta_cr_inv_isinvvoicecreated', 'is', 'F'],
                        "AND",
                        ["custrecord_zeta_cr_inv_date","within", dateRange.fromDate, dateRange.toDate]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            summary: "COUNT",
                            label: "Internal ID"
                        }),
                        search.createColumn({
                            name: "custrecord_invproc_error_flag",
                            summary: "GROUP",
                            label: "Is Errored?"
                        })
                    ]
            });

            var searchResult = udsearch.run();
            var results = searchResult.getRange({
                start: 0,
                end: 1000
            });

            var totalCount = 0;
            var failedCount = 0;

            if (results.length > 0) {

                results.forEach(function(result) {
                    var count = parseInt(result.getValue({
                        name: "internalid",
                        summary: "COUNT"
                    }), 10);
                    var errorFlag = result.getValue({
                        name: "custrecord_invproc_error_flag",
                        summary: "GROUP"
                    });

                    totalCount += count;

                    if (errorFlag === 'T' || errorFlag === true) {
                        failedCount += count;
                    }
                });
            }

            const biller = runtime.getCurrentScript().getParameter({
                name: 'custscript_ud_biller'
            });
            const subject = 'Usage Data Record Processor';
            var htmlBody = `
                The invoice records have been successfully created. Please review the usage data records for any potential errors.<br>
                Total Records Processed: ${totalCount}<br>
                Count of Records with Errors: ${failedCount}
            `;
            email.send({
                author: biller,
                recipients: biller,
                subject: subject,
                body: htmlBody
            });
        }

        const processCustomRecords = (customRecordIds, salesOrderId, invoiceRec) => {
            
            var invOppIdsarray = []
            var wrongOppIds = []
            customRecordIds.forEach(function (customRecordId) {
                
                var { invProcQty, invProcAmnt, invProcOppId } = loadCustomRecordValues(customRecordId);
                var soOppIdArr = toGetOppIdSo(salesOrderId.value);
                log.debug("soOppIdArr", soOppIdArr)
                var invOppIdsArr = setInvoiceRecordValues(invProcAmnt, invProcQty, invoiceRec, invProcOppId)
                var incorrectIds = toGetIncorrectIds( soOppIdArr, invProcOppId)
                
                invOppIdsarray = invOppIdsarray.concat(invOppIdsArr)
                wrongOppIds = wrongOppIds.concat(incorrectIds)
                log.debug("Process completed for custom record")
            })
            log.debug("invOppIdsarray", invOppIdsarray)
            log.debug("wrongOppIds", wrongOppIds)
            var result = {
                "invOppIds" : invOppIdsarray,
                "wrongIds" : wrongOppIds
            };
            return result;
        }

        const loadCustomRecordValues = (customRecordId) => {
            var customRecord = record.load({
                type: 'customrecord_zeta_rec_so',
                id: customRecordId
            });

            return {
                invProcQty: customRecord.getValue({ fieldId: 'custrecord_zeta_cr_inv_qty' }),
                invProcAmnt: customRecord.getValue({ fieldId: 'custrecord_zeta_cr_inv_itemamount' }),
                invProcOppId: customRecord.getValue({ fieldId: 'custrecord_zeta_cr_inv_lineno' }),
            };
        }

        const toGetOppIdSo  = (soInternalId) => {
            var soRec = record.load({
                type: record.Type.SALES_ORDER,
                id: soInternalId
            });

            var soUniqueNoObj = [];
            var soLineCount = soRec.getLineCount({ sublistId: 'item' })
            for (var i = 0; i < soLineCount; i++) {

                var salesForceId = soRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_celigo_sfio_sf_id',
                    line: i
                });

                soUniqueNoObj.push(salesForceId)
            }
            log.debug("Sales order Opp Ids", soUniqueNoObj)
            return soUniqueNoObj
        }

        const setInvoiceRecordValues = (invProcAmnt, invProcQty, invoiceRec, invProcOppId) => {
            var invOppIdsArr = []
            var lineCount = invoiceRec.getLineCount({ sublistId: 'item' })
            for (var i = 0; i < lineCount; i++) {
                invoiceRec.selectLine({ sublistId: 'item', line: i });
                var sfIdInv = invoiceRec.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_celigo_sfio_sf_id'
                });

                if (sfIdInv == invProcOppId) {
                    invOppIdsArr.push(sfIdInv)
                    var quantity = invoiceRec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: invProcQty
                    });
                    var amount = invoiceRec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'amount',
                        value: invProcAmnt
                    });

                    invoiceRec.commitLine({ sublistId: 'item' });
                }
            }

            log.debug("invOppidsArr", invOppIdsArr)
            return invOppIdsArr
        }

        const toGetIncorrectIds = ( soOppIdArr, invProcOppId) => {
            var incorrectOppIdsArr = []

            if (!(soOppIdArr.includes(invProcOppId))) {
                incorrectOppIdsArr.push(invProcOppId)
            }

            log.debug("incorrectOppIdsArr", incorrectOppIdsArr)
            return incorrectOppIdsArr
        }

        const updateFailedCustomRecords = (customRecordsToUpdate, errorMessage) => {
            customRecordsToUpdate.forEach(function (customRecordId) {
                var customRecord = record.load({
                    type: 'customrecord_zeta_rec_so',
                    id: customRecordId
                });
                customRecord.setValue({
                    fieldId: 'custrecord_invproc_error_flag',
                    value: true
                });
                customRecord.setValue({
                    fieldId: 'custrecord_zeta_invproc_errmsg',
                    value: errorMessage
                });
                customRecord.save();
            });
            log.debug("Updated Failed Custom records")
        }

        const updateCustomRecordsWithInvoice = (customRecordIds, invTranid) => {
            customRecordIds.forEach(function (customRecordId) {
                var customRecord = record.load({
                    type: 'customrecord_zeta_rec_so',
                    id: customRecordId
                });

                customRecord.setValue({
                    fieldId: 'custrecord_zeta_cr_inv_isinvvoicecreated',
                    value: true
                });
                customRecord.setValue({
                    fieldId: 'custrecord_zeta_cr_inv_invvoicecreatedno',
                    value: invTranid
                });

                customRecord.save();
                log.debug("Custom Record Successfully Updated");
            });
        }

        const removeLines = ( invoiceRec, invOppIds) => {
            var lineCount = invoiceRec.getLineCount({ sublistId: 'item' });
            for (var i = lineCount - 1; i >= 0; i--) {
                var sfIdInv = invoiceRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_celigo_sfio_sf_id',
                    line: i
                });

                if (!(invOppIds.includes(sfIdInv))) {
                    invoiceRec.removeLine({ sublistId: 'item', line: i });
                    log.debug("removed unnecessary line");
                }
            }
        }
        
        return { getInputData, map, reduce, summarize }

    });
    