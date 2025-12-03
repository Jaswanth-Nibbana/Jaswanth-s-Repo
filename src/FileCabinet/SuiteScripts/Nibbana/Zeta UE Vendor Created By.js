/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       03 Jan 2019     Monica.Nukala
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

function beforeload_reject_button(type) {
	try {
		// if(type == 'edit')
		// {
		// //var recObject = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId(),{recordmode: 'dynamic'});
		// var approvalstatus = nlapiGetFieldValue('custentity_zeta_approval_status_vendor');

		// var user = nlapiGetContext().getUser();

		// if(approvalstatus == 2)
		// {
		// nlapiSetFieldValue('custentity_modified_vendor', 'T');

		// }
		// }

		if (type == 'view') {
			form.setScript('customscript_zeta_cli_vendor_re_submit'); // sets the script on the client side

			var approvalstatus = nlapiGetFieldValue('custentity_zeta_approval_status_vendor');
			var isDraft = nlapiGetFieldValue('custentity_zeta_vend_isdraft');
			var i_role = nlapiGetRole();

			if (isDraft=='T'){ // AP Analyst or Zeta Accountant
				if (i_role == '1033' || i_role == '3' || i_role == 1033 || i_role == 3 || i_role == '1029' || i_role == 1029){
					form.addButton('custpage_submit_forapproval', 'Submit for Approval', 'submitforapproval()');
				}
			}else{
            
				var i_role = nlapiGetRole();
				nlapiLogExecution('debug', 'i_role', i_role);
				if ((i_role == '1041' || i_role == '3' || i_role == 1041 || i_role == 3) && (approvalstatus == 1 || approvalstatus == '1')) {
					form.addButton('custpage_approvebutton', 'Approve', 'approveButton()');
					var suiteletUrl = nlapiResolveURL('SUITELET', 'customscript_zeta_st_reject_bill', 'customdeploy_zeta_st_reject_bill');
					suiteletUrl += '&recordId=' + nlapiGetRecordId();
					suiteletUrl += '&recordType=' + nlapiGetRecordType();
					var script = 'window.open(\''
						+ suiteletUrl
						+ '\', \'reject_alert\', \'width=600,height=400,resizable=yes,scrollbars=yes\');return true;';
					form.addButton('custpage_rejectionbutton', 'Reject', script);
				}
				
				if ((i_role == '1033' || i_role == '3' || i_role == 1033 || i_role == 3 || i_role == '1029' || i_role == 1029) && (approvalstatus == 3 || approvalstatus == '3')) {

					form.addButton('custpage_re_submit_button', 'Re-Submit', 'resubmitButton()');

				}
			}
			
		}
	} catch (ERR) {
		nlapiLogExecution('ERROR', 'Error Is: ', ERR);
	}
}

function userEventBeforeSubmit(type) {
	try {
		if (type == 'create') {
			var user = nlapiGetContext().getUser();
			nlapiSetFieldValue('custentity_zeta_created_by', user);
			nlapiSetFieldValue('custentity_zeta_approval_status_vendor', 1);

		}
	} catch (ERR) {
		nlapiLogExecution('ERROR', 'Error Is: ', ERR);
	}
}


function userEventafterSubmit(type) {
	/*try{
		if(type == 'edit')
		{
			var recObject = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId(),{recordmode: 'dynamic'});
			var approvalstatus = recObject.getFieldValue('custentity_zeta_approval_status_vendor');
			var user = nlapiGetContext().getUser();

			if( approvalstatus == 2)
			{
				recObject.setFieldValue('custentity_modified_vendor', 'T');
					nlapiSubmitRecord(recObject, true, true);
			}
		}
	}catch(ERR){
		nlapiLogExecution('ERROR', 'Error Is: ', ERR);
	}*/
}