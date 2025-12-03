
/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Dec 2018     Monica.Nukala
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
 * */
function userEventBeforeLoad(type, form, request) {

	if (type == 'create' || type == 'copy') {
		
		nlapiLogExecution('DEBUG', 'flag Is: ', flag);
		var entityId = nlapiGetFieldValue('entity');
		if (entityId != null && entityId != '') {
			var approvalStatus = nlapiLookupField('vendor', entityId, 'custentity_zeta_approval_status_vendor');
			if ((approvalStatus != 2 || approvalStatus != '2')) {
				throw nlapiCreateError(
					'USER_ERROR',
					'Invalid entity selected.',
					true
				);
			}
		}
	}

	
	if (type == 'create') {

		var i_role = nlapiGetRole();
		var recordType = nlapiGetRecordType();
		nlapiLogExecution('debug', '')
		if ((recordType == 'vendorbill') && (i_role == '1041' || i_role == '1035' || i_role == '1051' || i_role == '1039')) {
			throw nlapiCreateError(
				'USER_ERROR',
				'Access Denied for bill creation.',
				true
			);
		}

		if ((recordType == 'creditmemo') && (i_role == '1048')) {
			throw nlapiCreateError(
				'USER_ERROR',
				'Access Denied for Creditmemo creation.',
				true
			);
		}
	}

}

/*function userEventBeforeSubmit(type, form, request){
	try{
		if(type == 'edit'){
			nlapiSetFieldValue('custentity_zeta_approval_status_vendor',1);
		}
	}catch(ERR){
		nlapiLogExecution('ERROR', 'Error Details Are: ', ERR);
	}

}*/