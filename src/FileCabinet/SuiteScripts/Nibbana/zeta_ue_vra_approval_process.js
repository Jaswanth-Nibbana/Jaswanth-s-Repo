/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/email', 'N/record', 'N/runtime', 'N/search', 'N/file', 'N/ui/serverWidget', 'N/render'],
    /**
 * @param{email} email
 * @param{record} record
 */
    (email, record, runtime, search, file, serverWidget, render) => {

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

            var type = scriptContext.type;
            var newRecord = scriptContext.newRecord;
            var form = scriptContext.form
            var userObj = runtime.getCurrentUser();
            var userId = userObj.id;
            var userRole = userObj.role;
            form.clientScriptModulePath = '/SuiteScripts/zeta_cl_vra_approvalbuttons.js';
            var execContext = runtime.executionContext;
            var currentDate = new Date();
            var createdFrom = newRecord.getValue({
                fieldId: 'createdfrom'
            });
            var approvalStatus = newRecord.getValue({
                fieldId: 'custbody16'
            });

            var status = newRecord.getValue({
                fieldId: 'status'
            });

            if (type == 'create') {
                if (userRole == 1041) {
                    throw 'You are not allowed to create Vendor Return Authorization directly'
                }

                newRecord.setValue('custbody_zeta_ap_final_check', '')
                newRecord.setValue('custbody16', 1)
                newRecord.setValue('custbody_cretd_by', userId)
                newRecord.setValue('custbody_esc_created_date', currentDate)

            }

            if (type == 'edit') {
                // neeed to restrict user for making any changes once credit is applied to vendor returns
                // need to restrict AP manager not to make any changes
                if (execContext == runtime.ContextType.CSV_IMPORT || execContext == runtime.ContextType.USER_INTERFACE) {
                    if (userRole == 1041) {
                        throw 'You are not allowed to Edit Vendor Return Authorization directly'
                    }

                    if (status == "Credited" || status == "Pending Credit") {
                        throw 'You are not allowed to edit the Vendor Return Authorization once the credit is applied or after it has been approved.'
                    }
                }

            }

            if (type == 'view') {

                if (approvalStatus == 1 && (userRole == 1041 || userRole == 3)) {
                    //with AP Manager
                    form.addButton({
                        id: 'custpage_approve',
                        label: 'Approve',
                        functionName: 'approvewithnotes'
                    });
                    form.addButton({
                        id: 'custpage_reject',
                        label: 'Reject',
                        functionName: 'reject'
                    });
                }

                if (approvalStatus == 3 && (userRole == 1033 || userRole == 3)) {
                    form.addButton({
                        id: 'custpage_resubmit',
                        label: 'Re-Submit',
                        functionName: 'reSubmit'
                    });
                }

                if (userRole == 1041) {
                    var refundButton = form.getButton({ id: 'refund' });
                    if (refundButton) {
                        refundButton.isHidden = true;
                    }
                    var closeButton = form.getButton({ id: 'closeremaining' });
                    if (closeButton) {
                        closeButton.isHidden = true;
                    }
                    var editButton = form.getButton({ id: 'edit' });
                    if (editButton) {
                        editButton.isHidden = true;
                    }
                }

                if (approvalStatus == 3) {
                    newRecord.setText('status', 'Rejected')
                }

                if (status == "Credited" || status == "Pending Credit") {
                    var editButton = form.getButton({ id: 'edit' });
                    if (editButton) {
                        editButton.isHidden = true;
                    }
                }
            }

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
            inlineHtml.defaultValue = scriptString;

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            var type = scriptContext.type;
            var newRecord = scriptContext.newRecord;
            var userObj = runtime.getCurrentUser();

            var apFinalCheck = newRecord.getValue({
                fieldId: 'custbody_zeta_ap_final_check'
            })
            if (apFinalCheck) {
                var isApmanager = search.create({
                    type: "employee",
                    filters:
                        [
                            ["internalid", "anyof", apFinalCheck]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "role", label: "Role" })
                        ]
                });
                var resultSet = isApmanager.run();
                var results = resultSet.getRange({ start: 0, end: 20 });

                var rolesArray = [];
                if (results.length > 0) {
                    results.forEach(function (result) {
                        var role = result.getValue({ name: 'role' });
                        rolesArray.push(role);
                    });
                }
                apManagerRole = "1041";
                if (!rolesArray.includes(apManagerRole)) {
                    throw 'Only AP Manager is allowed in AP Final Check. Please update the value.'
                }
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
            try {
                var type = scriptContext.type;
                var newRecord = scriptContext.newRecord;
                var recId = newRecord.id;
                var apManager = newRecord.getValue('custbody_zeta_ap_final_check')
                var userObj = runtime.getCurrentUser();
                var userId = userObj.id;
                var approvalStatus = newRecord.getValue({
                    fieldId: 'custbody16'
                });
                var status = newRecord.getValue({
                    fieldId: 'status'
                });

                var fromId = userId;
                var toId = apManager

                if (type == 'create') {
                    //send mail
                    var templateId = 152
                    sendEmail(fromId, toId, templateId, recId)
                }

            } catch (e) {
                log.error('Error', e);
            }

        }

        return { beforeLoad, beforeSubmit, afterSubmit }

    });
