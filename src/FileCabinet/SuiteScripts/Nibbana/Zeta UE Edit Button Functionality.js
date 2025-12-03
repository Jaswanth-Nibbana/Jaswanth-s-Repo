/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       01 Nov 2018     Monica.Nukala
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * @appliedtorecord recordType
 *
 * @returns {Boolean} True to continue save, false to abort save
 */
function userEventBeforeLoad(type, form, request) {

	try {
		if (type == 'view' || type == 'edit') {
			var status = nlapiGetFieldValue('approvalstatus');
			nlapiLogExecution('DEBUG', 'status Is: ', status);
			var role = nlapiGetRole();
			nlapiLogExecution('DEBUG', 'role Is: ', role);
			var user = nlapiGetUser();
			nlapiLogExecution('DEBUG', 'user Is: ', user);
			var requestor = nlapiGetFieldValue('custbody_nsts_gaw_tran_requestor');
			nlapiLogExecution('DEBUG', 'requestor Is: ', requestor);
			if ((status == 3 || status == '3') && (user != requestor)) {
				nlapiLogExecution('AUDIT', 'First IF Is: ');
				form.removeButton('edit');

			}/*else if((status == 1 || status == '1')&&(user == requestor)){
				nlapiLogExecution('AUDIT','Second IF Is: ');
				form.removeButton('edit');

			}*/
			if ((role == '1033' || role == 1033) && (status == 2 || status == '2')) {
				form.removeButton('edit');
			}
		}
	} catch (ERR) {
		nlapiLogExecution('ERROR', 'Error Occurred Is: ', ERR);
	}

	try {
		if (type == 'create' || type == 'copy') {
			var loggedInUser = nlapiGetContext().getUser();
			nlapiLogExecution('AUDIT', 'loggedInUser', loggedInUser);

			nlapiSetFieldValue('custbody_nsts_gaw_tran_requestor', loggedInUser);
		}
	} catch (E) {
		nlapiLogExecution('ERROR', 'Error Occurred In Create Mode Is: ', E);
	}

}
