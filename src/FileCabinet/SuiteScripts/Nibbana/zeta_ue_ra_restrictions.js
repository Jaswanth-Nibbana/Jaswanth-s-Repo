/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/runtime', 'N/ui/serverWidget'],
    
    ( runtime, serverWidget) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the scriptContext.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            if (scriptContext.type === scriptContext.UserEventType.CREATE) {
	
                scriptContext.form.getField({
                    id: 'custbody_nsts_gaw_tran_requestor'
                }).updateDisplayType({
                    displayType: 'disabled'
                });

            }

            var currRec = scriptContext.newRecord;

            var itemLines = currRec.getLineCount({
                sublistId: 'item'
            });
            var form = scriptContext.form;

            var userObj = runtime.getCurrentUser();
            var role = userObj.role;

            var approvalStatus = currRec.getValue('custbody16');

            if (role != 3 && approvalStatus == 2) {

                log.debug("condition to disable fields entered");

                // for header fields
                var restrictedHeaderFlds = ['entity', 'postingperiod', 'billaddresslist', 'shipaddresslist', 'department', 'trandate', 'discountitem',
                    'discountrate', 'custbody_ava_taxinclude', 'custbody_ava_taxoverride', 'custbody_zeta_business_cm_app', 'custbody_zeta_ar_manager', 'custbody_zeta_final_check_approver'];

                for (var i = 0; i < restrictedHeaderFlds.length; i++) {

                    var fieldId = restrictedHeaderFlds[i];
                    var headerFld = form.getField({
                        id: fieldId
                    });
                    if (headerFld) {
                        headerFld.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.DISABLED
                        });
                    }
                }

                // for line fields
                var restrictedLineFlds = ['item', 'taxcode', 'taxrate1', 'class', 'custcol_cseg_department',
                    'department', 'price', 'custcol1', 'custcol2'];

                var itemLines = currRec.getLineCount({
                    sublistId: 'item'
                });
                var itemSublist = form.getSublist({
                    id: 'item'
                });

                for (var i = 0; i < itemLines; i++) { // for line fields

                    for (var j = 0; j < restrictedLineFlds.length; j++) {
                        var fieldId = restrictedLineFlds[j];
                        var lineFld = itemSublist.getField({
                            id: fieldId
                        });
                        if (lineFld) {
                            lineFld.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                        }
                    }
                }
            }

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the scriptContext.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
                var currRec = scriptContext.newRecord;
                var userObj = runtime.getCurrentUser();
                var role = userObj.role;
                var approvalStatus = currRec.getValue('custbody16');
                var newRecord = scriptContext.newRecord;
                var oldRecord = scriptContext.oldRecord;
                var restrictToEdit = false;

                if (role !== 3) {
                    if (approvalStatus ==='2' && runtime.executionContext == runtime.ContextType.USER_INTERFACE){
                        var itemLines = currRec.getLineCount({
                            sublistId: 'item'
                        });

                        for (var i = 0; i < itemLines; i++) {

                            var restrictedLineFlds = ['item', 'amount', 'quantity', 'taxcode', 'taxrate1', 'class', 'custcol_cseg_department',
                            'price', 'custcol1', 'custcol2'];

                            for (var j = 0; j < restrictedLineFlds.length; j++) {

                                var fieldId = restrictedLineFlds[j];
                                var newValue = newRecord.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: fieldId,
                                    line: i
                                });
                                
                                var oldValue = oldRecord.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: fieldId,
                                    line: i
                                });

                                if(fieldId == 'taxrate1'){
                                    if (oldValue !== newValue ) {
                                        if ((oldValue == "" || oldValue === null) && newValue == 0){

                                        }else{
                                            log.debug("old" + oldValue + "new" + newValue);
                                            restrictToEdit = true;
                                            break;
                                        }
                                    }
                                }else{
                                    if (oldValue !== newValue) {
                                        log.debug("old" + oldValue + "new" + newValue);
                                        restrictToEdit = true;
                                        break;
                                    }
                                }
                                
                            }
                        }
                    }
                }

                if(restrictToEdit){
                    throw 'Modifications are not allowed for GL fields once they have been approved.'
                }

                if (scriptContext.type === scriptContext.UserEventType.CREATE){
                    var itemLines = newRecord.getLineCount({
                        sublistId: 'item'
                    });
                    var zeroQuantityLines = 0;
                    for (var i = 0; i < itemLines; i++) {
                        var quantity = newRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            line: i
                        });
                
                        if (quantity == 0) {
                            zeroQuantityLines++;
                        }
                    }
                    if (zeroQuantityLines > 0) {
                        throw 'There are some lines with zero quantity. To ensure successful saving, please remove them.'
                    }
                }
        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the scriptContext.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {

        }

        return {beforeLoad,beforeSubmit}

    });
