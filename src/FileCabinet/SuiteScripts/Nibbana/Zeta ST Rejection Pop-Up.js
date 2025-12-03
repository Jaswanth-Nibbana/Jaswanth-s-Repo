/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       30 Aug 2018     Monica.Nukala
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function suitelet(request, response) {
	try {
		if (request.getMethod() == 'GET') {
			var recId = request.getParameter('recordId');
			var recType = request.getParameter('recordType');
			var form = nlapiCreateForm('Reason for Rejection');
			form.addField('custpage_rejectionreason', 'longtext', 'Rejection Reason').setMandatory(true);
			var internalIdField = form.addField('custpage_internalid', 'text', 'Internal ID');
			internalIdField.setDisplayType('hidden');
			internalIdField.setDefaultValue(recId);
			var recTypeField = form.addField('custpage_rectype', 'text', 'Record Type');
			recTypeField.setDisplayType('hidden');
			recTypeField.setDefaultValue(recType);
			//form.addButton('custpage_submit', 'Submit'/*, 'window.close()'*/);
			form.addSubmitButton('Submit');
			response.writePage(form);

		} else {
			var recIdReceived = request.getParameter('custpage_internalid');
			var recTypeReceived = request.getParameter('custpage_rectype');
			var fieldVal = request.getParameter('custpage_rejectionreason');
			if (recTypeReceived == 'vendorbill') {
				nlapiSubmitField('vendorbill', recIdReceived, ['custbody_nsts_gaw_rejection_reason', 'approvalstatus','custbody_zeta_email_followups'], [fieldVal, 3, ""]);
			} else if (recTypeReceived == 'creditmemo') {
				nlapiSubmitField('creditmemo', recIdReceived, ['custbody_nsts_gaw_rejection_reason', 'custbody_zeta_approval_status_cm'], [fieldVal, 3]);
			} else if (recTypeReceived == 'vendor') {
				var vendor_record = nlapiLoadRecord(recTypeReceived, recIdReceived);
				
				var vendor_name = vendor_record.getFieldValue('entityid');
				var createdby = vendor_record.getFieldValue('custentity_zeta_created_by');
				var modifierID = vendor_record.getFieldValue('custentity_zeta_modifiedby');
				nlapiSubmitField('vendor', recIdReceived, ['custentity_vendor_reject_reason', 'custentity_zeta_approval_status_vendor'], [fieldVal, 3]);
				var vendor_record_url = "https://3388294-sb1.app.netsuite.com/app/common/entity/vendor.nl?id=" + recIdReceived + ""
				var strVar = "";
				strVar += "<html>"
				strVar += "<body>";
				strVar += "<p>Hi<\/p>";

				strVar += "<p>This vendor " + vendor_name + " is Rejected.<\/p>";
				strVar += "<p>Rejection Reason <br>" + fieldVal + "</br><\/p>";
				strVar += "<p><\/p>";
				//strVar += "<p>please approve.<\/p>";
				strVar += "<p>ViewRecord : <br>" + vendor_record_url + ".</br><\/p>";

				strVar += "<\/body>";
				strVar += "<\/html>";
				var i_receipent = ['rkataram@zetaglobal.com', 'ganesh.r@inspirria.com', 'skodigudla@zetaglobal.com']
				var recep;
				if (modifierID){
					recep = modifierID
				}else{
					recep = creatorID
				}
				
				if (createdby) {
					nlapiSendEmail(21992, createdby, 'Rejection Reminder for Vendor ' + vendor_name + '', strVar, null, null, null, null);
				}
			} else if (recTypeReceived == 'invoice') {
				var invoice_record = nlapiLoadRecord(recTypeReceived, recIdReceived);

				var invoice_name = invoice_record.getFieldValue('tranid');
				var createdby = invoice_record.getFieldValue('custbody_cretd_by');


				nlapiSubmitField('invoice', recIdReceived, ['custbody_nsts_gaw_rejection_reason', 'approvalstatus'], [fieldVal, 3]);
				var vendor_record_url = "https://3388294-sb1.app.netsuite.com/app/accounting/transactions/custinvc.nl?id=" + recIdReceived + ""
				var strVar = "";
				strVar += "<html>"
				strVar += "<body>";
				strVar += "<p>Hi<\/p>";

				strVar += "<p>This Invoice " + invoice_name + " is Rejected.<\/p>";
				strVar += "<p>Rejection Reason <br>" + fieldVal + "</br><\/p>";
				strVar += "<p><\/p>";
				strVar += "<p>please approve.<\/p>";
				strVar += "<p>ViewRecord : <br>" + vendor_record_url + ".</br><\/p>";

				strVar += "<\/body>";
				strVar += "<\/html>";
				var i_receipent = [45426, createdby] //45426

				nlapiSendEmail(2565, i_receipent, 'Rejection Reminder for Invoice ' + invoice_name + '', strVar, null, null, null, null);
			}
			else if (recTypeReceived == 'customer') {
				var vendor_record = nlapiLoadRecord(recTypeReceived, recIdReceived);

				var vendor_name = vendor_record.getFieldValue('entityid');
				nlapiSubmitField('customer', recIdReceived, ['custentity_vendor_reject_reason', 'custentity_zeta_approval_status_vendor'], [fieldVal, 3]);
				var vendor_record_url = "https://3388294-sb1.app.netsuite.com/app/common/entity/custjob.nl?id=" + recIdReceived + ""
				var strVar = "";
				strVar += "<html>"
				strVar += "<body>";
				strVar += "<p>Hi<\/p>";
				strVar += "<p>This Customer " + vendor_name + " is Rejected.<\/p>";
				strVar += "<p>Rejection Reason <br>" + fieldVal + "</br><\/p>";
				strVar += "<p><\/p>";
				//strVar += "<p>please approve.<\/p>";
				strVar += "<p>ViewRecord : <br>" + vendor_record_url + ".</br><\/p>";
				strVar += "<\/body>";
				strVar += "<\/html>";
				var i_receipent = ['rkataram@zetaglobal.com', 'ganesh.r@inspirria.com', 'skodigudla@zetaglobal.com']

				nlapiSendEmail(2565, i_receipent, 'Rejection Reminder for Customer ' + vendor_name + '', strVar, null, null, null, null);
			}

			response.write('<html><body><script type="text/javascript">window.onunload = function(e){window.opener.location.reload();}; window.close();</script></body></html>');

		}
	} catch (ERR) {
		nlapiLogExecution('ERROR', 'Error Occurred Is: ', ERR);
	}
}
