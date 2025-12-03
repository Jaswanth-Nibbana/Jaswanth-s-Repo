/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/https', 'N/ui/dialog'], function (https, dialog) {

    var mode = '';

    function getSublistApprovers(sublistId, recordObj) {

        var lineCount = recordObj.getLineCount({ sublistId: sublistId });
        var subBUApprovers = [];
        for (var line = 0; line < lineCount; line++) {
            // Retrieve the sub-bu approver ID from each line in the sublist
            var approverId = recordObj.getSublistValue({
                sublistId: sublistId,
                fieldId: 'custcol8',
                line: line
            });
            subBUApprovers.push(approverId)
        }

        return subBUApprovers;
    }

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
        mode = scriptContext.mode;
    }

    function saveRecord(scriptContext) {

        var currentRecord = scriptContext.currentRecord;
        console.log('mode' + mode);

        if (mode == 'copy' || mode == 'create') {
            // Check the "item" sublist
            var itemSublistBUApprovers = getSublistApprovers('item', currentRecord);
            var expenseSublistBUApprovers = getSublistApprovers('expense', currentRecord);

            var buApprovers = itemSublistBUApprovers.concat(expenseSublistBUApprovers);

            const uniqueBUApprovers = [...new Set(buApprovers)];


            if (uniqueBUApprovers.length > 0) {
                var suiteletURL = 'https://' + window.location.hostname + '/app/site/hosting/scriptlet.nl?script=customscript_zeta_su_checkinactiveemp&deploy=customdeploy_zeta_su_checkinactiveemp'
                var response = https.post({
                    url: suiteletURL,
                    body: JSON.stringify(uniqueBUApprovers)
                });
                var responseBody = JSON.parse(response.body);

                // Check if the approver is inactive for each line
                if (responseBody.length > 0) {
                    dialog.alert({
                        title: 'Validation Alert',
                        message: 'Sub BU Approver - ' + responseBody.toString() + ' are inactive. Please update the corresponding Sub BUs to reflect the new approvers'
                    });
                    return false;
                }
            }
        }
        return true; // Allow saving the record
    }

    return {
        pageInit: pageInit,
        saveRecord: saveRecord
    };
});