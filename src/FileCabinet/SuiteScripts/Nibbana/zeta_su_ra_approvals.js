/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/runtime', 'N/record', 'N/email', 'N/render', 'N/ui/serverWidget', 'N/file', 'N/search'],

    (runtime, record, email, render, serverWidget, file, search) => {

        function fetchAttachmentDetails(recId) {
            var attachments = []
            var tranSearchObj = search.create({
                type: "transaction",
                filters:
                    [
                        ["internalid", "anyof", recId],
                        "AND",
                        ["mainline", "is", "T"]
                    ],
                columns:
                    [
                        /*"entityid", */
                        search.createColumn({
                            name: "internalid",
                            join: "file"
                        })
                    ]
            });
            tranSearchObj.run().each(function (result) {

                var attachmentId = result.getValue(search.createColumn({
                    name: "internalid",
                    join: "file"
                }))
                if (attachmentId)
                    attachments.push(file.load({ id: attachmentId }))

                return true;
            });


            return attachments

        }

        function sendEmail(fromId, toId, templateId, recId) {

            var mergeResult = render.mergeEmail({
                templateId: Number(templateId),
                transactionId: Number(recId),
            });

            log.debug('mergeResult', mergeResult);

            var attachments = fetchAttachmentDetails(recId);
            email.send({
                author: fromId,
                recipients: toId,
                subject: mergeResult.subject,
                body: mergeResult.body,
                attachments: attachments,
                relatedRecords: {
                    transactionId: Number(recId)
                }
            });

            log.debug('Email Sent')
        }


        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {

            if (scriptContext.request.method === 'GET') {

                var recId = scriptContext.request.parameters.recid;
                var action = scriptContext.request.parameters.action;

                log.debug('recId', recId + ' : ' + action);
                var userObj = runtime.getCurrentUser();
                var userId = userObj.id;

                if (action == 'approve') {

                    var rec = record.load({
                        type: 'returnauthorization',
                        id: recId
                    })
                    var approvalStage = rec.getValue({
                        fieldId: 'custbody_zeta_ra_approvalstage'
                    });
                    var arManager = rec.getValue({
                        fieldId: 'custbody_zeta_ar_manager'
                    });
                    var businessApprover = rec.getValue({
                        fieldId: 'custbody_zeta_business_cm_app'
                    });
                    var arFinalCheckApprover = rec.getValue({
                        fieldId: 'custbody_zeta_final_check_approver'
                    });

                    if (approvalStage == 2) {

                        var exception = rec.getValue({
                            fieldId: 'custbody_zeta_knock_off_entry'
                        });
                        if (exception) {
                            var id = record.submitFields({
                                type: record.Type.RETURN_AUTHORIZATION,
                                id: recId,
                                values: {
                                    custbody_zeta_ra_approvalstage: 5, //Approved
                                    custbody16: 2,
                                    orderstatus: 'B',
                                    custbody_aprvd_by: userId,
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: false
                                }
                            });

                            var requestor = rec.getValue({
                                fieldId: 'custbody_nsts_gaw_tran_requestor'
                            });

                            var templateId = 49;
                            var fromId = 2565;

                            sendEmail(fromId, requestor, templateId, recId)

                        } else {
                            var id = record.submitFields({
                                type: record.Type.RETURN_AUTHORIZATION,
                                id: recId,
                                values: {
                                    custbody_zeta_ra_approvalstage: 3 //with Business Approver
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: false
                                }
                            });

                            var templateId = 48;
                            var fromId = 2565;

                            sendEmail(fromId, businessApprover, templateId, recId)
                        }

                    }

                    if (approvalStage == 3) {
                        var id = record.submitFields({
                            type: record.Type.RETURN_AUTHORIZATION,
                            id: recId,
                            values: {
                                custbody_zeta_ra_approvalstage: 4 //with AR Final Check Approver
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: false
                            }
                        });

                        var templateId = 48;
                        var fromId = 2565;

                        sendEmail(fromId, arFinalCheckApprover, templateId, recId)
                    }

                    if (approvalStage == 4) {
                        var id = record.submitFields({
                            type: record.Type.RETURN_AUTHORIZATION,
                            id: recId,
                            values: {
                                custbody_zeta_ra_approvalstage: 5, //Approved
                                custbody16: 2,
                                orderstatus: 'B',
                                custbody_aprvd_by: userId
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: false
                            }
                        });

                        var requestor = rec.getValue({
                            fieldId: 'custbody_nsts_gaw_tran_requestor'
                        });

                        var templateId = 49;
                        var fromId = 2565;

                        sendEmail(fromId, requestor, templateId, recId)
                    }

                }
                if (action == 'reSubmit') {

                    var rec = record.load({
                        type: 'returnauthorization',
                        id: recId
                    })
                    record.submitFields({
                        type: record.Type.RETURN_AUTHORIZATION,
                        id: recId,
                        values: {
                            custbody_zeta_ra_approvalstage: 2,
                            custbody16: 1,
                            orderstatus: 'A'
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: false
                        }
                    });

                    var templateId = 51;
                    var fromId = 2565;
                    var toId = rec.getValue({
                        fieldId: 'custbody_zeta_ar_manager'
                    })
                    sendEmail(fromId, toId, templateId, recId)


                }
                if (action == 'reject') {

                    var form = serverWidget.createForm({
                        title: 'Capture Rejection Reason'
                    });

                    // Add a hidden field to store the record ID
                    var recordIdField = form.addField({
                        id: 'custpage_recordid',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Record ID'
                    });
                    recordIdField.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });
                    recordIdField.defaultValue = recId

                    // Add a field to capture the rejection reason
                    form.addField({
                        id: 'custpage_rejectionreason',
                        type: serverWidget.FieldType.TEXTAREA,
                        label: 'Rejection Reason'
                    });

                    // Add a submit button
                    form.addSubmitButton({
                        label: 'Submit'
                    });

                    scriptContext.response.writePage(form);

                }

            } else {

                var recordId = scriptContext.request.parameters.custpage_recordid;
                var rejectionReason = scriptContext.request.parameters.custpage_rejectionreason;

                // Update the record with the rejection status
                if (recordId && rejectionReason) {
                    var rec = record.load({
                        type: 'returnauthorization',
                        id: recordId
                    });

                    //to do set the approval stage to who rejected
                    var approvalStage = rec.getValue({
                        fieldId: 'custbody_zeta_ra_approvalstage'
                    });
                    if (approvalStage == 2) {

                        rec.setValue({
                            fieldId: 'custbody_zeta_ra_approvalstage',
                            value: 6
                        });
                        
                    } else if (approvalStage == 3) {

                        rec.setValue({
                            fieldId: 'custbody_zeta_ra_approvalstage',
                            value: 7
                        });
                        
                    } else if (approvalStage == 4) {

                        rec.setValue({
                            fieldId: 'custbody_zeta_ra_approvalstage',
                            value: 8
                        });
                        
                    }

                    rec.setValue({
                        fieldId: 'custbody16',
                        value: '3'
                    });


                    rec.setValue({
                        fieldId: 'custbody_nsts_gaw_rejection_reason',
                        value: rejectionReason
                    });

                    rec.save();

                    var requestor = rec.getValue({
                        fieldId: 'custbody_nsts_gaw_tran_requestor'
                    });

                    var templateId = 50;
                    var fromId = 2565;

                    sendEmail(fromId, requestor, templateId, recordId)
                    //scriptContext.response.write('<html><body><script type="text/javascript">window.onunload = function(e){window.opener.cancel_approve_order(' + recordId + ',"ra","cancel");}; window.close();</script></body></html>');
                    scriptContext.response.write('<html><body><script type="text/javascript">window.onunload = function(e) { window.opener.cancel_approve_order(' + recordId + ', "ra", "cancel"); }; window.close(); </script></body></html>');
                }
            }

        }

        return { onRequest }

    });