/*
File: zeta_mr_bill_approval_remainder.js
Author: Jaswanth Vardireddy <jvardireddy@nibbanaconsulting.com>
Client: Zeta Global
Purpose: To send reminders for vendor bill approvals
Copyright (c) 2025 Nibbana Consulting Private Limited
All rights reserved. No part of this code may be copied or used without express, written permission from Nibbana.
*/
/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/email', 'N/file', 'N/format', 'N/record', 'N/search', 'N/render'],
    /**
 * @param{email} email
 * @param{file} file
 * @param{format} format
 * @param{record} record
 * @param{search} search
 */
    (email, file, format, record, search, render) => {

        function isEmpty(val) {
            return (typeof (val) != "undefined" && val != null && val.toString() != '') ? val : '';
        }

        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        const getInputData = (inputContext) => {
            var vendorBillSearchObj = search.create({
                type: 'vendorbill',
                filters: [
                    ["mainline", "is", "T"],
                    "AND",
                    ["type", "anyof", "VendBill"],
                    "AND",
                    ["status", "anyof", "VendBill:D"],
                    "AND",
                    ["datecreated", "onorafter", "01/01/2023 12:00 am"]

                ],
                columns: [
                    search.createColumn({ name: 'internalid' }),
                    search.createColumn({ name: 'custbody_email_reminder' }),
                    search.createColumn({ name: 'custbody_date_reminder' }),
                    search.createColumn({ name: 'custbody_zeta_email_followups' }),
                    search.createColumn({ name: 'custbody_zeta_bill_approvaltracking' }),
                    search.createColumn({ name: 'custbody_zeta_ap_reviewer' }),
                    search.createColumn({ name: 'custbody_zeta_account_manager' }),
                    search.createColumn({ name: 'custbody34' }),
                    search.createColumn({ name: 'custbody_fpa_approver' }),
                    search.createColumn({ name: 'custbody_zeta_ap_final_check' }),
                    search.createColumn({ name: 'custbody_zeta_script_field_vba' }),
                    search.createColumn({ name: 'custbody_zeta_vb_approval_sender' }),
                    search.createColumn({ name: 'custbody_vb_next_approver' })
                ]
            });
            

            var start = 0;
            var pageSize = 1000;
            var billsToProcess = [];

            do {
                var searchResults = vendorBillSearchObj.run().getRange({
                    start: start,
                    end: start + pageSize
                });

                for (var i = 0; i < searchResults.length; i++) {
                    var billData = {};

                    // Loop through each column and store the value in the billData object
                    searchResults[i].columns.forEach(function (column) {
                        var columnName = column.name;
                        var columnValue = searchResults[i].getValue(column);
                        billData[columnName] = columnValue;
                    });

                    // Push the bill data (with all columns) into the array
                    if (billData.internalid) {
                        billsToProcess.push(billData);
                    }
                }

                // Increment the start index for the next batch
                start += pageSize;

            } while (searchResults.length === pageSize);

            log.debug("Bills to Process:", billsToProcess);

            return billsToProcess;
        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

        const map = (mapContext) => {
            var recordData = JSON.parse(mapContext.value);
            var recordId = recordData.internalid;
            log.debug('Record ID', recordId);
            var reminderDate = recordData.custbody_date_reminder;
            var emailFollowupsStr = recordData.custbody_zeta_email_followups;
            var approvalTracking = recordData.custbody_zeta_bill_approvaltracking;
            var approver = recordData.custbody_vb_next_approver;
            var vbApprovalSender = recordData.custbody_zeta_vb_approval_sender;
            var emailReminder = recordData.custbody_email_reminder;
            var remainderNo = '';
            var attachments = [];
            var subject = '';
            var body = '';
            var now = new Date();
            var nowTime = now.getTime();

            try {
                if (recordId) {
                    try {
                        var attachmentsSearch = search.create({
                            type: 'vendorbill',
                            filters: [
                                ['internalid', 'anyof', recordId],
                                'AND',
                                ['mainline', 'is', 'T']
                            ],
                            columns: [
                                search.createColumn({ name: 'internalid', join: 'file' }),
                                search.createColumn({ name: 'filetype', join: 'file' })
                            ]
                        });

                        var searchResult = attachmentsSearch.run().getRange({
                            start: 0,
                            end: 1000  // Fetch first 1000 results, adjust as needed
                        });

                        if (searchResult.length > 0) {
                            for (var i = 0; i < searchResult.length; i++) {
                                var result = searchResult[i];
                                var fileId = result.getValue({ name: 'internalid', join: 'file' });
                                var fileObj = file.load({ id: fileId });
                                attachments.push(fileObj);
                            }
                        }

                        attachments.push(render.transaction({ entityId: parseInt(recordId, 10), printMode: render.PrintMode.PDF }));
                    } catch (e) {
                        log.error('Attachment error', e);
                    }

                    var totalSize = attachments.reduce(function (sum, f) {
                        return sum + (f.size || 0) / (1024 * 1024);
                    }, 0);

                    log.debug('Total Size of Attachments', totalSize);
                    var merger = render.mergeEmail({
                        templateId: 23,
                        transactionId: parseInt(recordId, 10)
                    });

                    var followups = emailFollowupsStr ? JSON.parse(emailFollowupsStr) : [];
                    if (followups.length > 0) {
                        followups[0].Followups = (followups[0].Followups || 0) + 1;
                        var count = followups[0].Followups;
                        remainderNo = (count === 1 ? '1st' : count === 2 ? '2nd' : count === 3 ? '3rd' : count + 'th') + ' Followup';
                    }

                    var fieldsToUpdate = {
                        custbody_email_reminder: true,
                        custbody_date_reminder: format.format({ value: new Date(), type: format.Type.DATE }),
                        custbody_zeta_email_followups: JSON.stringify(followups),
                        custbody_zeta_bill_approvaltracking: format.format({ value: new Date(), type: format.Type.DATE }),
                    };

                    if (!emailReminder) {

                        if (approvalTracking) {
                            var lastMailSentOn = new Date(approvalTracking).getTime() + (48 * 60 * 60 * 1000); // 48 hours
                            if (lastMailSentOn < nowTime) {
                                subject = 'Approval Reminder ' + remainderNo + " for " + merger.subject;
                                body = merger.body;
                                emailBody = body.replace('{VB}', isEmpty(approver));

                                var billRec = record.load({
                                    type: record.Type.VENDOR_BILL,
                                    id: recordId,
                                    isDynamic: true
                                });
                                var currentApprover = billRec.getValue({ fieldId: 'custbody_vb_next_approver' });

                                if (currentApprover == approver) {
                                    email.send({
                                        author: vbApprovalSender,
                                        recipients: approver,
                                        subject: subject,
                                        body: emailBody,
                                        relatedRecords: { transactionId: recordId },
                                        attachments: totalSize <= 13 ? attachments : null
                                    });
                                    log.debug('Email Sent', 'Email sent to ' + approver + ' for record ID: ' + recordId);

                                    record.submitFields({ type: record.Type.VENDOR_BILL, id: recordId, values: fieldsToUpdate });
                                }
                            }

                        } else {
                            var latestEmail = search.create({
                                type: "vendorbill",
                                settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                                filters:
                                    [
                                        ["type", "anyof", "VendBill"],
                                        "AND",
                                        ["internalid", "anyof", recordId],
                                        "AND",
                                        ["mainline", "is", "T"]
                                    ],
                                columns:
                                    [
                                        search.createColumn({
                                            name: "messagedate",
                                            join: "messages",
                                            label: "Date",
                                            sort: search.Sort.DESC
                                        }),
                                        search.createColumn({
                                            name: "recipient",
                                            join: "messages",
                                            label: "Primary Recipient"
                                        })
                                    ]
                            });

                            var resultSet = latestEmail.run();
                            var firstResult = resultSet.getRange({ start: 0, end: 1 })[0];

                            if (firstResult) {
                                var messageDate = firstResult.getValue({
                                    name: "messagedate",
                                    join: "messages"
                                });
                                var recipients = firstResult.getValue({
                                    name: "recipient",
                                    join: "messages"
                                });

                                log.debug("Latest Message Date", messageDate);
                                log.debug("Recipients of Latest Message", recipients);

                                var lastMailSentOn = new Date(messageDate).getTime() + (48 * 60 * 60 * 1000); // 48 hours

                                if (lastMailSentOn < nowTime) {
                                    subject = 'Approval Reminder ' + remainderNo + " for " + merger.subject;
                                    body = merger.body;
                                    emailBody = body.replace('{VB}', isEmpty(approver));

                                    var billRec = record.load({
                                        type: record.Type.VENDOR_BILL,
                                        id: recordId,
                                        isDynamic: true
                                    });
                                    var currentApprover = billRec.getValue({ fieldId: 'custbody_vb_next_approver' });

                                    if (currentApprover == approver) {
                                        email.send({
                                            author: vbApprovalSender,
                                            recipients: approver,
                                            subject: subject,
                                            body: emailBody,
                                            relatedRecords: { transactionId: recordId },
                                            attachments: totalSize <= 13 ? attachments : null
                                        });
                                        log.debug('Email Sent', 'Email sent to ' + approver + ' for record ID: ' + recordId);
                                        record.submitFields({ type: record.Type.VENDOR_BILL, id: recordId, values: fieldsToUpdate });
                                    }
                                }
                            }
                        }

                    } else {
                        if (reminderDate && approvalTracking) {
                            var lastMailSentOn = new Date(approvalTracking).getTime() + (48 * 60 * 60 * 1000); // 48 hours

                            if (lastMailSentOn < nowTime) {
                                subject = 'Approval Reminder ' + remainderNo + " for " + merger.subject;
                                body = merger.body;
                                emailBody = body.replace('{VB}', isEmpty(approver));

                                var billRec = record.load({
                                    type: record.Type.VENDOR_BILL,
                                    id: recordId,
                                    isDynamic: true
                                });
                                var currentApprover = billRec.getValue({ fieldId: 'custbody_vb_next_approver' });

                                if (currentApprover == approver) {
                                    email.send({
                                        author: vbApprovalSender,
                                        recipients: approver,
                                        subject: subject,
                                        body: emailBody,
                                        relatedRecords: { transactionId: recordId },
                                        attachments: totalSize <= 13 ? attachments : null
                                    });
                                    log.debug('Email Sent', 'Email sent to ' + approver + ' for record ID: ' + recordId);
                                    record.submitFields({ type: record.Type.VENDOR_BILL, id: recordId, values: fieldsToUpdate });
                                }
                            }

                        } else if (reminderDate && !approvalTracking) {
                            var lastMailSentOn = new Date(reminderDate).getTime() + (48 * 60 * 60 * 1000); // 48 hours

                            if (lastMailSentOn < nowTime) {
                                subject = 'Approval Reminder ' + remainderNo + " for " + merger.subject;
                                body = merger.body;
                                emailBody = body.replace('{VB}', isEmpty(approver));

                                var billRec = record.load({
                                    type: record.Type.VENDOR_BILL,
                                    id: recordId,
                                    isDynamic: true
                                });
                                var currentApprover = billRec.getValue({ fieldId: 'custbody_vb_next_approver' });

                                if (currentApprover == approver) {
                                    email.send({
                                        author: vbApprovalSender,
                                        recipients: approver,
                                        subject: subject,
                                        body: emailBody,
                                        relatedRecords: { transactionId: recordId },
                                        attachments: totalSize <= 13 ? attachments : null
                                    });
                                    log.debug('Email Sent', 'Email sent to ' + approver + ' for record ID: ' + recordId);
                                    record.submitFields({ type: record.Type.VENDOR_BILL, id: recordId, values: fieldsToUpdate });
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                log.error('Error in Map', e);
            }
        }

        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        const reduce = (reduceContext) => {

        }


        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summaryContext) => {

        }

        return { getInputData, map, reduce, summarize }

    });
