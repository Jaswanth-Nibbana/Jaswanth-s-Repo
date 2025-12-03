/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/ui/dialog', 'N/https'],
    /**
     * @param{search} search
     * @param{dialog} dialog
     */
    function (dialog, https) {

        function saveRecord(scriptContext) {
            var currentRecord = scriptContext.currentRecord;
            var apFinalCheck = currentRecord.getValue({
                fieldId: 'custbody_zeta_ap_final_check'
            })

            try {

                if (apFinalCheck) {
                    var inputObj = {
                        action: 'getRoles',
                        empId: apFinalCheck,
                    };
                    var suiteletURL = 'https://' + window.location.hostname + '/app/site/hosting/scriptlet.nl?script=customscript_zeta_su_adminutil&deploy=customdeploy_zeta_su_adminutil'
                    var response = https.post({
                        url: suiteletURL,
                        body: JSON.stringify(inputObj)
                    });

                    var responseBody = JSON.parse(response.body);
                    log.debug("responsebody ", responseBody)
                    // Check if the approvers are inactive
                    if (responseBody.length > 0) {
                        apManagerRole = "1041";
                        if (!responseBody.includes(apManagerRole)) {
                            dialog.alert({
                                title: 'Validation Error',
                                message: 'Only AP Manager is allowed in AP Final Check. Please update the value.'
                            });
                            currentRecord.setValue('custbody_zeta_ap_final_check', '');
                            return false;
                        }
                    }
                }

                return true;

            } catch (e) {
                log.error('Error', e);
            }
        }

        return {
            saveRecord: saveRecord
        };

    });
