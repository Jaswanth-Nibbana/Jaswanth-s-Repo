/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       18 July 2023     Ganesh Reddy
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * @appliedtorecord recordType
 *
 * @returns {Boolean} True to continue save, false to abort save
 */

function submitforapproval(){
	try{
		nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custentity_zeta_vend_isdraft', 'F');
		var suiteletURL = 'https://' + window.location.hostname + '/app/site/hosting/scriptlet.nl?script=customscript_zeta_su_vend_sendmail&deploy=customdeploy_zeta_su_vendor_sendmail&action=submitforapproval&recordId=' + nlapiGetRecordId();
        nlapiRequestURL(suiteletURL);
		window.location.reload(true);
	}catch (ERR){
		nlapiLogExecution('ERROR', 'Error Occurred Is: ', ERR);
	}
	
}

function approveButton() {
	try {
		nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custentity_zeta_approval_status_vendor', 2);
		var userId = nlapiGetUser();
		var venRec = nlapiLoadRecord('vendor', nlapiGetRecordId())
		var creatorID = venRec.getFieldValue('custentity_zeta_created_by');
		var modifierID = venRec.getFieldValue('custentity_zeta_modifiedby');
		var entityId = venRec.getFieldValue('entityid');
		var subject = 'Vendor Record Approved -' + entityId
		var url = 'https://' + window.location.hostname + '/app/common/entity/vendor.nl?id=' + nlapiGetRecordId()
		var emailBody = "<html><body>";
			emailBody += "<p>Hi,</p>";
			emailBody += "<p>The Vendor Record has been Approved " + entityId + "</p>";
			emailBody += '<p>View Approved Record: <a href="' + url + '">Vendor Record</a></p>';
			emailBody += "</body></html>";

		var recep;
		if (modifierID){
			recep = modifierID
		}else{
			recep = creatorID
		}
		nlapiSendEmail(userId, recep, subject, emailBody, null, null, null);
		window.location.reload(true);
	} catch (ERR) {
		nlapiLogExecution('ERROR', 'Error Occurred Is: ', ERR);
	}
}

function resubmitButton() {
	try {
		nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custentity_zeta_approval_status_vendor', 1);
		var suiteletURL = 'https://' + window.location.hostname + '/app/site/hosting/scriptlet.nl?script=customscript_zeta_su_vend_sendmail&deploy=customdeploy_zeta_su_vendor_sendmail&action=resubmit&recordId=' + nlapiGetRecordId();
        nlapiRequestURL(suiteletURL);

		window.location.reload(true);
	} catch (ERR) {
		nlapiLogExecution('ERROR', 'Error Occurred Is: ', ERR);
	}
}