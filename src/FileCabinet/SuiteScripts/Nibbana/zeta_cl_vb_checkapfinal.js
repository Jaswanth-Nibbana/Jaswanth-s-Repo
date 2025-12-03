/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/ui/dialog', 'N/https', 'N/currentRecord'],
    /**
     * @param{record} record
     * @param{search} search
     * @param{dialog} dialog
     */
    function (record, search, dialog, https, currentRecord) {
        var mode = '';
        var apprArr;

        function fetchVendorDetails(recId) {
            var attachments = []
            var vendorBillSearchObj = search.create({
                type: "transaction",
                filters:
                    [
                        ["internalid", "anyof", recId],
                        "AND",
                        ["mainline", "is", "T"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            join: "file"
                        })
                    ]
            });
            vendorBillSearchObj.run().each(function (result) {

                var attachmentId = result.getValue(search.createColumn({
                    name: "internalid",
                    join: "file"
                }))
                if (attachmentId)
                    attachments.push(attachmentId)

                return true;
            });
            
            return attachments
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
            var currentRec = scriptContext.currentRecord;
            var requestor = currentRec.getValue({
                fieldId: 'custbody_nsts_gaw_tran_requestor'
            })
            var apReviewer = currentRec.getValue({
                fieldId: 'custbody_zeta_ap_reviewer'
            })
            var zetaAccountManager = currentRec.getValue({
                fieldId: 'custbody_zeta_account_manager'
            })
            var invoiceApprover = currentRec.getValue({
                fieldId: 'custbody34'
            })
            var fpaApprover = currentRec.getValue({
                fieldId: 'custbody_fpa_approver'
            })
            var apFinalCheck = currentRec.getValue({
                fieldId: 'custbody_zeta_ap_final_check'
            })
            var record = currentRecord.get();
            var fileIds = [];

            try {
                if (apReviewer === requestor || zetaAccountManager === requestor || invoiceApprover === requestor ||
                    fpaApprover === requestor || apFinalCheck === requestor) {
                    dialog.alert({
                        title: 'Validation Error',
                        message: 'One or more Approver fields have the same value as the Requestor. Please update the values.'
                    });
                    return false;
                }

                var approversArray = [apReviewer, zetaAccountManager, invoiceApprover, fpaApprover, apFinalCheck];
                if (mode == 'copy') {
                    if (approversArray.length > 0) {
                        var suiteletURL = 'https://' + window.location.hostname + '/app/site/hosting/scriptlet.nl?script=customscript_zeta_su_checkinactiveemp&deploy=customdeploy_zeta_su_checkinactiveemp'
                        var response = https.post({
                            url: suiteletURL,
                            body: JSON.stringify(approversArray)
                        });
                        var responseBody = JSON.parse(response.body);

                        // Check if the approver is inactive
                        if (responseBody.length > 0) {
                            dialog.alert({
                                title: 'Validation Alert',
                                message: 'Approver - ' + responseBody.toString() + ' are inactive. Please update the corresponding Approvers to reflect the new approvers'
                            });
                            return false;
                        }
                    }
                }

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
                            return false;
                        }
                    }
                }

                if (mode == 'create' || mode == 'edit'){
                    var lineCount = record.getLineCount({ sublistId: 'mediaitem' });
                    for (var i = 0; i < lineCount; i++) {
                        var fileId = record.getSublistValue({
                            sublistId: 'mediaitem',
                            fieldId: 'file',
                            line: i
                        });
                        if (fileId) {
                            fileIds.push(fileId);
                        }
                    }

                    log.debug("fielids ", fileIds)
                }

                return true;

            } catch (e) {
                log.error('Error', e);
            }
        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            validateField: validateField,
            saveRecord: saveRecord
        };

    });
