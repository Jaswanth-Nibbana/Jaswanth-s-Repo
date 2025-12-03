/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/runtime', 'N/file', 'N/ui/message'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search, runtime, file, message) => {

        const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB in bytes
        const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB in bytes

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
            log.debug("context type ", scriptContext.type)
            var userObj = runtime.getCurrentUser();
            var userRole = userObj.role;
            var form = scriptContext.form
            var newRecord = scriptContext.newRecord;
            var execContext = runtime.executionContext;

            if (userRole == 1041) {
                var returnButton = form.getButton({ id: 'return' });
                if (returnButton) {
                    returnButton.isHidden = true;
                }

                if(scriptContext.type == 'copy' || scriptContext.type == 'create' || (scriptContext.type == 'edit' && (execContext == runtime.ContextType.USER_INTERFACE || execContext == runtime.ContextType.CSV_IMPORT))) {
                    throw 'Access Denied for bill creation.';
                }
            }

            if(userRole == 1051 || userRole == 1035 || userRole == 1039){
                if(scriptContext.type == 'copy' || scriptContext.type == 'create' || (scriptContext.type == 'edit' && (execContext == runtime.ContextType.USER_INTERFACE || execContext == runtime.ContextType.CSV_IMPORT))) {
                    throw 'Access Denied for bill creation.';
                }
            }

            if (scriptContext.type == 'copy'){
                newRecord.setValue({fieldId: 'custbody_zeta_vb_file__check', value: false});
                newRecord.setValue({fieldId: 'custbody_date_reminder', value: null});
                newRecord.setValue({fieldId: 'custbody_zeta_email_followups', value: ''});
                newRecord.setValue({fieldId: 'custbody_email_reminder', value: false});
            }

            if(scriptContext.type == scriptContext.UserEventType.VIEW) {
                const showMessage = newRecord.getValue({ fieldId: 'custbody_zeta_vb_file__check' });
                if (showMessage) {
                    form.addPageInitMessage({
                        type: message.Type.INFORMATION,
                        title: 'Attachment Size Limit',
                        message: 'The total attachment size exceeds 10MB. So, the attachments are not included in the mail.'
                    });
                }
            }

            
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

            var currentRecord = scriptContext.newRecord;
            var requestor = currentRecord.getValue({
                fieldId: 'custbody_nsts_gaw_tran_requestor'
            })
            var apReviewer = currentRecord.getValue({
                fieldId: 'custbody_zeta_ap_reviewer'
            })
            var zetaAccountManager = currentRecord.getValue({
                fieldId: 'custbody_zeta_account_manager'
            })
            var invoiceApprover = currentRecord.getValue({
                fieldId: 'custbody34'
            })
            var fpaApprover = currentRecord.getValue({
                fieldId: 'custbody_fpa_approver'
            })
            var apFinalCheck = currentRecord.getValue({
                fieldId: 'custbody_zeta_ap_final_check'
            })

            if ((requestor) && (apReviewer === requestor || zetaAccountManager === requestor || invoiceApprover === requestor ||
                fpaApprover === requestor || apFinalCheck === requestor)) {
                throw 'One or more Approver fields have the same value as the Requestor. Please update the values.'
            }
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

        const afterSubmit = (scriptContext) => {
            if (
                scriptContext.type !== scriptContext.UserEventType.CREATE &&
                scriptContext.type !== scriptContext.UserEventType.EDIT&&
                scriptContext.type !== scriptContext.UserEventType.COPY
            ) {
                return;
            }
        
            var newRecord = scriptContext.newRecord;
            var id = newRecord.id;
        
            let totalSize = 0;
            let includeAttachments = true;
        
            // Search for all associated files on the transaction
            var tranSearchObj = search.create({
                type: "transaction",
                filters: [["internalid", "anyof", id]], // Match transaction ID
                columns: [
                    search.createColumn({
                        name: "internalid",
                        join: "file" // File internal ID
                    }),
                    search.createColumn({
                        name: "documentsize",
                        join: "file" // File size in KB
                    })
                ]
            });
        
            tranSearchObj.run().each(function (result) {
                const fileId = result.getValue({ name: "internalid", join: "file" });
                const fileSizeKB = result.getValue({ name: "documentsize", join: "file" });
        
                if (fileId) {
                    const fileSize = fileSizeKB * 1024; // Convert KB to bytes
                    totalSize += fileSize;
        
                    log.debug("File Info", `Size: ${fileSize} bytes`);
        
                    // Check individual file size
                    if (fileSize > MAX_ATTACHMENT_SIZE) {
                        includeAttachments = false;
                        log.debug(
                            "Attachment Skipped",
                            `Attachment exceeds 10MB.`
                        );
                        return false; // Exit the search iteration early
                    }
        
                    // Check total file size
                    if (totalSize > MAX_TOTAL_SIZE) {
                        includeAttachments = false;
                        log.debug(
                            "Attachment Skipped",
                            "Total attachment size exceeds 10MB."
                        );
                        return false; // Exit the search iteration early
                    }
                }
        
                return true;
            });
            
        
            if (!includeAttachments) {
                // Mark the record with a custom field
                record.submitFields({
                    type: "vendorbill",
                    id: id,
                    values: {
                        custbody_zeta_vb_file__check: true
                    }
                });
            }
        };
        
        return { beforeLoad, beforeSubmit, afterSubmit }

    });