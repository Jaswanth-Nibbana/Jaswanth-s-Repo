/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/runtime', 'N/record', 'N/ui/dialog', 'N/currentRecord'],

    function(runtime, record, dialog, currentRecord) {
    
        function pageInit(scriptContext) {
        var rec = currentRecord.get();
        var mode = scriptContext.mode;
        var curRec = scriptContext.currentRecord

        var returnAuthId = rec.getValue({ fieldId: 'createdfrom' });

        log.debug("returnAuthId", returnAuthId)
        
            if (returnAuthId) {

                var returnAuthRecord = record.load({
                    type: record.Type.VENDOR_RETURN_AUTHORIZATION,
                    id: returnAuthId
                });

                var tranDate = returnAuthRecord.getValue({ fieldId: 'trandate' });
                
                if(mode == "copy"){
                    try {
                        curRec.setValue('trandate', tranDate);
                        // Get the Approval Notes field value from the Vendor Return Authorization record
                        var approvalNotes = returnAuthRecord.getValue({ fieldId: 'custbody_zeta_approvalnotes' });
                        log.debug("approvalNotes ", approvalNotes)
                        // Display the Approval Notes in a dialog if it exists
                        if (approvalNotes) {
                            dialog.alert({
                                title: 'Approval Notes',
                                message: approvalNotes
                            });
                        }
                    } catch (e) {
                        log.debug('Error loading Vendor Return Authorization:', e);
                    }
                }
            }
    }
        
        function lineInit(scriptContext) {
            var userRole = runtime.getCurrentUser().role;
            var currRec = scriptContext.currentRecord;
            var createdFrom = currRec.getValue({ fieldId: 'createdfrom' });
            var restrictedLineFlds = ['account','amount', 'tax1amt', 'grossamt', 'taxcode', 'memo', 'class', 'department', 'custcol_cseg_department', 'custcol_cseg_cost_center', 'location', 'amortizationsched','amortizstartdate', 'amortizationenddate', 'custcol8', 'custcol_data_center', 'custcol_zeta_fuel_po', 'custcol_zeta_fuel_campaignno', 'custcol_zeta_fuel_agency', 'amortizationresidual', 'custcol_zeta_sales_tax'];

            if ((userRole != 3) && createdFrom) {
                var lineCount = currRec.getLineCount({
                    sublistId: 'expense'
                });
    
                for (var i = 0; i < lineCount; i++) {
                    for (var j = 0; j < restrictedLineFlds.length; j++) {
                        var fieldId = restrictedLineFlds[j];
                        var lineFld = currRec.getSublistField({
                            sublistId: 'expense',
                            fieldId: fieldId,
                            line: i
                        });
                        if (lineFld) {
                            lineFld.isDisabled = true;
                        }
                    }
                }
            }
        }
    
        return {
            pageInit: pageInit,
            lineInit: lineInit,
        };
        
    });