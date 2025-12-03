/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/runtime', 'N/record', 'N/search'],
    /**
 * @param{record} record
 * @param{search} search
 * @param{dialog} dialog
 */
    (runtime, record, search) => {

        const beforeLoad = (scriptContext) => {
            var userObj = runtime.getCurrentUser();
            var userId = userObj.id;
            var userRole = userObj.role;
            var type = scriptContext.type;
            var form = scriptContext.form;
            var currRecord = scriptContext.newRecord;
            var recType = currRecord.type;

            if((type == 'create' || type == 'copy') && recType == 'invoice' ){
                currRecord.setValue({
                    fieldId : 'custbody_nsts_gaw_created_by',
                    value: userId
                })
                currRecord.setValue({
                    fieldId : 'custbody_cretd_by',
                    value: userId
                })
                currRecord.setValue({
                    fieldId : 'custbody_aprvd_by',
                    value: ''
                })

                // Clear fields on copy
                if(type == 'copy'){
                    currRecord.setValue('custbody_zeta_collection_notes', '')
                    currRecord.setValue('custbody_zeta_fuel_ar_user_notes', '')
                    currRecord.setValue('custbody22', null)
                    currRecord.setValue('custbody_zeta_category_escalation', '')
                }
            }

            if(type == 'create' && recType == 'invoice' && userRole == 1046){
                throw 'Creation of invoices is not allowed for this role.'
            }
            
            if(type == 'view' && recType == 'invoice'){
                    var creditButton = form.getButton({ id: 'credit' });
                    if (creditButton) {
                        creditButton.isHidden = true;
                    }
            }
        }
        
        const beforeSubmit = (scriptContext) => {
            var currentRecord = scriptContext.newRecord;
            var customer = currentRecord.getValue({
                fieldId: 'entity'
            });
            log.debug('customer' + customer);

            if (customer) {
                var customerLookup = search.lookupFields({
                    type: search.Type.CUSTOMER,
                    id: customer,
                    columns: ['entitystatus']
                });
        
                var customerStatus = customerLookup.entitystatus[0].value;
        
                if (customerStatus === '16') {
                    throw Object.assign(new Error('New transactions cannot be initiated for inactive customers.'), {
                        name: 'ValidationError',
                        stack: null
                    });
                    
                }
            }
            return true; // Allow saving the record
        }

        return {beforeLoad, beforeSubmit}

    });