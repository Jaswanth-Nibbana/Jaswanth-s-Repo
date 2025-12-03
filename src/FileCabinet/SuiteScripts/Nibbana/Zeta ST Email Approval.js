/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       06 Sep 2018     Monica.Nukala
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
var isSubmitted = false;
function apApprovalActions(request, response) {
	try {
		if (isSubmitted == false) {
			isSubmitted = true;
			var recordType = request.getParameter('tranType');
			var recordId = request.getParameter('tranId');
			var action = request.getParameter('action');
			var approverIs = request.getParameter('approver');

			var recObj = nlapiLoadRecord('vendorbill', recordId);

			var legalEntity = recObj.getFieldValue('subsidiary');
			var priorApproversArray = new Array();
			var outputnames = new Array();
			var mailFollowups = new Array()
			var current_date = new Date();
			var today_current_date = nlapiDateToString(current_date, 'date');
			if ((legalEntity == '30' || legalEntity == 30) || (legalEntity == '38' || legalEntity == 38) || (legalEntity == '10' || legalEntity == 10) || (legalEntity == '46' || legalEntity == 46)) {

				var approverStages = recObj.getFieldValue('custbody_zeta_script_field_vba');
				var billNextApproverArray = JSON.parse(approverStages);
				var currentApprover = recObj.getFieldValue('custbody_vb_next_approver');
				var input = currentApprover;
				var output = "";


				for (i = 0; i < 3; i++) {

					var flag = billNextApproverArray[i]["Flag"];
					if (flag == "true") {
						if (input == billNextApproverArray[i]["id"]) {
							billNextApproverArray[i]["Flag"] = "false";
							if (i < 2) {
								output = billNextApproverArray[i + 1]["id"];
							}
						} else {
							break;
						}
					}
				}
				for (j = 0; j < 3; j++) {
					var flagFalse = billNextApproverArray[j]["Flag"];
					if (flagFalse == "false") {
						priorApproversArray[priorApproversArray.length] = billNextApproverArray[j]["id"];
						outputnames[outputnames.length] = nlapiLookupField('employee', billNextApproverArray[j]["id"], 'entityid');
					}
				}

			} else {
				var poBasedBill = recObj.getFieldValue('custbody_zeta_po_number');
				if (poBasedBill != null && poBasedBill != '') {
					var approverStages = recObj.getFieldValue('custbody_zeta_script_field_vba');
					var billNextApproverArray = JSON.parse(approverStages);
					var currentApprover = recObj.getFieldValue('custbody_vb_next_approver');
					var input = currentApprover;
					var output = "";


					for (i = 0; i < 3; i++) {

						var flag = billNextApproverArray[i]["Flag"];
						if (flag == "true") {
							if (input == billNextApproverArray[i]["id"]) {
								billNextApproverArray[i]["Flag"] = "false";
							} else {
								break;
							}
						}
					}
					for (var i = 0; i < billNextApproverArray.length; i++) {
						if (billNextApproverArray[i].Flag === "true") {
							output = billNextApproverArray[i]["id"];
							break;
						}
					}
					for (j = 0; j < 3; j++) {
						var flagFalse = billNextApproverArray[j]["Flag"];
						if (flagFalse == "false") {
							priorApproversArray[priorApproversArray.length] = billNextApproverArray[j]["id"];
							outputnames[outputnames.length] = nlapiLookupField('employee', billNextApproverArray[j]["id"], 'entityid');
						}
					}
				} else {
					var approverStages = recObj.getFieldValue('custbody_zeta_script_field_vba');
					var billNextApproverArray = JSON.parse(approverStages);
					var currentApprover = recObj.getFieldValue('custbody_vb_next_approver');
					var apFinalApprover = recObj.getFieldValue('custbody_zeta_ap_final_check');
					var input = currentApprover;

					var output = "";
					for (i = 0; i < 5; i++) {

						var flag = billNextApproverArray[i]["Flag"];

						if (flag == "true") {
							if (input == billNextApproverArray[i]["id"]) {
								billNextApproverArray[i]["Flag"] = "false";
							} else {
								break;
							}
						}
					}
					for (var i = 0; i < billNextApproverArray.length; i++) {
						if (billNextApproverArray[i].Flag === "true") {
							output = billNextApproverArray[i]["id"];
							break;
						}
					}
					for (j = 0; j < 5; j++) {
						var flagFalse = billNextApproverArray[j]["Flag"];
						if (flagFalse == "false") {
							priorApproversArray[priorApproversArray.length] = billNextApproverArray[j]["id"];
							outputnames[outputnames.length] = nlapiLookupField('employee', billNextApproverArray[j]["id"], 'entityid');
						}
					}
				}
			}
			nlapiLogExecution('AUDIT', 'output', output + 'json arrsya' + JSON.stringify(billNextApproverArray));
			if (action == '1') {
				if (approverIs == currentApprover) {
					recObj.setFieldValue('custbody_zeta_script_field_vba', JSON.stringify(billNextApproverArray));
					recObj.setFieldValue('custbody_zeta_prior_approvers', JSON.stringify(outputnames));
					recObj.setFieldValue('custbody_email_reminder', 'F');
					if (output != null && output != '') {
						recObj.setFieldValue('custbody_vb_next_approver', output);
						mailFollowups.push({id:output, Followups: 0})
						recObj.setFieldValue('custbody_zeta_email_followups', JSON.stringify(mailFollowups));
						//recObj.setFieldValue('custbody_zeta_email_approval','T');
						var Approver = output;
						nlapiLogExecution('AUDIT', 'nextApprover', output);
						var nextApproverName = nlapiLookupField('employee', output, 'entityid');
						nlapiLogExecution('AUDIT', 'nextApproverName', nextApproverName);
						//************ Adding Attachments ***********/
						//array used to store the Files to be attached
						var attachmentsId = recObj.getFieldValue('custbody_zeta_pdf_file');
						var status = recObj.getFieldValue('approvalstatus');
						nlapiLogExecution('AUDIT', 'status', status);
						var attachments = new Array();

						//Logic for files retrieving and adding to array

						try {

							var attachmentsSearch = nlapiSearchRecord('vendorbill', null, [
								new nlobjSearchFilter('internalid', null, 'anyof', recordId),
								new nlobjSearchFilter('mainline', null, 'is', 'T')], [new nlobjSearchColumn('internalid', 'file'),
								new nlobjSearchColumn('filetype', 'file')]);

							if (attachmentsSearch) {
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
						rec['transaction'] = recordId;// internal id of the transaction record

						try {
							var emailMerger = nlapiCreateEmailMerger('24'); // Initiate Email Merger

							emailMerger.setTransaction(recordId); // Set the ID of the transaction where you are going to fetch the values to populate the variables on the template

							var mergeResult = emailMerger.merge(); // Merge the template with the email

							var emailSubject = mergeResult.getSubject(); // Get the subject for the email
							nlapiLogExecution('debug', 'Before Approver :', Approver)

							var emailBody = mergeResult.getBody(); // Get the body for the email
							emailBody = emailBody.replace('{VB}', isEmpty(Approver));
							emailBody = emailBody.replace('{VB}', isEmpty(Approver));

							emailBody = emailBody.replace(/custtag1/g, nextApproverName);
							emailBody = emailBody.replace(/custtag2/g, JSON.stringify(outputnames));
							nlapiLogExecution('debug', 'AFter Approver :', Approver)
							if (nlapiGetContext().getExecutionContext() != 'csvimport') {
								if (status == 1 || status == '1') {
									nlapiLogExecution('audit', 'Entered IF :', "Entered IF");
									if (attachments) {
										nlapiSendEmail(recObj.getFieldValue('custbody_zeta_vb_approval_sender'),
											recObj.getFieldValue('custbody_vb_next_approver'), emailSubject, emailBody, null, null, rec, attachments);

										nlapiLogExecution('debug', 'AFter Approver :', "Triggered sending email")

									} else {
										nlapiSendEmail(recObj.getFieldValue('custbody_zeta_vb_approval_sender'),
											recObj.getFieldValue('custbody_vb_next_approver'), emailSubject, emailBody, null, null, rec, null);
									}
								}
							}


						} catch (exception) {
							nlapiLogExecution('debug', 'exception in WH script:', exception);
						}
					} else {
						recObj.setFieldValue('custbody_zeta_email_followups', "");
						recObj.setFieldValue('approvalstatus', 2);
					}
					recObj.setFieldValue('custbody_approval_email_sent', 'T');
					recObj.setFieldValue('custbody_date_reminder', '');
					recObj.setFieldValue('custbody_zeta_bill_approvaltracking', today_current_date);
					nlapiSubmitRecord(recObj, false, true);

					response.write("Transaction Approved.")
				} else {
					nlapiLogExecution('Debug', 'Approve Block');
					response.write("Transaction is Approved.");
				}
			} else {
				if (approverIs == currentApprover) {
					recObj.setFieldValue('approvalstatus', 3);
					recObj.setFieldValue('custbody_zeta_email_followups', "");
					recObj.setFieldValue('custbody_approval_email_sent', 'F');
					recObj.setFieldValue('custbody_email_reminder', 'F');
					recObj.setFieldValue('custbody_date_reminder', '');
					recObj.setFieldValue('custbody_zeta_bill_approvaltracking', '');
					var rec = new Array();
					rec['transaction'] = recordId;// internal id of the transaction record

					try {
						var emailMerger = nlapiCreateEmailMerger('25'); // Initiate Email Merger

						emailMerger.setTransaction(recordId); // Set the ID of the transaction where you are going to fetch the values to populate the variables on the template

						var mergeResult = emailMerger.merge(); // Merge the template with the email

						var emailSubject = mergeResult.getSubject(); // Get the subject for the email
						var emailBody = mergeResult.getBody(); // Get the body for the email
						if (nlapiGetContext().getExecutionContext() != 'csvimport') {

							nlapiSendEmail(recObj.getFieldValue('custbody_zeta_vb_approval_sender'),
								recObj.getFieldValue('custbody_nsts_gaw_tran_requestor'), emailSubject, emailBody, null, null, rec);

						}
					} catch (exception) {
						nlapiLogExecution('ERROR', 'Error in reject email', exception);
					}
					nlapiSubmitRecord(recObj, false, true);
					response.write("Transaction Rejected.");
				} else {
					nlapiLogExecution('Debug', 'Reject Block');
					response.write("Transaction Rejected.");
				}
			}
		}
	} catch (ERR) {
		nlapiLogExecution('ERROR', "Error Occurred In TotalBlock", ERR);
	}

}

function isEmpty(val) {
	return (typeof (val) != "undefined" && val != null && val.toString() != '') ? val : '';
}
