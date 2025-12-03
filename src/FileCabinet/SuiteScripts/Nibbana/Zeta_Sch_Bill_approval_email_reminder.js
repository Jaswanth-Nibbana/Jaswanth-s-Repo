// BEGIN SCRIPT DESCRIPTION BLOCK  ==================================

// END SCRIPT DESCRIPTION BLOCK  ====================================

function sch_bill_approval_email_notification() {
    try {
        var context = nlapiGetContext();
        var nextapprover_array = [];

        var filters = [
            ["mainline", "is", "T"],
            "AND",
            ["type", "anyof", "VendBill"],
            "AND",
            ["status", "anyof", "VendBill:D"],
            "AND",
            ["datecreated", "onorafter", "01/01/2023 12:00 am"]
        ];

        var columns = [
            new nlobjSearchColumn("messagedate", "messages", null),
            new nlobjSearchColumn("recipient", "messages", null),
            new nlobjSearchColumn("custbody_zeta_ap_reviewer"),
            new nlobjSearchColumn("custbody_zeta_account_manager"),
            new nlobjSearchColumn("custbody34"),
            new nlobjSearchColumn("custbody_fpa_approver"),
            new nlobjSearchColumn("custbody_zeta_ap_final_check"),
            new nlobjSearchColumn("custbody_zeta_script_field_vba"),
            new nlobjSearchColumn("custbody_zeta_prior_approvers"),
            new nlobjSearchColumn("internalid"),
            new nlobjSearchColumn("custbody_zeta_vb_approval_sender"),
            new nlobjSearchColumn("custbody_vb_next_approver"),
            new nlobjSearchColumn("custbody_email_reminder"),
            new nlobjSearchColumn("custbody_date_reminder"),
            new nlobjSearchColumn("custbody_zeta_email_followups")
        ]


        var results = nlapiSearchRecord('transaction', null, filters, columns); //search record

        var bill_approval_search = results; //copy the result

        while (results.length == 1000) { //if there are more than 1000 records

            var lastId = results[999].getValue('internalid'); //note the last record retrieved
            //filters[2] = new nlobjSearchFilter('internalidnumber',null,'greaterthan',lastId); //create new filter to restrict the next search based on the last record returned
            filters.push('AND');
            filters.push(['internalidnumber', 'greaterthan', lastId]);
            nlapiLogExecution('debug', 'filters lenght', filters)


            results = nlapiSearchRecord('transaction', null, filters, columns);

            bill_approval_search = bill_approval_search.concat(results); //add the result to the complete result set 
        }

        nlapiLogExecution('debug', 'bill_approval_search lenght', bill_approval_search && bill_approval_search.length)

        if (_logValidation(bill_approval_search)) {

            for (var i = 0; i < bill_approval_search.length; i++) {

                nlapiLogExecution('audit', 'For Loop Sequence', i);

                ReScheduling()

                var i_rec_id = bill_approval_search[i].getValue(new nlobjSearchColumn("internalid"));
                nlapiLogExecution('audit', 'Processing Record', i_rec_id);
                var Approver = bill_approval_search[i].getValue(new nlobjSearchColumn("custbody_vb_next_approver"));
                var approval_mail = nlapiLookupField('employee', Approver, 'email');
                var i_date_reminder = bill_approval_search[i].getValue(new nlobjSearchColumn("custbody_date_reminder"));
                // nlapiLogExecution('debug', 'i_date_reminder', i_date_reminder);
                var i_date_reminder_convert = nlapiStringToDate(i_date_reminder);
                if (_logValidation(i_date_reminder_convert)) {
                    var date_remind_sethours = i_date_reminder_convert.setHours(48);
                    var email_new_date_remind = new Date(date_remind_sethours);
                    var i_date_remind_time = email_new_date_remind.getTime();
                    // nlapiLogExecution('debug', 'i_date_time', i_date_time);

                    // var i_email_convert_date = nlapiDateToString(i_date_remind_time, 'datetimetz');
                }
                var i_email_send_date = bill_approval_search[i].getValue(new nlobjSearchColumn("messagedate", "messages", null));
                // nlapiLogExecution('debug', 'i_email_send_date', i_email_send_date);
                var email_convert_date = nlapiStringToDate(i_email_send_date);

                nlapiLogExecution('debug','email_convert_date',email_convert_date);
                if (_logValidation(email_convert_date)) {
                    var email_sethours = email_convert_date.setHours(48);
                    //  nlapiLogExecution('debug', 'email_sethours', email_sethours);
                    var email_new_date = new Date(email_sethours);
                    var i_date_time = email_new_date.getTime();
                    nlapiLogExecution('debug', 'i_date_time', i_date_time);

                    var i_email_convert_date = nlapiDateToString(email_new_date, 'datetimetz');

                }

                //nlapiLogExecution('debug','i_email_convert_date',i_email_convert_date);

                var i_primary_recipient = bill_approval_search[i].getValue(new nlobjSearchColumn("recipient", "messages", null));
                var i_ap_reviewer = bill_approval_search[i].getValue(new nlobjSearchColumn("custbody_zeta_ap_reviewer"));
                var i_zeta_account_manger = bill_approval_search[i].getValue(new nlobjSearchColumn("custbody_zeta_account_manager"));
                var i_invoice_approver = bill_approval_search[i].getValue(new nlobjSearchColumn("custbody34"));
                var i_fpa_approver = bill_approval_search[i].getValue(new nlobjSearchColumn("custbody_fpa_approver"));
                var i_ap_final_check = bill_approval_search[i].getValue(new nlobjSearchColumn("custbody_zeta_ap_final_check"));
                var i_script_field = bill_approval_search[i].getValue(new nlobjSearchColumn("custbody_zeta_script_field_vba"));
                var i_prior_approver = bill_approval_search[i].getValue(new nlobjSearchColumn("custbody_zeta_prior_approvers"));
                var recordId = bill_approval_search[i].getValue(new nlobjSearchColumn("internalid"));
                var i_approval_email_send_from = bill_approval_search[i].getValue(new nlobjSearchColumn("custbody_zeta_vb_approval_sender"));
                var i_email_remind_chkbox = bill_approval_search[i].getValue(new nlobjSearchColumn("custbody_email_reminder"));
                var email_followups = bill_approval_search[i].getValue(new nlobjSearchColumn("custbody_zeta_email_followups"));
                var i_email_followups;
                if (email_followups.length > 0) {
                    i_email_followups = JSON.parse(email_followups);
                }
                //nlapiLogExecution('debug','i_approval_email_send_from',i_approval_email_send_from);
                var current_date = new Date();
                var current_date_time = current_date.getTime();
                nlapiLogExecution('debug', 'current_date_time', current_date_time);
                //var i_current_date = current_date.getHours();
                // var i_today_new_date = new Date(i_current_date);
                var today_current_date = nlapiDateToString(current_date, 'date');
                nlapiLogExecution('debug', 'today_current_date', today_current_date);
                var script_field_parse = JSON.parse(i_script_field);
                nlapiLogExecution('debug', 'i_date_time <= current_date_time', i_date_time <= current_date_time);
                if ((i_date_time <= current_date_time && i_email_remind_chkbox == 'F') || (i_date_remind_time <= current_date_time && i_email_remind_chkbox == 'T')) {
                    //nlapiLogExecution('debug', 'i_script_field_length', script_field_parse.length);
                    for (var j = 0; j < script_field_parse.length; j++) {
                        var approval_id = script_field_parse[j].id;
                        // nlapiLogExecution('debug', 'approval_id', approval_id);
                        // nlapiLogExecution('debug', 'i_primary_recipient', i_primary_recipient);

                        var approval_flag = script_field_parse[j].Flag;
                        // nlapiLogExecution('debug', 'approval_flag', approval_flag);

                        if (approval_flag == 'true') {
                            if (approval_id == i_primary_recipient && approval_id == Approver && nextapprover_array.indexOf(i_rec_id) == -1) {
                                nextapprover_array.push(i_rec_id);

                                nlapiLogExecution('debug', 'approval_id', 'approval_id' + approval_id + ',' + 'Approver' + Approver);
                                //var rec = new Array();
                                //rec['transaction'] = recordId;// internal id of the transaction record

                                var i_employee_record = nlapiLoadRecord('employee', i_primary_recipient);
                                // nlapiLogExecution('debug', 'i_employee_record', i_employee_record);
                                var primary_rec_email = i_employee_record.getFieldValue('email');
                                // nlapiLogExecution('debug', 'primary_rec_email', primary_rec_email);
                                //************ Adding Attachments ***********/

                                var attachments = new Array();
                                //Logic for files retrieving and adding to array
                                try {

                                    var attachmentsSearch = nlapiSearchRecord("vendorbill", null, [
                                        new nlobjSearchFilter('internalid', null, 'anyof', i_rec_id),
                                        new nlobjSearchFilter('mainline', null, 'is', 'T')],
                                        [new nlobjSearchColumn('internalid', 'file'), new nlobjSearchColumn('filetype', 'file')]
                                    );

                                    if (attachmentsSearch) {
                                        nlapiLogExecution('debug', 'issue with Attachments', 'yes');
                                        for (var k = 0; k < attachmentsSearch.length && attachmentsSearch.length > 0; k++) {
                                            var result = attachmentsSearch[k];
                                            //add the File Object to the attachments array
                                            attachments.push(nlapiLoadFile(result.getValue('internalid', 'file')));
                                        }
                                    }
                                    attachments.push(nlapiPrintRecord('TRANSACTION', i_rec_id, 'DEFAULT', null));
                                } catch (efile) {
                                    nlapiLogExecution('debug', 'exception file', 'true');
                                }

                                var remainderNo = "";
                                var mailFollowups = new Array()
                                if (email_followups.length > 0) {
                                    if (i_email_followups[0].Followups == 0) {
                                        remainderNo = "1st Followup "
                                    } else if (i_email_followups[0].Followups == 1) {
                                        remainderNo = "2nd Followup "
                                    } else if (i_email_followups[0].Followups == 2) {
                                        remainderNo = "3rd Followup "
                                    } else {
                                        remainderNo = i_email_followups[0].Followups + 1 + "th Followup "
                                    }
                                    var updatedFollowupNo = i_email_followups[0].Followups + 1
                                    mailFollowups.push({ id: approval_id, Followups: updatedFollowupNo })
                                }

                                var rec = new Array();
                                rec['transaction'] = i_rec_id; // internal id of the transaction record

                                var emailMerger = nlapiCreateEmailMerger('23'); // Initiate Email Merger

                                emailMerger.setTransaction(recordId); // Set the ID of the transaction where you are going to fetch the values to populate the variables on the template

                                var mergeResult = emailMerger.merge(); // Merge the template with the email

                                var emailSubject = mergeResult.getSubject(); // Get the subject for the email
                                var emailBody = mergeResult.getBody(); // Get the body for the email
                                emailBody = emailBody.replace('{VB}', isEmpty(Approver));
                                emailBody = emailBody.replace('{VB}', isEmpty(Approver));
                                nlapiLogExecution('debug', 'AFter Approver :', Approver)
                                nlapiLogExecution('debug', 'AFter searchApprover :', searchApprover)
                                //var updatedRecord = nlapiLoadRecord('vendorbill', i_rec_id);
                                //var currentApprover = updatedRecord.getFieldValue('custbody_vb_next_approver');

                                if(currentApprover == Approver){
                                    try{
                                        if (email_followups.length > 0) {
                                            if (attachments) {
                                                var totalSize = 0;
                                                var maxSizeMB = 13;
    
                                                for (var i = 0; i < attachments.length; i++) {
                                                    var attachment = attachments[i];
                                                    totalSize += parseFloat(attachment.size) / (1024 * 1024); // Convert size to MB
                                                }
    
                                                if (totalSize <= maxSizeMB){
                                                    nlapiSendEmail(i_approval_email_send_from, approval_mail, 'Approval Reminder ' + remainderNo + "for " + emailSubject + '', emailBody, null, null, rec, attachments);
                                                    nlapiLogExecution('debug', 'email sent with Attachments')
                                                    nlapiSubmitField('vendorbill', recordId, ['custbody_email_reminder', 'custbody_date_reminder', 'custbody_zeta_email_followups'], ['T', today_current_date, JSON.stringify(mailFollowups)]);
                                                }else{
                                                    nlapiSendEmail(i_approval_email_send_from, approval_mail, 'Approval Reminder ' + remainderNo + "for " + emailSubject + '', emailBody, null, null, rec, null);
                                                    nlapiLogExecution('debug', 'email sent without attachments')
                                                    nlapiSubmitField('vendorbill', recordId, ['custbody_email_reminder', 'custbody_date_reminder', 'custbody_zeta_email_followups'], ['T', today_current_date, JSON.stringify(mailFollowups)]);
                                                }
        
                                            } else {
                                                nlapiSendEmail(i_approval_email_send_from, approval_mail, 'Approval Reminder ' + remainderNo + "for " + emailSubject + '', emailBody, null, null, rec, null);
                                                nlapiLogExecution('debug', 'email sent')
                                                nlapiSubmitField('vendorbill', recordId, ['custbody_email_reminder', 'custbody_date_reminder', 'custbody_zeta_email_followups'], ['T', today_current_date, JSON.stringify(mailFollowups)]);
        
                                            }
                                        } else {
                                            if (attachments) {
                                                var totalSize = 0;
                                                var maxSizeMB = 13;
    
                                                for (var i = 0; i < attachments.length; i++) {
                                                    var attachment = attachments[i];
                                                    totalSize += parseFloat(attachment.size) / (1024 * 1024); // Convert size to MB
                                            
                                                }
    
                                                if(totalSize <= maxSizeMB ){
                                                    nlapiSendEmail(i_approval_email_send_from, approval_mail, 'Approval Reminder for ' + emailSubject + '', emailBody, null, null, rec, attachments);
                                                    nlapiLogExecution('debug', 'email sent with Attachments')
                                                    nlapiSubmitField('vendorbill', recordId, ['custbody_email_reminder', 'custbody_date_reminder'], ['T', today_current_date]);
                                                }else{
                                                    nlapiSendEmail(i_approval_email_send_from, approval_mail, 'Approval Reminder for ' + emailSubject + '', emailBody, null, null, rec, null);
                                                    nlapiLogExecution('debug', 'email sent')
                                                    nlapiSubmitField('vendorbill', recordId, ['custbody_email_reminder', 'custbody_date_reminder'], ['T', today_current_date]);
                                                }
                                                
                                            } else {
                                                nlapiSendEmail(i_approval_email_send_from, approval_mail, 'Approval Reminder for ' + emailSubject + '', emailBody, null, null, rec, null);
                                                nlapiLogExecution('debug', 'email sent')
                                                nlapiSubmitField('vendorbill', recordId, ['custbody_email_reminder', 'custbody_date_reminder'], ['T', today_current_date]);
                                            }
                                        }
                                    }catch(e){
                                        nlapiLogExecution('error', 'Error', e.toString());
                                    }
                                }else{
                                    nlapiLogExecution('debug', 'Approver Updated or Bill Approved')
                                }
                                break;
                            }
                        }
                    }
                }
            }
        }
    } catch (exception) {

        nlapiLogExecution('error', 'Error');
        nlapiLogExecution('error', 'Error', exception.toString());

        if (exception instanceof nlobjError)
            nlapiLogExecution('DEBUG', 'In Catch IF1===', exception.getCode() + '\n' + exception.getDetails())
        else
            nlapiLogExecution('DEBUG', 'In Catch IF2===', exception.toString())
    }
}

function ReScheduling() {
    var context = nlapiGetContext();
    var i_usage_end = context.getRemainingUsage();
    nlapiLogExecution('audit', 'Remaining Usage', i_usage_end);

    if (i_usage_end <= 300) {

        nlapiLogExecution('audit', 'Usage less than threshold', i_usage_end);

        var s_yield = nlapiYieldScript();
        nlapiLogExecution('DEBUG', 'reschedule the script----yeild script', 'i_usage_end =' + i_usage_end);
    }
}

function _logValidation(value) {
    if (value != null && value != '' && value != undefined && value.toString() != 'NaN' && value != NaN) {
        return true;
    } else {
        return false;
    }
}

function isEmpty(val) {
    return (typeof (val) != "undefined" && val != null && val.toString() != '') ? val : '';
}

