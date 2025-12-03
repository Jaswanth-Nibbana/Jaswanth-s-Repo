
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/runtime', 'N/ui/serverWidget'],
    /**
 * @param{runtime} runtime
 */
    (runtime, serverWidget) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            var newRecord = scriptContext.newRecord;
            var form = scriptContext.form;
            var userObj = runtime.getCurrentUser();
            var userRole = userObj.role;
            var currRec = scriptContext.newRecord;
            var restrictFields = ['customform','customer','tranid', 'currency', 'exchangerate', 'aracct', 'paymentmethod', 'checknum', 'undepfunds', 'trandate', 'postingperiod', 'memo', 'generatetranidonsave', 'subsidiary', 'department', 'custbody24', 'custbody_zeta_cleared_transaction', 'custbody_zeta_opp_name', 'custbody_celigo_sfnc_salesforce_id', 'payment','autoapply']

            var restrictedLineFlds = ['apply', 'amount', 'disc']
            if (userRole == 1046){

                if (scriptContext.type == 'create') {
                    throw 'You are not allowed to create Customer Payment directly';
                }

                if(scriptContext.type == 'edit') {
                    var inlineHtml = form.addField({
                        id: 'custpage_hide_buttons',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: 'Inline HTML'
                    });
    
                    // JavaScript code as a string to hide both buttons
                    var scriptString = `
                    <script>
                        document.addEventListener('DOMContentLoaded', function() { 
                            var cancelReturnButton = document.getElementById('payall');
                            var approveReturnButton = document.getElementById('autoapply');
                            var secCancelBtn = document.getElementById('clear');
                            var secApprBtn = document.getElementById('customize');
    
                            if (cancelReturnButton) {
                                cancelReturnButton.style.display = 'none';
                            }
                            if (approveReturnButton) {
                                approveReturnButton.style.display = 'none';
                            }
                            if (secCancelBtn) {
                                secCancelBtn.style.display = 'none';
                            }
                            if (secApprBtn) {
                                secApprBtn.style.display = 'none';
                            }
                        });
                    </script>`;
    
                    // Set the value of the inline HTML field to your script
                    inlineHtml.defaultValue = scriptString;
                }
                
                for (var i = 0; i < restrictFields.length; i++) {

                    var fieldId = restrictFields[i];
                    var headerFld = form.getField({
                        id: fieldId
                    });
                    if (headerFld) {
                        headerFld.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.DISABLED
                        });
                    }
                }

                var itemLines = currRec.getLineCount({
                    sublistId: 'apply'
                });
                var itemSublist = form.getSublist({
                    id: 'apply'
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
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            var currRec = scriptContext.newRecord;
            var oldRec = scriptContext.oldRecord;
            var executionContext = runtime.executionContext;
            var userObj = runtime.getCurrentUser();
            var userRole = userObj.role;
            var restrictHeaderFields = ['customform','customer','tranid', 'currency', 'exchangerate', 'aracct', 'paymentmethod', 'checknum', 'undepfunds', 'trandate', 'postingperiod', 'memo', 'generatetranidonsave', 'subsidiary', 'department', 'custbody24', 'custbody_zeta_cleared_transaction', 'custbody_zeta_opp_name', 'custbody_celigo_sfnc_salesforce_id', 'payment','autoapply']

            var restrictLineFields = ['apply', 'amount', 'disc']

            if (userRole == 1046 && executionContext === runtime.ContextType.CSV_IMPORT){

                restrictHeaderFields.forEach(function (fieldId) {
                    var oldValue = oldRec.getValue({ fieldId: fieldId });
                    var newValue = currRec.getValue({ fieldId: fieldId });
    
                    if (oldValue !== newValue) {
                        throw new Error("You are not allowed to update field '" + fieldId + "' via CSV Import.");
                    }
                });

                var lineCount = currRec.getLineCount({ sublistId: 'apply' });

                for (var i = 0; i < lineCount; i++) {
                    restrictLineFields.forEach(function (fieldId) {
                        var oldValue = oldRec.getSublistValue({ sublistId: 'apply', fieldId: fieldId, line: i }) || "";
                        var newValue = currRec.getSublistValue({ sublistId: 'apply', fieldId: fieldId, line: i }) || "";

                        if (oldValue !== newValue) {
                            throw new Error("You are not allowed to update field '" + fieldId + "' in Line " + (i + 1) + " via CSV Import.");
                        }
                    });
                }
            }

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {

        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
