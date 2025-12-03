/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       29 Jun 2018     Monica.Nukala
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
function zetaEmailButtonOnInvoice(type, form, request) {
	try {
		if (type == 'view') {
			form.setScript('customscript_zeta_cs_email_invoice'); // sets the script on the client side
			form.addButton('custpage_emailbutton', 'Email', 'emailInvoices()');
			// form.removeButton('credit');
		}
	} catch (ERR) {
		nlapiLogExecution('ERROR', 'Error Occurred In BL Is: ', ERR);
	}
}

function zetaEmailFormId(type, form, request) {
	try {
		//Invoice create mode updating the createdby field value. 
		if (type == 'create') {
			var invoiceId = nlapiGetRecordId(); // Get the ID of the current invoice
			var createdBy = nlapiGetUser(); // Get the ID of the user who created the invoice
			// nlapiLogExecution('debug','createdBy: ',createdBy);
			//   nlapiLogExecution('debug','invoiceId: ',invoiceId);
			// Update the "Created By" field of the invoice record
			//nlapiSubmitField('invoice', invoiceId, 'custbody_cretd_by', createdBy);
			var formId = nlapiGetFieldValue('customform');
			nlapiSetFieldValue('custbody_zeta_form_id', formId);
			nlapiSetFieldValue('custbody_cretd_by', createdBy);
		}

	} catch (ERR) {
		nlapiLogExecution('ERROR', 'Error Occurred In BS Is: ', ERR);
	}
}
