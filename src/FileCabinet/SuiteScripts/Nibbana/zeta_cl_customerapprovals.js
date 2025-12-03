/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/ui/dialog', 'N/https'],

    function (dialog, https) {

        var type;

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
            type = scriptContext.mode

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
        function saveRecord(scriptContext) {
            var recObj = scriptContext.currentRecord;
            var arManager = recObj.getValue({
                fieldId: 'custentity_zeta_account_manager'
            })

            if (type == 'create') {
                if (!arManager) {
                    dialog.alert({
                        title: 'Validation Error',
                        message: 'Please select an AR Manager'
                    });

                    return false
                }
            }

            try {

                if (arManager) {
                    var inputObj = {
                        action: 'getRoles',
                        empId: arManager,
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
                        arManagerRole = "1048";
                        if (!responseBody.includes(arManagerRole)) {
                            dialog.alert({
                                title: 'Validation Error',
                                message: 'Only AR Manager is allowed for AR Manager Field. Please update the value.'
                            });
                            recObj.setValue('custentity_zeta_account_manager', '');
                            return false;
                        }
                    }
                }

            } catch (e) {
                log.error('Error', e);
            }
            return true
        }

        return {
            pageInit: pageInit,
            saveRecord: saveRecord
        };

    });
