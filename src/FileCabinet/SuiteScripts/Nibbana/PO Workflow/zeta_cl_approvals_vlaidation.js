/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/ui/dialog'],
/**
 * @param{currentRecord} currentRecord
 * @param{dialog} dialog
 */
function(currentRecord, dialog) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {
        var currRecord = scriptContext.currentRecord;
        if(scriptContext.mode === 'copy'){
            currRecord.setValue({
                fieldId: 'custbody_zeta_approvals_nxt_approvers',
                value: ''
            });
            
        }
    }

    function fieldChanged(scriptContext) {
        var currentRecord = scriptContext.currentRecord;
        var sublistId = scriptContext.sublistId;
        var fieldId = scriptContext.fieldId;
        var lineNum = scriptContext.lineNum;

        // List of monitored line-level fields
        var monitoredFields = ['class'];

        if(sublistId == "item" || sublistId == "expense"){
            //if field from monitoredFields is changed, show alert
            if(monitoredFields.indexOf(fieldId) !== -1){
                var fieldValue = currentRecord.getCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: fieldId
                });

                // Show dialog alert
                dialog.alert({
                    title: 'Field Changed',
                    message: 'You changed "' + fieldId + '" on line ' + (lineNum + 1) +
                             ' to: ' + fieldValue + '.\n\nThis record will require re-approval after save.'
                });
            }
        }
    }

    /**
     * Triggered when a new line is added to a sublist.
     */
    function validateInsert(context) {
        if (context.sublistId === 'item' || context.sublistId === 'expense') {
            dialog.alert({
                title: 'Approval Required',
                message: 'Adding a new line will require re-approval after save.'
            });
        }
        return true; // Allow insert
    }

    /**
     * Triggered when a line is deleted from a sublist.
     */
    function validateDelete(context) {
        if (context.sublistId === 'item' || context.sublistId === 'expense') {
            dialog.alert({
                title: 'Approval Required',
                message: 'Removing a line will require re-approval after save.'
            });
        }
        return true; // Allow delete
    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    
    function saveRecord(context) {
        var rec = currentRecord.get();

        var originalAmount = parseFloat(rec.getValue('custbody_zeta_approvals_tran_orig_ammt')) || 0;
        var poAmount = parseFloat(rec.getValue('total')) || 0;

        if (poAmount !== originalAmount) {
            dialog.alert({
                title: 'Approval Required',
                message: 'The total amount has changed from ' + originalAmount.toFixed(2) +
                         ' to ' + poAmount.toFixed(2) + '.\n\nThis record will require re-approval.'
            });
        }

        return true; // Allow save
    }


    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        validateInsert: validateInsert,
        validateDelete: validateDelete,
        saveRecord: saveRecord
    };
    
});
