/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/runtime', 'N/ui/serverWidget', 'N/record'],

    (runtime, serverWidget, record) => {
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
            var currRec = scriptContext.newRecord;
            var form = scriptContext.form;
            var userObj = runtime.getCurrentUser();
            var userId = userObj.id;
            var role = userObj.role;
            var type = scriptContext.type;
            var createdFrom = currRec.getValue({ fieldId: 'createdfrom' });

            if (type == 'create') {
                currRec.setValue({
                    fieldId: 'custbody_cretd_by',
                    value: userId
                })

                if (createdFrom) {
                    var returnAuthRecord = record.load({
                        type: record.Type.VENDOR_RETURN_AUTHORIZATION,
                        id: createdFrom
                    });
                    var memoNo = returnAuthRecord.getValue({ fieldId: 'custbody_zeta_vra_cmno' });

                    if(memoNo){
                        currRec.setValue({
                            fieldId: 'tranid',
                            value: memoNo
                        })
                    }
                }

                if (!createdFrom && role != 3) {
                    throw 'Error: Direct creation of Vendor Credit is not allowed. Please create a Vendor Return Authorization first and then convert it to Vendor Credit. Contact Administrator if you need further assistance.'
                }
            }

            //Should not disable for admin
            if ((role != 3) && createdFrom) {

                //User should be able to update the trandate on create
                if (type == 'edit') {
                    form.getField({
                        id: 'trandate'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED
                    });

                    form.getField({
                        id: 'tranid'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED
                    });
                }

                // for header fields
                var restrictedHeaderFlds = ['entity', 'postingperiod','tranid', 'account', 'usertotal', 'exchangerate', 'custbody_wh_script_processed', 'custbody_zeta_cleared_transaction', 'custbody_auto_address', 'autoapply', 'billaddresslist', 'custbody29', 'custbody_15529_vendor_entity_bank', 'custbody_refno_originvoice', 'taxtotal', 'memo'];

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
            }
        }

        return {
            beforeLoad
        }

    });