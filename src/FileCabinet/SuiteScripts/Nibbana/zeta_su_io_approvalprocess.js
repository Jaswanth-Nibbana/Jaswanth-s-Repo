/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/email', 'N/record', 'N/search', 'N/ui/serverWidget', 'N/runtime'],
    /**
 * @param{email} email
 * @param{record} record
 * @param{search} search
 * @param{serverWidget} serverWidget
 */
    (email, record, search, serverWidget, runtime) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {

            if (scriptContext.request.method === 'GET') {
                var recId = scriptContext.request.parameters.recid;
                var action = scriptContext.request.parameters.action;

                log.debug('recId', recId + ' : ' + action);
                var userObj = runtime.getCurrentUser();
                var userId = userObj.id;

                if (action == 'approve') {
                    record.submitFields({
                        type: record.Type.SALES_ORDER,
                        id: recId,
                        values: {
                            custbody_aprvd_by: userId,
                            custbody16: 2,
                            orderstatus: 'B'
                        }
                    });
                }
                /*else if (action == 'reject') {

                    var form = serverWidget.createForm({
                        title: 'Reject Reason'
                    });

                    var recordIdField = form.addField({
                        id: 'custpage_recordid',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Record ID'
                    });
                    recordIdField.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });
                    recordIdField.defaultValue = recId

                    form.addField({
                        id: 'custpage_reject_reason',
                        type: serverWidget.FieldType.TEXTAREA,
                        label: 'Reason'
                    });

                    form.addSubmitButton({
                        label: 'Submit'
                    });
                    scriptContext.response.writePage(form);
                }
                else if (action == 'reSubmit') {
                    record.submitFields({
                        type: record.Type.SALES_ORDER,
                        id: recId,
                        values: {
                            custbody16: 1
                        }
                    });
                }*/
            }
            /*else {
                var rejectReason = scriptContext.request.parameters.custpage_reject_reason;
                var recId = scriptContext.request.parameters.custpage_recordid;

                record.submitFields({
                    type: record.Type.SALES_ORDER,
                    id: recId,
                    values: {
                        custbody16: 3,
                        custbody43: rejectReason,
                        orderstatus: 'C'
                    }
                });
                
                scriptContext.response.write('<html><body><script type="text/javascript">window.onunload = function(e){window.opener.location.reload();}; window.close();</script></body></html>');
            }*/
        }

        return { onRequest }

    });
