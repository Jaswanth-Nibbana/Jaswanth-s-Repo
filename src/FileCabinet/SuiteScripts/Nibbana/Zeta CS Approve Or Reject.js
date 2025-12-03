/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       18 Jun 2018     Monica.Nukala
 * 2.00 	  10 Jan 2025     Jaswanth Vardireddy
 * 3.00       21 April 2025     Jaswanth Vardireddy
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *
 * @returns {Boolean} True to continue save, false to abort save
 */
var isSubmitted = false;
function approveButton() {
	try {
		if (isSubmitted == false) {
			isSubmitted = true;

			var recObj = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
			var curUser = nlapiGetUser();
			var legalEntity = recObj.getFieldValue('subsidiary');
			var outputnames = new Array();
			var mailFollowups = new Array()
			var current_date = new Date();
			var today_current_date = nlapiDateToString(current_date, 'date');
			if ((legalEntity == '30' || legalEntity == 30) || (legalEntity == '38' || legalEntity == 38) || (legalEntity == '10' || legalEntity == 10) || (legalEntity == '46' || legalEntity == 46)) {
				var approverStages = recObj.getFieldValue('custbody_zeta_script_field_vba');
				var billNextApproverArray = JSON.parse(approverStages);
				var billNextApprover = recObj.getFieldValue('custbody_vb_next_approver');
				var input = billNextApprover;
				var output = "";

				if(input == curUser){
					for (i = 0; i < 3; i++) {

						var flag = billNextApproverArray[i]["Flag"];
						if (flag == "true") {
							if (input == billNextApproverArray[i]["id"] ) {
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
							outputnames[outputnames.length] = nlapiLookupField('employee', billNextApproverArray[j]["id"], 'entityid');
						}
					}

					var finalFlag = billNextApproverArray[2]["Flag"];
					if (finalFlag == "false") {
						recObj.setFieldValue('custbody_zeta_prior_approvers', JSON.stringify(outputnames));
						recObj.setFieldValue('custbody_zeta_script_field_vba', JSON.stringify(billNextApproverArray));
						recObj.setFieldValue('approvalstatus', 2);
						recObj.setFieldValue('custbody_zeta_email_followups', "");
						recObj.setFieldValue('custbody_email_reminder', 'F');
						recObj.setFieldValue('custbody_date_reminder', '');
						recObj.setFieldValue('custbody_zeta_bill_approvaltracking', today_current_date);
						nlapiLogExecution('debug', 'today_current_date', today_current_date);
						nlapiSubmitRecord(recObj, true, true);
					} else {
						recObj.setFieldValue('custbody_zeta_prior_approvers', JSON.stringify(outputnames));
						recObj.setFieldValue('custbody_zeta_script_field_vba', JSON.stringify(billNextApproverArray));
						recObj.setFieldValue('custbody_vb_next_approver', output);
						mailFollowups.push({id:output, Followups: 0})
						recObj.setFieldValue('custbody_zeta_email_followups', JSON.stringify(mailFollowups));
						recObj.setFieldValue('custbody_email_reminder', 'F');
						recObj.setFieldValue('custbody_date_reminder', '');
						recObj.setFieldValue('custbody_zeta_bill_approvaltracking', today_current_date);
						nlapiLogExecution('debug', 'today_current_date', today_current_date);
						nlapiSubmitRecord(recObj, true, true);
					}
				}

			} else {
				var poBasedBill = recObj.getFieldValue('custbody_zeta_po_number');
				if (poBasedBill != null && poBasedBill != '') {
					var approverStages = recObj.getFieldValue('custbody_zeta_script_field_vba');
					var billNextApproverArray = JSON.parse(approverStages);
					var billNextApprover = recObj.getFieldValue('custbody_vb_next_approver');
					var input = billNextApprover;
					var output = "";
					

					if(input == curUser){
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
								outputnames[outputnames.length] = nlapiLookupField('employee', billNextApproverArray[j]["id"], 'entityid');
							}
						}
						var finalFlag = billNextApproverArray[2]["Flag"];
						if (finalFlag == "false") {
							recObj.setFieldValue('custbody_zeta_prior_approvers', JSON.stringify(outputnames));
							recObj.setFieldValue('custbody_zeta_script_field_vba', JSON.stringify(billNextApproverArray));
							recObj.setFieldValue('approvalstatus', 2);
							recObj.setFieldValue('custbody_zeta_email_followups', "");
							recObj.setFieldValue('custbody_email_reminder', 'F');
							recObj.setFieldValue('custbody_date_reminder', '');
							recObj.setFieldValue('custbody_zeta_bill_approvaltracking', today_current_date);
							nlapiLogExecution('debug', 'today_current_date', today_current_date);
							nlapiSubmitRecord(recObj, true, true);
							
						} else {
							recObj.setFieldValue('custbody_zeta_prior_approvers', JSON.stringify(outputnames));
							recObj.setFieldValue('custbody_zeta_script_field_vba', JSON.stringify(billNextApproverArray));
							recObj.setFieldValue('custbody_vb_next_approver', output);
							mailFollowups.push({id:output, Followups: 0})
							recObj.setFieldValue('custbody_zeta_email_followups', JSON.stringify(mailFollowups));
							recObj.setFieldValue('custbody_email_reminder', 'F');
							recObj.setFieldValue('custbody_date_reminder', '');
							recObj.setFieldValue('custbody_zeta_bill_approvaltracking', today_current_date);
							nlapiLogExecution('debug', 'today_current_date', today_current_date);
							nlapiSubmitRecord(recObj, true, true);
						}
					}
					

				} else {
					nlapiLogExecution('debug', 'log0');
					var approverStages = recObj.getFieldValue('custbody_zeta_script_field_vba');
					var billNextApproverArray = JSON.parse(approverStages);
					var billNextApprover = recObj.getFieldValue('custbody_vb_next_approver');
					var apFinalApprover = recObj.getFieldValue('custbody_zeta_ap_final_check');
					var input = billNextApprover.toString();
					var output = "";
					nlapiLogExecution('debug', 'Check1', 'input: ' + input + ' curUser: ' + curUser);
					if(input == curUser){
						nlapiLogExecution('debug', 'Check2', 'input: ' + input + ' curUser: ' + curUser);
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
							if (billNextApproverArray[i].Flag == "true") {
								output = billNextApproverArray[i]["id"];
								break;
							}
						}
						
						for (j = 0; j < 4; j++) {
							var flagFalse = billNextApproverArray[j]["Flag"];
							if (flagFalse == "false") {
								outputnames[outputnames.length] = nlapiLookupField('employee', billNextApproverArray[j]["id"], 'entityid');
							}
						}
	
						var finalFlag = billNextApproverArray[4]["Flag"];
						if (finalFlag == "false") {
							if (curUser === billNextApproverArray[4]["id"]) {
								outputnames[outputnames.length] = nlapiLookupField('employee', billNextApproverArray[4]["id"], 'entityid');
							} else {
								// Add the billNextApprover's name to outputnames
								outputnames[outputnames.length] = nlapiLookupField('employee', curUser, 'entityid');
							}
							recObj.setFieldValue('custbody_zeta_prior_approvers', JSON.stringify(outputnames));
							recObj.setFieldValue('custbody_zeta_script_field_vba', JSON.stringify(billNextApproverArray));
							recObj.setFieldValue('approvalstatus', 2);
							recObj.setFieldValue('custbody_approval_email_sent', 'F');
							recObj.setFieldValue('custbody_zeta_email_followups', "");
							recObj.setFieldValue('custbody_email_reminder', 'F');
							recObj.setFieldValue('custbody_date_reminder', '');
							recObj.setFieldValue('custbody_zeta_bill_approvaltracking', today_current_date);
							nlapiLogExecution('debug', 'today_current_date', today_current_date);
							nlapiSubmitRecord(recObj, true, true);
						} else {
							nlapiLogExecution('debug', 'Check3');
							recObj.setFieldValue('custbody_zeta_prior_approvers', JSON.stringify(outputnames));
							recObj.setFieldValue('custbody_zeta_script_field_vba', JSON.stringify(billNextApproverArray));
							recObj.setFieldValue('custbody_vb_next_approver', output);
							recObj.setFieldValue('custbody_approval_email_sent', 'F');
							mailFollowups.push({id:output, Followups: 0})
							recObj.setFieldValue('custbody_zeta_email_followups', JSON.stringify(mailFollowups));
							recObj.setFieldValue('custbody_email_reminder', 'F');
							recObj.setFieldValue('custbody_date_reminder', '');
							recObj.setFieldValue('custbody_zeta_bill_approvaltracking', today_current_date);
							nlapiLogExecution('debug', 'today_current_date', today_current_date);
							nlapiSubmitRecord(recObj, true, true);
							nlapiLogExecution('debug', 'Check4');
						}
					}
				}
			}
			
			window.location.reload(true);
		}
	} catch (ERR) {
		nlapiLogExecution('ERROR', 'Error Occurred Is: ', ERR);
	}
}

function resubmitButton() {
	try {
        var recObj = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
		var apReviewer = recObj.getFieldValue('custbody_vb_next_approver');
		var current_date = new Date();
		var today_current_date = nlapiDateToString(current_date, 'date');
		var mailFollowups = new Array()
		mailFollowups.push({id:apReviewer, Followups: 0})
		nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), ['approvalstatus', 'custbody_zeta_email_followups', 'custbody_email_reminder', 'custbody_date_reminder', 'custbody_zeta_bill_approvaltracking'], [1, JSON.stringify(mailFollowups)], 'F', '', today_current_date);
		window.location.reload(true);
	} catch (ERR) {
		nlapiLogExecution('ERROR', 'Error Occurred Is: ', ERR);
	}
}
