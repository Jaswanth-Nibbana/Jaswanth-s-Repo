/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
/*
File: memo_supplyid_jounal.js
Author: Jaswanth Vardireddy <jvardireddy@nibbanaconsulting.com>
Client: Zeta Global
Purpose: Handling the approval mechanism on employee records
Copyright (c) 2024 Nibbana Consulting Private Limited
All rights reserved. No part of this code may be copied or used without express, written permission from Nibbana.
*/
define(['N/record', 'N/search', 'N/runtime', 'N/log'], function (record, search, runtime, log) {

    var SEARCH_ID = 'customsearch_update_amorj_memosupplid';

    function getInputData() {

        return search.load({
            type: search.Type.JOURNAL_ENTRY,
            id: SEARCH_ID,
        });
    }

    function reduce(context) {

        log.debug('context', context);
        log.debug('context values', context.values);

        var inpObj = JSON.parse(context.values[0]);
        var journalId = inpObj.values["GROUP(internalid)"].value;
        log.debug('journalId', journalId)
        try {
            var recLoad = record.load({
                type: 'journalentry',
                id: journalId,
                isDynamic: true
            });
            var intLineCount = recLoad.getLineCount({
                sublistId: 'line'
            });
            for (var ii = 0; ii < intLineCount; ii++) {
                var scheduleNum = recLoad.getSublistValue({
                    sublistId: 'line',
                    fieldId: 'schedulenum',
                    line: ii
                });
                if (scheduleNum) {
                    var recLoadrevRecSchedule = record.load({
                        type: 'revRecSchedule',
                        id: scheduleNum
                    });

                    var createdFromRecID = recLoadrevRecSchedule.getValue({
                        fieldId: 'sourcetran'
                    });

                    var schNum = recLoadrevRecSchedule.getValue({
                        fieldId: 'schedulenumber'
                    });

                    var accntBook = recLoadrevRecSchedule.getValue({
                        fieldId: 'accountingbook'
                    });
                    var amortSch, memo, supplyId, custName;

                    if (accntBook == '1'|| accntBook == 1) {
                    
                        var amortizationSearchObj = search.create({
                            type: "transaction",
                            filters: [
                                ["type", "anyof", "VendBill", "VendCred", "Journal"],
                                "AND",
                                ["internalid", "anyof", createdFromRecID],
                                "AND",
                                ["amortizationschedule.name", "is", schNum]
                            ],
                            columns: [
                                search.createColumn({
                                    name: "transactionnumber",
                                    label: "Transaction Number"
                                }),
                                search.createColumn({
                                    name: "schedulenumber",
                                    join: "amortizationSchedule",
                                    label: "Number"
                                }),

                                search.createColumn({
                                    name: "memo",
                                    label: "Memo"
                                }),
                                search.createColumn({ name: "custcol_data_center", label: "Suppl ID" }),
                                search.createColumn({ name: "custcol3", label: "Customer" })
                            ]
                        });

                        var searchResultCount = amortizationSearchObj.runPaged().count;

                        amortizationSearchObj.run().each(function (result) {
                            amortSch = result.getValue({
                                name: "schedulenumber",
                                join: "amortizationSchedule",
                                label: "Number"
                            });

                            memo = result.getValue({
                                name: "memo"
                            });

                            supplyId = result.getValue({
                                name: "custcol_data_center"
                            });

                            custName = result.getValue({
                                name: "custcol3"
                            });
                        });

                        log.audit("Amor Match", schNum + "___" + amortSch);

                        if (schNum == amortSch) {
                            recLoad.selectLine(
                                { sublistId: 'line', line: ii });
                            recLoad.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'memo',
                                value: memo
                            });
                            recLoad.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'custcol_data_center',
                                value: supplyId
                            });
                            recLoad.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'custcol_zeta_client_name',
                                value: custName
                            });

                            recLoad.commitLine({
                                sublistId: 'line'
                            });
                        }
                    } else if (accntBook == '2' || accntBook == 2) {

                        var secBookSearch = search.create({
                            type: "accountingtransaction",
                            settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                            filters:
                                [
                                    ["amortizationschedule.schedulenumbertext", "is", schNum]
                                ],
                            columns:
                                [
                                    search.createColumn({ name: "accountingbook", label: "Accounting Book" }),
                                    search.createColumn({ name: "account", label: "Account" }),
                                    search.createColumn({ name: "amount", label: "Amount" }),
                                    search.createColumn({
                                        name: "internalid",
                                        join: "transaction",
                                        label: "Internal ID"
                                    }),
                                    search.createColumn({
                                        name: "type",
                                        join: "transaction",
                                        label: "Type"
                                    }),
                                    search.createColumn({
                                        name: "line",
                                        join: "transaction",
                                        label: "Line ID"
                                    }),
                                    search.createColumn({
                                        name: "memo",
                                        join: "transaction",
                                        label: "Memo"
                                    }),
                                    search.createColumn({
                                        name: "custcol_data_center",
                                        join: "transaction",
                                        label: "Suppl ID"
                                    }),
                                    search.createColumn({
                                        name: "custcol3",
                                        join: "transaction",
                                        label: "Customer"
                                    })
                                ]
                        });

                        secBookSearch.run().each(function (result) {
                            memo = result.getValue({
                                name: "memo",
                                join: "transaction",
                                label: "Memo"
                            });

                            supplyId = result.getValue({
                                name: "custcol_data_center",
                                join: "transaction",
                                label: "Suppl ID"
                            });

                            custName = result.getValue({
                                name: "custcol3",
                                join: "transaction",
                                label: "Customer"
                            });
                        });

                        recLoad.selectLine({ sublistId: 'line', line: ii });
                        recLoad.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'memo',
                            value: memo
                        });
                        recLoad.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'custcol_data_center',
                            value: supplyId
                        });
                        recLoad.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'custcol_zeta_client_name',
                            value: custName
                        });

                        recLoad.commitLine({
                            sublistId: 'line'
                        });
                    }

                }
            }

            var recordId = recLoad.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });

            log.debug(" Updated JE  recordId", recordId);


        } catch (e) {
            log.error('Error', e);
        }
    }

    function summarize(summary) {
        log.debug('completed');
    }



    // Expose functions
    return {
        getInputData: getInputData,
        reduce: reduce,
        summarize: summarize
    };
});