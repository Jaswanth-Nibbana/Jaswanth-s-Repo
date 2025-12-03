/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       24 Oct 2018     Monica.Nukala
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function userEventBeforeSubmit(type) {
	try {
		if (type == 'create') {
			var recordType = nlapiGetRecordType();
			var arrarApprovers = new Array();
			if (recordType == 'vendorbill') {
				var legalEntity = nlapiGetFieldValue('subsidiary');
				var apReviewer = nlapiGetFieldValue('custbody_zeta_ap_reviewer');
				if ((legalEntity == '30' || legalEntity == 30) || (legalEntity == '38' || legalEntity == 38) || (legalEntity == '10' || legalEntity == 10) || (legalEntity == '46' || legalEntity == 46)) {
					var apReviewer = nlapiGetFieldValue('custbody_zeta_ap_reviewer');
					var apInvoiceApprover = nlapiGetFieldValue('custbody34');
					var apFpaApprover = nlapiGetFieldValue('custbody_fpa_approver');

					arrarApprovers.push({ id: apReviewer, Flag: "true" });
					arrarApprovers.push({ id: apInvoiceApprover, Flag: "true" });
					arrarApprovers.push({ id: apFpaApprover, Flag: "true" });
				} else {
					var poNumber = nlapiGetFieldValue('transform');
					if (poNumber == 'purchord') {
						var apReviewer = nlapiGetFieldValue('custbody_zeta_ap_reviewer');
						var poRequestor = nlapiGetFieldValue('custbody_zeta_po_requestor');
						var apFinalApprover = nlapiGetFieldValue('custbody_zeta_ap_final_check');

						arrarApprovers.push({ id: apReviewer, Flag: "true" });
						arrarApprovers.push({ id: poRequestor, Flag: "true" });
						arrarApprovers.push({ id: apFinalApprover, Flag: "true" });
						nlapiLogExecution('DEBUG', 'arrarApprovers in PO related Bill Block', JSON.stringify(arrarApprovers));
					} else {
						var apReviewer = nlapiGetFieldValue('custbody_zeta_ap_reviewer');
						var apZetaAcctMgr = nlapiGetFieldValue('custbody_zeta_account_manager');
						var apInvoiceApprover = nlapiGetFieldValue('custbody34');
						var apFpaApprover = nlapiGetFieldValue('custbody_fpa_approver');
						var apFinalApprover = nlapiGetFieldValue('custbody_zeta_ap_final_check');

						arrarApprovers.push({ id: apReviewer, Flag: "true" });
						arrarApprovers.push({ id: apZetaAcctMgr, Flag: "true" });
						arrarApprovers.push({ id: apInvoiceApprover, Flag: "true" });
						arrarApprovers.push({ id: apFpaApprover, Flag: "true" });
						arrarApprovers.push({ id: apFinalApprover, Flag: "true" });
						nlapiLogExecution('DEBUG', 'arrarApprovers', JSON.stringify(arrarApprovers))
					}
				}
				var mailFollowups = new Array()
				mailFollowups.push({ id: apReviewer, Followups: 0 })
				nlapiSetFieldValue('custbody_zeta_email_followups', JSON.stringify(mailFollowups));
				nlapiSetFieldValue('custbody_zeta_script_field_vba', JSON.stringify(arrarApprovers));
			} else if (recordType == 'creditmemo') {
				var businessCMApprover = nlapiGetFieldValue('custbody_zeta_business_cm_app');
				var arManager = nlapiGetFieldValue('custbody_zeta_ar_manager');
				var arFinalCheckApprover = nlapiGetFieldValue('custbody_zeta_final_check_approver');

				arrarApprovers.push({ id: businessCMApprover, Flag: "true" });
				arrarApprovers.push({ id: arManager, Flag: "true" });
				arrarApprovers.push({ id: arFinalCheckApprover, Flag: "true" });

				nlapiLogExecution('DEBUG', 'arrarApprovers in Credit Memo ', JSON.stringify(arrarApprovers));
				nlapiSetFieldValue('custbody_zeta_script_field_vba', JSON.stringify(arrarApprovers));
			}
		}
		//=====================Added By Ganesh Reddy ============================
		//============EDIT approval functionality========================
		if (type == 'edit') {
			var recordType = nlapiGetRecordType();
			if (recordType == 'vendorbill') {
				var arrarApprovers = new Array();

				var apReviewer = nlapiGetFieldValue('custbody_zeta_ap_reviewer');
				nlapiLogExecution('debug', 'newrecord_apReviewer', apReviewer);
				var apZetaAcctMgr = nlapiGetFieldValue('custbody_zeta_account_manager');
				var apInvoiceApprover = nlapiGetFieldValue('custbody34');
				var apFpaApprover = nlapiGetFieldValue('custbody_fpa_approver');
				var apFinalApprover = nlapiGetFieldValue('custbody_zeta_ap_final_check');
				var poBasedBill = nlapiGetFieldValue('custbody_zeta_po_number');
				var mailFollowups = new Array()
				var current_date = new Date();
				var today_current_date = nlapiDateToString(current_date, 'date');

				if (poBasedBill != null && poBasedBill != '') // 3 level of approvals for PO based Bills
				{
					nlapiLogExecution('debug', 'PO based bill');
					var poRequestor = nlapiGetFieldValue('custbody_zeta_po_requestor');

					var currentApprovers = [
						apReviewer,
						poRequestor,
						apFinalApprover
					];

					var approvalTrackingJson = nlapiGetFieldValue('custbody_zeta_script_field_vba');
					var approvalTracking = [];

					if (approvalTrackingJson) {
						try {
							approvalTracking = JSON.parse(approvalTrackingJson);
						} catch (e) {
							nlapiLogExecution('error', 'Invalid JSON', e.toString());
							return;
						}
					}

					var updatedTracking = [];
					var mailFollowups = [];
					var nextApproverId = null;

					for (var i = 0; i < currentApprovers.length; i++) {
						var newId = currentApprovers[i];
						var oldEntry = approvalTracking[i];

						if (oldEntry && oldEntry.id === newId) {
							updatedTracking.push({
								id: oldEntry.id,
								Flag: oldEntry.Flag
							});
						} else {
							updatedTracking.push({
								id: newId,
								Flag: "true"
							});
						}
					}

					for (var j = 0; j < updatedTracking.length; j++) {
						if (updatedTracking[j].Flag === "true") {
							nextApproverId = updatedTracking[j].id;
							mailFollowups.push({ id: nextApproverId, Followups: 0 });
							break;
						}
					}

					nlapiSetFieldValue('custbody_zeta_script_field_vba', JSON.stringify(updatedTracking));
					nlapiSetFieldValue('custbody_vb_next_approver', nextApproverId);
					nlapiSetFieldValue('custbody_zeta_email_followups', JSON.stringify(mailFollowups));
					nlapiSetFieldValue('custbody_email_reminder', 'F');
					nlapiSetFieldValue('custbody_date_reminder', '');
					nlapiSetFieldValue('custbody_zeta_bill_approvaltracking', today_current_date);

				} else { // 5 level of approvals for Non-PO based Bills
					nlapiLogExecution('debug', 'Non-PO based bill');

					var currentApprovers = [
						apReviewer,
						apZetaAcctMgr,
						apInvoiceApprover,
						apFpaApprover,
						apFinalApprover
					];
					var approvalTrackingJson = nlapiGetFieldValue('custbody_zeta_script_field_vba');
					var approvalTracking = [];

					if (approvalTrackingJson) {
						try {
							approvalTracking = JSON.parse(approvalTrackingJson);
						} catch (e) {
							nlapiLogExecution('error', 'Invalid JSON', e.toString());
							return;
						}
					}

					var updatedTracking = [];
					var nextApproverId = null;

					for (var i = 0; i < currentApprovers.length; i++) {
						var newId = currentApprovers[i];
						var oldEntry = approvalTracking[i];

						if (oldEntry && oldEntry.id === newId) {
							// No change, keep status
							updatedTracking.push({
								id: oldEntry.id,
								Flag: oldEntry.Flag
							});
						} else {
							// Approver changed or new, reset to pending
							updatedTracking.push({
								id: newId,
								Flag: "true"
							});
						}
					}

					for (var j = 0; j < updatedTracking.length; j++) {
						if (updatedTracking[j].Flag === "true") {
							nextApproverId = updatedTracking[j].id;
							mailFollowups.push({ id: nextApproverId, Followups: 0 })
							break;
						}
					}

					nlapiSetFieldValue('custbody_zeta_script_field_vba', JSON.stringify(updatedTracking));
					nlapiSetFieldValue('custbody_vb_next_approver', nextApproverId);
					nlapiSetFieldValue('custbody_zeta_email_followups', JSON.stringify(mailFollowups));
					nlapiSetFieldValue('custbody_email_reminder', 'F');
					nlapiSetFieldValue('custbody_date_reminder', '');
					nlapiSetFieldValue('custbody_zeta_bill_approvaltracking', today_current_date);

				}

			} else if (recordType == 'creditmemo') // Added By Ganesh Reddy (06052022)
			{
				var i_old_record = nlapiGetOldRecord();
				var i_old_businessCMApprover = i_old_record.getFieldValue('custbody_zeta_business_cm_app');
				var i_old_arManager = i_old_record.getFieldValue('custbody_zeta_ar_manager');
				var i_old_arFinalCheckApprover = i_old_record.getFieldValue('custbody_zeta_final_check_approver');


				var businessCMApprover = nlapiGetFieldValue('custbody_zeta_business_cm_app');
				var arManager = nlapiGetFieldValue('custbody_zeta_ar_manager');
				var arFinalCheckApprover = nlapiGetFieldValue('custbody_zeta_final_check_approver');

				if (i_old_businessCMApprover != businessCMApprover || i_old_arManager != arManager || i_old_arFinalCheckApprover != arFinalCheckApprover) {
					arrarApprovers.push({ id: businessCMApprover, Flag: "true" });
					arrarApprovers.push({ id: arManager, Flag: "true" });
					arrarApprovers.push({ id: arFinalCheckApprover, Flag: "true" });

				}

				if (_logValidation(arrarApprovers)) {
					nlapiSetFieldValue('custbody_zeta_script_field_vba', JSON.stringify(arrarApprovers));
					nlapiSetFieldValue('custbody_zeta_prior_approvers', '');
					nlapiSetFieldValue('custbody_vb_next_approver', businessCMApprover);
				}
			}

		}

	} catch (E) {
		nlapiLogExecution('ERROR', 'Error Occurred In Update Field Is: ', E);
	}
}


function userEventBeforeLoad_mandatory(type, form, request) {
	try {
		var legalEntity = nlapiGetFieldValue('subsidiary');
		var user = nlapiGetContext().getUser();
		var recordType = nlapiGetRecordType();
		if (recordType == 'vendorbill') {

			if (type == 'create' || type == 'copy') {
				nlapiSetFieldValue('custbody_nsts_gaw_tran_requestor', user);
				nlapiSetFieldValue('custbody_nsts_gaw_created_by', user)
				var fieldVal = nlapiGetFieldValue('custbody_zeta_vb_approval_sender');
				if (fieldVal == '39676' || fieldVal == 39676) {
					nlapiSetFieldValue('custbody_zeta_ap_reviewer', 34916);
				} else {
					if (user == '45173' || user == 45173) {
						nlapiSetFieldValue('custbody_zeta_ap_reviewer', 39947);
					} else if (user == '39947' || user == 39947) {
						nlapiSetFieldValue('custbody_zeta_ap_reviewer', 16695);
					} else if (user == '16695' || user == 16695) {
						nlapiSetFieldValue('custbody_zeta_ap_reviewer', 579);
					} else if (user == '579' || user == 579) {
						nlapiSetFieldValue('custbody_zeta_ap_reviewer', 45173);
					}
				}
			}
			if (user == '20258' || user == 20258) {
				var fieldObj1 = nlapiGetField('custbody_zeta_ap_reviewer');
				var fieldObj2 = nlapiGetField('custbody_zeta_ap_final_check');

				fieldObj1.setMandatory(false);
				fieldObj2.setMandatory(false);
			} else if ((legalEntity == '30' || legalEntity == 30) || (legalEntity == '38' || legalEntity == 38) || (legalEntity == '10' || legalEntity == 10) || (legalEntity == '46' || legalEntity == 46)) {
				var fieldObj1 = nlapiGetField('custbody_zeta_ap_reviewer');
				var fieldObj2 = nlapiGetField('custbody_zeta_ap_final_check');

				fieldObj1.setMandatory(true);
				fieldObj2.setMandatory(false);
			} else {
				var fieldObj1 = nlapiGetField('custbody_zeta_ap_reviewer');
				var fieldObj2 = nlapiGetField('custbody_zeta_ap_final_check');

				fieldObj1.setMandatory(true);
				fieldObj2.setMandatory(true);
			}
		} else if (recordType == 'creditmemo') {
			if (type == 'create' || type == 'copy') {
				nlapiSetFieldValue('custbody_nsts_gaw_tran_requestor', user);
			}
		}
	} catch (ERR) {
		nlapiLogExecution('ERROR', 'Error Occurred Is: ', ERR);
	}
}


function _logValidation(value) {
	if (value != null && value != '' && value != undefined && value.toString() != 'NaN' && value != NaN) {
		return true;
	} else {
		return false;
	}
}
