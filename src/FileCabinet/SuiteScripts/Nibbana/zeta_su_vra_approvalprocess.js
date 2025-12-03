/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/email', 'N/record', 'N/ui/serverWidget', 'N/file', 'N/runtime', 'N/render', 'N/search', 'N/url'],
    /**
 * @param{email} email
 * @param{record} record
 * @param{serverWidget} serverWidget
 */
    (email, record, serverWidget, file, runtime, render, search, url) => {

        function fetchAttachmentDetails(recId) {
            var attachments = []
            var tranSearchObj = search.create({
                type: "transaction",
                filters:
                    [
                        ["internalid", "anyof", recId],
                        "AND",
                        ["mainline", "is", "T"]
                    ],
                columns:
                    [
                        /*"entityid", */
                        search.createColumn({
                            name: "internalid",
                            join: "file"
                        })
                    ]
            });
            tranSearchObj.run().each(function (result) {

                var attachmentId = result.getValue(search.createColumn({
                    name: "internalid",
                    join: "file"
                }))
                if (attachmentId)
                    attachments.push(file.load({ id: attachmentId }))

                return true;
            });


            return attachments

        }

        function sendEmail(fromId, toId, templateId, recId) {

            var mergeResult = render.mergeEmail({
                templateId: Number(templateId),
                transactionId: Number(recId),
            });

            log.debug('mergeResult', mergeResult);

            var attachments = fetchAttachmentDetails(recId);
            email.send({
                author: fromId,
                recipients: toId,
                subject: mergeResult.subject,
                body: mergeResult.body,
                attachments: attachments,
                relatedRecords: {
                    transactionId: Number(recId)
                }
            });

            log.debug('Email Sent')
        }

        const onRequest = (scriptContext) => {
            if (scriptContext.request.method === 'GET') {

                var recId = scriptContext.request.parameters.recid;
                var action = scriptContext.request.parameters.action;
                log.debug('recId', recId + ' : ' + action);
                var userObj = runtime.getCurrentUser();
                var userId = userObj.id;

                var rec = record.load({
                    type: 'vendorreturnauthorization',
                    id: recId
                });

                var apManager = rec.getValue('custbody_zeta_ap_final_check')
                var creator = rec.getValue('custbody_cretd_by')

                if (action == 'reSubmit') {

                    record.submitFields({
                        type: record.Type.VENDOR_RETURN_AUTHORIZATION,
                        id: recId,
                        values: {
                            custbody16: 1,
                            orderstatus: 'A'
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: false
                        }
                    });

                    var templateId = 155;
                    var fromId = userId;
                    var toId = apManager
                    sendEmail(fromId, toId, templateId, recId)

                } else if(action == 'approvewithnotes'){
                    var form = serverWidget.createForm({
                        title: 'Approval Notes'
                    });

                    // Add a hidden field to store the record ID
                    var recordIdField = form.addField({
                        id: 'custpage_recordid',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Record ID'
                    });
                    recordIdField.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });
                    recordIdField.defaultValue = recId

                    // Add a field to capture the rejection reason
                    form.addField({
                        id: 'custpage_notes',
                        type: serverWidget.FieldType.TEXTAREA,
                        label: 'Notes'
                    }).isMandatory = true;

                    // Add a submit button
                    form.addSubmitButton({
                        label: 'Submit'
                    });

                    scriptContext.response.writePage(form);
                } else {

                    var form = serverWidget.createForm({
                        title: 'Rejection Reason'
                    });

                    // Add a hidden field to store the record ID
                    var recordIdField = form.addField({
                        id: 'custpage_recordid',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Record ID'
                    });
                    recordIdField.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });
                    recordIdField.defaultValue = recId

                    // Add a field to capture the rejection reason
                    form.addField({
                        id: 'custpage_rejectionreason',
                        type: serverWidget.FieldType.TEXTAREA,
                        label: 'Rejection Reason'
                    }).isMandatory = true;

                    // Add a submit button
                    form.addSubmitButton({
                        label: 'Submit'
                    });

                    scriptContext.response.writePage(form);
                }

            } else {
                var recordId = scriptContext.request.parameters.custpage_recordid;
                var rejectionReason = scriptContext.request.parameters.custpage_rejectionreason;
                var notes = scriptContext.request.parameters.custpage_notes;
                var userObj = runtime.getCurrentUser();
                var userId = userObj.id;

                // Update the record with the rejection status
                if (recordId && rejectionReason) {

                    var vraRec = record.load({
                        type: 'vendorreturnauthorization',
                        id: recordId
                    });

                    var creator = vraRec.getValue('custbody_cretd_by')

                    record.submitFields({
                        type: 'vendorreturnauthorization',
                        id: recordId,
                        values: {
                            custbody16: 3,
                            custbody_nsts_gaw_rejection_reason: rejectionReason,
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: false
                        }
                    });

                    var fromId = userId
                    var toId = creator
                    var templateId = 154
                    sendEmail(fromId, toId, templateId, recordId)
                    scriptContext.response.write('<html><body><script type="text/javascript">window.onunload = function(e){window.opener.location.reload();}; window.close();</script></body></html>');
                }
                if(recordId && notes){
                    var vraRec = record.load({
                        type: 'vendorreturnauthorization',
                        id: recordId
                    });
                    var creator = vraRec.getValue('custbody_cretd_by')
                    record.submitFields({
                        type: 'vendorreturnauthorization',
                        id: recordId,
                        values: {
                            custbody_zeta_approvalnotes: notes,
                            custbody16: 2,
                            custbody_aprvd_by: userId,
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: false
                        }
                    });
                    var fromId = userId
                    var toId = creator
                    var templateId = 153
                    sendEmail(fromId, toId, templateId, recordId)
                    scriptContext.response.write(
                        '<html><body>' +
                        '<script type="text/javascript">' +
                        'if (window.opener) {' +
                            'window.opener.cancel_approve_order(' + recordId + ', "approve");' +
                        '}' +
                        'window.close();' +
                        '</script>' +
                        '</body></html>'
                    );
                }
            }
        }

        return { onRequest }

    });
