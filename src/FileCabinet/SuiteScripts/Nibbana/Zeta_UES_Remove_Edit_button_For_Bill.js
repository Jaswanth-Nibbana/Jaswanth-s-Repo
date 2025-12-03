/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * * Version       Date            Author           Remarks
 * 2.1             13-04-2023     Ganesh Reddy
 * 2.1             05-08-2024     Jaswanth          Cancel button only for AP analysts
 */
define(['N/log', 'N/runtime', 'N/format'],

    (log, runtime, format) => {
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
            var userObj = runtime.getCurrentUser();
            var userrole = userObj.role;
            var newRecord = scriptContext.newRecord;
            
            var i_status = newRecord.getValue({ fieldId: 'approvalstatus' });
            log.debug('status', i_status)
            if ((scriptContext.type == 'view' || scriptContext.type == 'edit' || scriptContext.type == 'csvimport') && (userrole != 3 || userrole == 3)) {
                if (i_status == 2) {
                    billForm = scriptContext.form;
                    billForm.removeButton('edit');
                    log.debug('test', i_status)
                }
            }
            if(scriptContext.type == 'view' && userrole!= 1033){
                if (i_status == 1) {
                    var cancelButton = scriptContext.form.getButton('cancelbill');
                    log.debug("cancelButton", cancelButton)
                    if (cancelButton) {
                        cancelButton.isHidden = true;
                    }
                    log.debug('test', i_status)
                }
            }

            if (scriptContext.type == 'copy') {
                var today = new Date();

                var formattedDate = format.parse({
                    value: today,
                    type: format.Type.DATE
                });
                newRecord.setValue({
                    fieldId: 'custbody_zeta_bill_approvaltracking',
                    value: formattedDate
                })
            }
        }

        const beforeSubmit = (scriptContext) => {
            var newRecord = scriptContext.newRecord
            var oldRecord = scriptContext.oldRecord;
            var arrarApprovers = new Array();
            var apReviewer = newRecord.getValue({ fieldId: 'custbody_zeta_ap_reviewer' });
			var apZetaAcctMgr = newRecord.getValue({ fieldId: 'custbody_zeta_account_manager' });
			var apInvoiceApprover = newRecord.getValue({ fieldId: 'custbody34' });
			var apFpaApprover = newRecord.getValue({ fieldId: 'custbody_fpa_approver' });
			var apFinalApprover = newRecord.getValue({ fieldId: 'custbody_zeta_ap_final_check' });
            var poRequestor = newRecord.getValue({ fieldId: 'custbody_zeta_po_requestor' });
            var approvalStatus = newRecord.getValue({ fieldId: 'approvalstatus' });
            var poBasedBill = newRecord.getValue('custbody_zeta_po_number');
            var mailFollowups = new Array()
            if (scriptContext.type === scriptContext.UserEventType.EDIT){
                var lineFields = ['account', 'amount', 'class', 'custcol_cseg_department', 'department', 'custcol_cseg_cost_center']
                var reinitateApprovals = false;
                for (var i = 0; i < lineFields.length; i++) {
                    var fieldId = lineFields[i]
                    var numLines = newRecord.getLineCount({ sublistId: 'expense' });
                    for (var line = 0; line < numLines; line++) {
                        var sublistId = 'expense'
                        var newValue = newRecord.getSublistValue({
                            sublistId: sublistId,
                            fieldId: fieldId,
                            line: line
                        });
                        var oldValue = oldRecord.getSublistValue({
                            sublistId: sublistId,
                            fieldId: fieldId,
                            line: line
                        });

                        if (oldValue !== newValue) {
                            reinitateApprovals = true;
                            break;
                        }
                    }
                }

                if(reinitateApprovals){

                    if (poBasedBill != null && poBasedBill != ''){
                        arrarApprovers.push({ id: apReviewer, Flag: "true" });
                        arrarApprovers.push({ id: poRequestor, Flag: "true" });
                        arrarApprovers.push({ id: apFinalApprover, Flag: "true" });

                        newRecord.setValue({
                            fieldId: 'custbody_zeta_script_field_vba',
                            value: JSON.stringify(arrarApprovers)
                        })
                        newRecord.setValue({
                            fieldId: 'custbody_zeta_prior_approvers',
                            value: ''
                        })
                        newRecord.setValue({
                            fieldId: 'custbody_vb_next_approver',
                            value: apReviewer
                        })
                        newRecord.setValue({
                            fieldId: 'custbody_email_reminder',
                            value: false
                        })
                        newRecord.setValue({
                            fieldId: 'custbody_date_reminder',
                            value: ''
                        })
                        var today = new Date();

                        var formattedDate = format.parse({
                            value: today,
                            type: format.Type.DATE
                        });

                        newRecord.setValue({
                            fieldId: 'custbody_zeta_bill_approvaltracking',
                            value: formattedDate
                        });
                        mailFollowups.push({id:apReviewer, Followups: 0})
                        newRecord.setValue({
                            fieldId: 'custbody_zeta_email_followups',
                            value: JSON.stringify(mailFollowups)
                        })
                    }else{
                        arrarApprovers.push({ id: apReviewer, Flag: "true" });
                        arrarApprovers.push({ id: apZetaAcctMgr, Flag: "true" });
                        arrarApprovers.push({ id: apInvoiceApprover, Flag: "true" });
                        arrarApprovers.push({ id: apFpaApprover, Flag: "true" });
                        arrarApprovers.push({ id: apFinalApprover, Flag: "true" });

                        newRecord.setValue({
                            fieldId: 'custbody_zeta_script_field_vba',
                            value: JSON.stringify(arrarApprovers)
                        })
                        newRecord.setValue({
                            fieldId: 'custbody_zeta_prior_approvers',
                            value: ''
                        })
                        newRecord.setValue({
                            fieldId: 'custbody_vb_next_approver',
                            value: apReviewer
                        })

                        newRecord.setValue({
                            fieldId: 'custbody_email_reminder',
                            value: false
                        })
                        newRecord.setValue({
                            fieldId: 'custbody_date_reminder',
                            value: ''
                        })
                        var today = new Date();

                        var formattedDate = format.parse({
                            value: today,
                            type: format.Type.DATE
                        });

                        newRecord.setValue({
                            fieldId: 'custbody_zeta_bill_approvaltracking',
                            value: formattedDate
                        });

                        mailFollowups.push({id:apReviewer, Followups: 0})
                        newRecord.setValue({
                            fieldId: 'custbody_zeta_email_followups',
                            value: JSON.stringify(mailFollowups)
                        })
                    }
                }
            }
        }

        return { beforeLoad, beforeSubmit }

    });

