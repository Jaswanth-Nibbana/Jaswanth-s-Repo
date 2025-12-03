/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(['N/runtime', 'N/record', 'N/email', 'N/render', 'N/search', 'N/ui/serverWidget', 'N/file'],

    (runtime, record, email, render, search, serverWidget, file) => {

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
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

            try {
                var userObj = runtime.getCurrentUser();
                var userId = userObj.id;
                var userRole = userObj.role;
                log.debug("user ", userId);
                var rec = scriptContext.newRecord;
                var form = scriptContext.form
                form.clientScriptModulePath = '/SuiteScripts/Nibbana Consulting/zeta_cl_ra_approvalbuttons.js';

                // Create an inline HTML field
                var inlineHtml = form.addField({
                    id: 'custpage_hide_buttons',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'Inline HTML'
                });

                // JavaScript code as a string to hide both buttons
                var scriptString = `
                <script>
                    document.addEventListener('DOMContentLoaded', function() { 
                        var cancelReturnButton = document.getElementById('cancelreturn');
                        var approveReturnButton = document.getElementById('approvereturn');
                        var secCancelBtn = document.getElementById('secondarycancelreturn');
                        var secApprBtn = document.getElementById('secondaryapprovereturn');

                        if (cancelReturnButton) {
                            cancelReturnButton.style.display = 'none';
                        }
                        if (approveReturnButton) {
                            approveReturnButton.style.display = 'none';
                        }
                        if (secCancelBtn) {
                            secCancelBtn.style.display = 'none';
                        }
                        if (secApprBtn) {
                            secApprBtn.style.display = 'none';
                        }
                    });
                </script>`;

                // Set the value of the inline HTML field to your script
                inlineHtml.defaultValue = scriptString;

                var type = scriptContext.type;
                log.debug("type ", type)
                var createdFrom = rec.getValue({
                    fieldId: 'createdfrom'
                });
                log.debug("createdFrom ", createdFrom)
                if (type == 'create') {
                    if (userRole == 1048) {
                        throw 'You are not allowed to create Return Authorization directly'
                    }

                    rec.setValue({
                        fieldId: 'custbody_nsts_gaw_tran_requestor',
                        value: userId
                    })
                    rec.setValue({
                        fieldId: 'custbody_zeta_ra_approvalstage',
                        value: 1 //Not Initated
                    })
                    rec.setValue({
                        fieldId: 'custbody16',  //approval status
                        value: 1 //Pending Approval
                    })
                    rec.setValue({
                        fieldId: 'custbody_cretd_by',
                        value: userId
                    })
                    rec.setValue({
                        fieldId: 'custbody_nsts_gaw_created_by',
                        value: userId
                    })
                    rec.setValue({
                        fieldId: 'custbody_aprvd_by',
                        value: null
                    })

                    if (createdFrom) {
                        rec.setValue({
                            fieldId: 'custbody_zeta_collection_notes',
                            value: ''
                        })
                        rec.setValue({
                            fieldId: 'custbody_zeta_fuel_ar_user_notes',
                            value: ''
                        })
                        rec.setValue({
                            fieldId: 'custbody_zeta_collection_status',
                            value: ''
                        })
                        rec.setValue({
                            fieldId: 'custbody_zeta_category_escalation',
                            value: ''
                        })
                    }
                }

                if (type == 'view') {

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

                    var status = rec.getValue({
                        fieldId: 'status'
                    });
                    log.debug('status', status)
                    if (status == 'Pending Refund' || status == 'Pending Receipt') {

                        //Rename Refund button to credit
                        var refundBtn = form.getButton('refund');
                        if (refundBtn) {
                            refundBtn.label = 'Credit'
                        }
                    }

                    if (approvalStage == 2 && (userRole == 1048 || userRole == 3)) {
                        //with AR Manager
                        form.addButton({
                            id: 'custpage_approve',
                            label: 'Approve',
                            functionName: 'approve'
                        });
                        form.addButton({
                            id: 'custpage_reject',
                            label: 'Reject',
                            functionName: 'reject'
                        });
                    } else if (approvalStage == 3 && (userId == businessApprover || userRole == 3)) {
                        form.addButton({
                            id: 'custpage_approve',
                            label: 'Approve',
                            functionName: 'approve'
                        });
                        form.addButton({
                            id: 'custpage_reject',
                            label: 'Reject',
                            functionName: 'reject'
                        });
                    } else if (approvalStage == 4 && (userId == arFinalCheckApprover || userRole == 3)) {
                        form.addButton({
                            id: 'custpage_approve',
                            label: 'Approve',
                            functionName: 'approve'
                        });
                        form.addButton({
                            id: 'custpage_reject',
                            label: 'Reject',
                            functionName: 'reject'
                        });
                    }

                    var approvalStatus = rec.getValue({
                        fieldId: 'custbody16'
                    });

                    if (approvalStatus == 3 && (userRole == 1034 || userRole == 3)) {
                        form.addButton({
                            id: 'custpage_resubmit',
                            label: 'Re-Submit',
                            functionName: 'reSubmit'
                        });
                    }

                }

                if (type == 'edit') {
                    var execContext = runtime.executionContext;
                    if (userRole == 1048) {
                        if (execContext == runtime.ContextType.CSV_IMPORT || execContext == runtime.ContextType.USER_INTERFACE) {
                            throw 'You are not allowed to Edit Return Authorization directly'
                        }

                    }

                }

            } catch (e) {
                log.error('Error', e);
            }

        }


        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {

            var type = scriptContext.type;
            var rec = scriptContext.newRecord;
            var recId = rec.id;
            if (type == 'create') {

                //update record to set approval stage
                var id = record.submitFields({
                    type: record.Type.RETURN_AUTHORIZATION,
                    id: recId,
                    values: {
                        custbody_zeta_ra_approvalstage: 2 //with AR Manager
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: false
                    }
                });

                var templateId = 48;
                var fromId = 2565;
                var toId = rec.getValue({
                    fieldId: 'custbody_zeta_ar_manager'
                })
                sendEmail(fromId, toId, templateId, recId)
            }

        }

        return { beforeLoad, afterSubmit }

    });