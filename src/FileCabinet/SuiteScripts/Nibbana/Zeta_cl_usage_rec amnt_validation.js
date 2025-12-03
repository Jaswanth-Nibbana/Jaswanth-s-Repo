/*
File: Zeta_cl_usage_rec_amnt_validation.js
Author: Jaswanth Vardireddy <jvardireddy@nibbanaconsulting.com>
Client: Zeta Global
Purpose: Handling the validation of UsageData Custom Record
Copyright (c) 2024 Nibbana Consulting Private Limited
All rights reserved. No part of this code may be copied or used without express, written permission from Nibbana.
*/

/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/ui/dialog', 'N/search'],
    /**
     * @param{record} record
     * @param{dialog} dialog
     */
    function (record, dialog, search) {
        var mode;
        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {
            mode = scriptContext.mode
        }

        /**
         * Validation function to be executed when record is saved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */
        function saveRecord(scriptContext) {
            var currentRecord = scriptContext.currentRecord
            
            if (mode == 'create' || mode == 'copy') {
                var salesforceOppIDCR = currentRecord.getValue('custrecord_zeta_cr_inv_lineno')
                var crQty = currentRecord.getValue('custrecord_zeta_cr_inv_qty')
                var crAmnt = currentRecord.getValue('custrecord_zeta_cr_inv_itemamount')
                var crRate = currentRecord.getValue('custrecord_zeta_cr_inv_itemrate')
                var soInternalId = currentRecord.getValue('custrecord_zeta_cr_inv_so_no')

                if (salesforceOppIDCR) {
                    var soRec = record.load({
                        type: record.Type.SALES_ORDER,
                        id: soInternalId,
                    })

                    var soLineCount = soRec.getLineCount({ sublistId: 'item' })
                    for (var i = 0; i < soLineCount; i++) {
                        var salesForceOppIdSO = soRec.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_celigo_sfio_sf_id',
                            line: i
                        });

                        if (salesForceOppIdSO == salesforceOppIDCR) {

                            var soQty = soRec.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                line: i
                            });
                            var soAmnt = soRec.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'amount',
                                line: i
                            });

                            var salesorderSearchObj = search.create({
                                type: "salesorder",
                                settings: [{ "name": "consolidationtype", "value": "NONE" }],
                                filters:
                                    [
                                        ["type", "anyof", "SalesOrd"],
                                        "AND",
                                        ["internalid", "anyof", soInternalId],
                                        "AND",
                                        ["taxline", "is", "F"],
                                        "AND",
                                        ["shipping", "is", "F"],
                                        "AND",
                                        ["quantity", "greaterthanorequalto", "1"],
                                        "AND",
                                        ["custcol_celigo_sfio_sf_id", "is", salesforceOppIDCR]
                                    ],
                                columns:
                                    [
                                        search.createColumn({
                                            name: "quantity",
                                            join: "billingTransaction",
                                            label: "Qty Invoiced"
                                        }),
                                        search.createColumn({
                                            name: "total",
                                            join: "billingTransaction",
                                            label: "Amount Invoiced"
                                        }),
                                        search.createColumn({
                                            name: "formulacurrency",
                                            formula: "ABS({billingtransaction.totalamount} - {amount})",
                                            label: "Remaining Amount"
                                        })
                                    ]
                            });

                            var searchResults = salesorderSearchObj.run().getRange({
                                start: 0,
                                end: 50
                            });
                            
                            var qtyInvoiced
                            var amountInvoiced
                            var remainingAmount
                            searchResults.forEach(function(result) {
                                qtyInvoiced = result.getValue({
                                    name: 'quantity',
                                    join: 'billingTransaction'
                                });
                                amountInvoiced = result.getValue({
                                    name: 'total',
                                    join: 'billingTransaction'
                                });
                                remainingAmount = result.getValue({
                                    name: 'formulacurrency',
                                    formula: "ABS({billingtransaction.totalamount} - {amount})"
                                });
                    
                                log.debug('Qty Invoiced', qtyInvoiced);
                                log.debug('Amount Invoiced', amountInvoiced);
                                log.debug('Remaining Amount', remainingAmount);
                            });

                            var remainingQty = soQty - qtyInvoiced
                            log.debug("remainingQty", remainingQty)
                            if(qtyInvoiced > 0 || amountInvoiced > 0){

                                if(crQty > remainingQty || crAmnt > remainingAmount){
                                    dialog.alert({
                                        title: 'Validation Error',
                                        message: 'Invoicing greater Quantity or Amount. Please verify the amount or quantity.'
                                    })
                                    return false
                                }

                                if((crQty == remainingQty && crAmnt < remainingAmount)){
                                    dialog.alert({
                                        title: 'Validation Error',
                                        message: 'Invoicing Full Quantity with less Amount. Please verify the quantity or amount.'
                                    })
                                    return false
                                }
                                
                            } else{

                                if(crQty > soQty || crAmnt> soAmnt){
                                    dialog.alert({
                                        title: 'Validation Error',
                                        message: 'Invoicing greater Quantity or Amount. Please verify the amount or quantity.'
                                    })
                                    return false
                                }

                                if((crQty == soQty && crAmnt < soAmnt)){
                                    dialog.alert({
                                        title: 'Validation Error',
                                        message: 'Invoicing Full Quantity with less Amount. Please verify the quantity or amount.'
                                    })
                                    return false
                                }
                            
                            }

                            return true;
                        }
                    }
                }
            }
            return true
        }

        return {
            pageInit: pageInit,
            saveRecord: saveRecord
        };

    });