/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Aug 2018     Monica.Nukala
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function userEventBeforeLoad(type, form, request) {
    nlapiLogExecution('DEBUG', 'context type ', type);
    try {
        if (type == 'view') {

            form.setScript('customscript_zeta_cs_app_rej_bill'); // sets the script on the client side
            var status = nlapiGetFieldValue('approvalstatus');
            nlapiLogExecution('DEBUG', 'status Is: ', status);
            var billStatus = nlapiGetFieldValue('status');
            nlapiLogExecution('DEBUG', 'Bill status Is: ', billStatus);
            var role = nlapiGetRole();
            nlapiLogExecution('DEBUG', 'role Is: ', role);
            var user = nlapiGetUser();
            nlapiLogExecution('DEBUG', 'user Is: ', user);
            var apReviewer = nlapiGetFieldValue('custbody_zeta_ap_reviewer');
            nlapiLogExecution('DEBUG', 'apReviewer Is: ', apReviewer);
            var zetaAccountManager = nlapiGetFieldValue('custbody_zeta_account_manager');
            nlapiLogExecution('DEBUG', 'zetaAccountManager Is: ', zetaAccountManager);
            var invoiceApprover = nlapiGetFieldValue('custbody34');
            nlapiLogExecution('DEBUG', 'invoiceApprover Is: ', invoiceApprover);
            var fpaApprover = nlapiGetFieldValue('custbody_fpa_approver');
            nlapiLogExecution('DEBUG', 'fpaApprover Is: ', fpaApprover);
            var apFinalApprover = nlapiGetFieldValue('custbody_zeta_ap_final_check');
            nlapiLogExecution('DEBUG', 'apFinalApprover Is: ', apFinalApprover);
            var requestor = nlapiGetFieldValue('custbody_nsts_gaw_tran_requestor');
            nlapiLogExecution('DEBUG', 'requestor Is: ', requestor);
            var tranId = nlapiGetFieldValue('tranid');
            nlapiLogExecution('DEBUG', 'tranId Is: ', tranId);
            var billNextApprover = nlapiGetFieldValue('custbody_vb_next_approver');
            nlapiLogExecution('DEBUG', 'billNextApprover Is: ', billNextApprover);
            var approversList = nlapiGetFieldValue('custbody_zeta_script_field_vba');
            approversList = JSON.parse(approversList);
            var allowManager = false;
            if (JSON.stringify(approversList[approversList.length - 2].Flag).replace(/^"(.*)"$/, '$1') == 'false' && JSON.stringify(approversList[approversList.length - 1].Flag).replace(/^"(.*)"$/, '$1') == 'true') {
                allowManager = true;
            }
            nlapiLogExecution('DEBUG', 'allowManager Is: ', allowManager);
            var context = nlapiGetContext();
            var params = context.getSetting('SCRIPT', 'custscript_zeta_user_superapprove');
            var superApprUsers = params.split(',').map(function (item) {
                return parseInt(item.trim(), 10);
            });
            nlapiLogExecution('DEBUG', 'if user is Super Approver: ', (superApprUsers.indexOf(user) !== -1));
            if (status == 1 || status == '1') {
                if (user == billNextApprover || (role == 1041 || superApprUsers.indexOf(user) !== -1) && allowManager == true) {
                    form.addButton('custpage_approvebutton', 'Approve', 'approveButton()');
                    var suiteletUrl = nlapiResolveURL('SUITELET', 'customscript_zeta_st_reject_bill', 'customdeploy_zeta_st_reject_bill');
                    suiteletUrl += '&recordId=' + nlapiGetRecordId();
                    suiteletUrl += '&recordType=' + nlapiGetRecordType();
                    var script = 'window.open(\''
                        + suiteletUrl
                        + '\', \'reject_alert\', \'width=600,height=400,resizable=yes,scrollbars=yes\');return true;';
                    //form.addButton({id: 'custpage_btn_hold', label : 'Put Subscription on Hold', functionName : script});
                    form.addButton('custpage_rejectbutton', 'Reject', script);
                }
            } else if (billStatus == 'Rejected') {
                if (user == requestor) {
                    nlapiLogExecution('DEBUG', 'REJECT UE', billStatus)
                    form.addButton('custpage_resubmitbutton', 'Resubmit For Approval', 'resubmitButton()');
                }
            }
        }

    } catch (ERR) {
        nlapiLogExecution('ERROR', 'Error Occurred BL Is: ', ERR);
    }
    if (type == 'copy') {
        var newRecord = nlapiGetNewRecord();
        var lineCount = newRecord.getLineItemCount('expense');
        var poInternaId = false;
        for (var i = 1; i <= lineCount; i++) {
            var orderdoc = newRecord.getLineItemValue('expense', 'orderdoc', i);
            if (orderdoc) {
                poInternaId = true;
                break;
            }
        }
        if (poInternaId) {
            throw nlapiCreateError(
                'VALIDATION_ERROR',
                'Copying a bill associated with a purchase order is not allowed.',
                false
            );
        }
    }
}

function userEventBeforeSubmit(type, form, request) {
    if (type == 'create') {
        try {
            var approvalStatus = nlapiGetFieldValue('approvalstatus');
            var billNextApprover = nlapiGetFieldValue('custbody_vb_next_approver');
            var apReviwer = nlapiGetFieldValue('custbody_zeta_ap_reviewer');
            nlapiLogExecution('DEBUG', 'APREVIEWER', apReviwer);

            if (billNextApprover == null || billNextApprover == '') {
                nlapiSetFieldValue('custbody_vb_next_approver', apReviwer);
            }
            nlapiLogExecution('DEBUG', 'BillAPp', nlapiGetFieldValue('custbody_vb_next_approver'));
        
            var current_date = new Date();
            nlapiLogExecution('DEBUG','current_date', current_date);
            var today_current_date = nlapiDateToString(current_date, 'date');
            nlapiLogExecution('DEBUG','today_current_date', today_current_date);
            nlapiSetFieldValue('custbody_zeta_bill_approvaltracking', today_current_date);
        } catch (ERR) {
            nlapiLogExecution('ERROR', 'Error Occurred In BS Is: ', ERR);
        }
    }
}


function userEventAfterSubmit(type, form, request) {
    if (type == 'create' || type == 'edit') {
        var recObject = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId(), { recordmode: 'dynamic' });
        var user = nlapiGetUser();
        if (user == '20258' || user == 20258) {
            recObject.setFieldValue('approvalstatus', '2');
            nlapiSubmitRecord(recObject, true, true);
        } else {

            var status = recObject.getFieldValue('approvalstatus');
            if (status == 1 || status == '1') {
                var customForm = recObject.getFieldValue('customform');
                if ((customForm != '194' || customForm != 194)) {

                    try {

                        var Approver = recObject.getFieldValue('custbody_vb_next_approver');

                        //************ Adding Attachments ***********/
                        var attachments = new Array();
                        //Logic for files retrieving and adding to array

                        try {

                            var attachmentsSearch = nlapiSearchRecord(nlapiGetRecordType(), null, [
                                new nlobjSearchFilter('internalid', null, 'anyof', nlapiGetRecordId()),
                                new nlobjSearchFilter('mainline', null, 'is', 'T')], [new nlobjSearchColumn('internalid', 'file'),
                                new nlobjSearchColumn('filetype', 'file')]);

                            if (_logValidation(attachmentsSearch)) {


                                nlapiLogExecution('debug', 'issue with Attachments', 'yes');
                                for (var k = 0; k < attachmentsSearch.length && attachmentsSearch.length > 0; k++) {
                                    var result = attachmentsSearch[k];
                                    //add the File Object to the attachments array
                                    attachments.push(nlapiLoadFile(result.getValue('internalid', 'file')));

                                }
                            }
                        } catch (efile) {
                            nlapiLogExecution('debug', 'exception file', 'true');
                        }


                        var rec = new Array();
                        rec['transaction'] = nlapiGetRecordId();// internal id of the transaction record 


                        try {
                            var emailMerger = nlapiCreateEmailMerger('23'); // Initiate Email Merger

                            emailMerger.setTransaction(nlapiGetRecordId()); // Set the ID of the transaction where you are going to fetch the values to populate the variables on the template

                            var mergeResult = emailMerger.merge(); // Merge the template with the email

                            var emailSubject = mergeResult.getSubject(); // Get the subject for the email
                            nlapiLogExecution('debug', 'Before Approver :', Approver)

                            var emailBody = mergeResult.getBody(); // Get the body for the email
                            emailBody = emailBody.replace('{VB}', isEmpty(Approver));
                            emailBody = emailBody.replace('{VB}', isEmpty(Approver));
                            nlapiLogExecution('debug', 'AFter Approver :', Approver)
                            
                            var approveEmail = recObject.getFieldValue('custbody_approval_email_sent');
                            if (approveEmail == 'F') {
                                if (nlapiGetContext().getExecutionContext() != 'csvimport') {
                                    if (_logValidation(attachments)) {
                                        var totalSize = 0;
                                        var maxSizeMB = 9;

                                        for (var i = 0; i < attachments.length; i++) {
                                            var attachment = attachments[i];
                                            totalSize += parseFloat(attachment.size) / (1024 * 1024); // Convert size to MB
                                        }
                                        if(totalSize <= maxSizeMB){
                                            nlapiSendEmail(recObject.getFieldValue('custbody_zeta_vb_approval_sender'), recObject.getFieldValue('custbody_vb_next_approver'), emailSubject, emailBody, null, null, rec, attachments);
                                            nlapiLogExecution('DEBUG', 'Email Sent', 'Email sent with attachments.');
                                        }else{
                                            var note = '<br><br><b>Note: The total attachment size exceeds 10MB. As a result, the attachments have not been included in the email due to size constraints.</b>';
                                            emailBody += note;
                                            nlapiSendEmail(recObject.getFieldValue('custbody_zeta_vb_approval_sender'), recObject.getFieldValue('custbody_vb_next_approver'), emailSubject, emailBody, null, null, rec, null);
                                            nlapiLogExecution('DEBUG', 'Email Sent', 'Email sent without attachments due to size constraints.');
                                        }
                                        
                                    } else {
                                        nlapiSendEmail(recObject.getFieldValue('custbody_zeta_vb_approval_sender'), recObject.getFieldValue('custbody_vb_next_approver'), emailSubject, emailBody, null, null, rec, null);
                                    }
                                }
                            }

                        } catch (exception) {
                            nlapiLogExecution('debug', 'exception in WH script:', exception);
                        }

                    } catch (ERR) {
                        nlapiLogExecution('ERROR', 'Error Ocuured In try block', ERR);
                    }
                    //}

                }
            } else if (status == '3' || status == 3) {
                var customForm = recObject.getFieldValue('customform');
                if ((customForm != '194' || customForm != 194)) {
                    var rec = new Array();
                    rec['transaction'] = nlapiGetRecordId();// internal id of the transaction record 


                    try {
                        var emailMerger = nlapiCreateEmailMerger('25'); // Initiate Email Merger

                        emailMerger.setTransaction(nlapiGetRecordId()); // Set the ID of the transaction where you are going to fetch the values to populate the variables on the template

                        var mergeResult = emailMerger.merge(); // Merge the template with the email

                        var emailSubject = mergeResult.getSubject(); // Get the subject for the email
                        var emailBody = mergeResult.getBody(); // Get the body for the email
                        if (nlapiGetContext().getExecutionContext() != 'csvimport') {

                            nlapiSendEmail(recObject.getFieldValue('custbody_zeta_vb_approval_sender'),
                                recObject.getFieldValue('custbody_nsts_gaw_tran_requestor'), emailSubject, emailBody, null, null, rec);

                        }
                    } catch (exception) {
                        nlapiLogExecution('ERROR', 'Error in reject email', exception);
                    }
                }
            }
            recObject.setFieldValue('custbody_approval_email_sent', 'F');
            nlapiSubmitRecord(recObject, true, true);
        }
    }
}

function isEmpty(val) {
    return (typeof (val) != "undefined" && val != null && val.toString() != '') ? val : '';
}


function _logValidation(value) {
    if (value != null && value != '' && value != undefined && value.toString() != 'NaN' && value != NaN) {
        return true;
    } else {
        return false;
    }
}


