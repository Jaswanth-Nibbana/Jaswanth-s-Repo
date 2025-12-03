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
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function emailInvoices(type){
	try{
		//alert('This button is created through script for Testing');
		if (confirm("Are you sure to send an email?")){
			var suiteletURL = nlapiResolveURL('SUITELET','customscript_zeta_st_email_cc' , 'customdeploy_zeta_st_email_cc');
			suiteletURL += '&recordId='+nlapiGetRecordId();
			suiteletURL += '&recordType='+ nlapiGetRecordType();
			//alert('suiteletURL'+suiteletURL);
			var resp = nlapiRequestURL(suiteletURL);
		}else{

		}


	}catch(ERR){
		nlapiLogExecution('ERROR', 'Error Occurred Is: ', ERR);
	}
}



