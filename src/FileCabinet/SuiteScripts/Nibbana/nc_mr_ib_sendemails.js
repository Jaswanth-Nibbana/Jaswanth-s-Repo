/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/email', 'N/record', 'N/search', 'N/runtime', 'N/render'],
    /**
 * @param{email} email
 * @param{record} record
 * @param{search} search
 */
    (email, record, search, runtime, render) => {

        const getInputData = (inputContext) => {

            //get script param
            var scriptObj = runtime.getCurrentScript();
            var bgRecId = scriptObj.getParameter({ name: 'custscript_nc_ib_bgrecid' });

            var bgRec = record.load({
                type: 'customrecord_nc_ib_backgroundprocessor',
                id: bgRecId
            });
            var dataToProcess = JSON.parse(bgRec.getValue({
                fieldId: 'custrecord_nc_ib_data'
            }));
            log.debug('dataToProcess', dataToProcess);
            return dataToProcess;

        }

        const reduce = (reduceContext) => {
            try {
                log.debug('reduceContext', reduceContext);
                var key = reduceContext.key;
                var inpObj = JSON.parse(reduceContext.values);
                log.debug('inpObj', inpObj);

                var emailTemplate = inpObj.emailtemplate;
                var invIds = inpObj.invIds;
                var toEmails = inpObj.toemailids.split(/[\s;,]+/).filter(Boolean);
                var ccEmails = inpObj.ccemailids.split(/[\s;,]+/).filter(Boolean);

                toEmails = [...new Set(toEmails)];
                ccEmails = [...new Set(ccEmails)];
                // Remove emails from ccEmails that are already in toEmails
                ccEmails = ccEmails.filter(email => !toEmails.includes(email));
                
                log.debug('toEmails', toEmails);
                log.debug('ccEmails', ccEmails);
                log.debug("invIds length", invIds.length)
                //template rec lookup
                var templateFieldLookUp = search.lookupFields({
                    type: 'customrecord_nc_ib_invoiceemailtemplates',
                    id: emailTemplate,
                    columns: ['custrecord_nc_ib_template', 'custrecord_nc_ib_fromrecord']
                });
                var templateId = templateFieldLookUp.custrecord_nc_ib_template[0].value;
                var fromId = templateFieldLookUp.custrecord_nc_ib_fromrecord[0] && templateFieldLookUp.custrecord_nc_ib_fromrecord[0].value;
                log.debug('templateId : fromId', templateId + ' : ' + fromId)

                var attachments = [];
                for (const invId of invIds) {
                    let transactionFile = render.transaction({
                        entityId: Number(invId),
                        printMode: render.PrintMode.PDF
                    });

                    attachments.push(transactionFile);
                }

                if (emailTemplate == 13) {

                    //Internal
                    var scriptObj = runtime.getCurrentScript();
                    var bgRecId = scriptObj.getParameter({ name: 'custscript_nc_ib_bgrecid' });
                    var fieldLookUp = search.lookupFields({
                        type: 'customrecord_nc_ib_backgroundprocessor',
                        id: bgRecId,
                        columns: ['custrecord_nc_ib_requestor']
                    });
                    log.debug('fieldLookUp', fieldLookUp);
                    fromId = fieldLookUp.custrecord_nc_ib_requestor[0].value;
                    log.debug('fromId', fromId);

                    var mergeResult = render.mergeEmail({
                        templateId: Number(templateId),
                        transactionId: Number(invIds[0]),
                    });
                    log.debug('mergeResult', mergeResult);
                    log.debug('ccEmails', ccEmails);
                    log.debug('ccEmails lenght', ccEmails.length)
                    if (ccEmails.length == 0 || (ccEmails.length == 1 && ccEmails[0] == '')) {
                        log.debug('without cc')
                        email.send({
                            author: fromId,
                            recipients: toEmails,
                            subject: mergeResult.subject,
                            body: mergeResult.body,
                            attachments: attachments,
                        });
                    } else {
                        log.debug('with  cc')

                        email.send({
                            author: fromId,
                            recipients: toEmails,
                            cc: ccEmails,
                            subject: mergeResult.subject,
                            body: mergeResult.body,
                            attachments: attachments,
                        });
                    }
                    log.debug('Internal Email Sent')
                } else {
                    var mergeResult = render.mergeEmail({
                        templateId: Number(templateId),
                        transactionId: Number(invIds[0]),
                    });
                    log.debug('mergeResult', mergeResult);
                    
                    var custId;

                    var inv = invIds[0]
                    var invoiceSearchObj = search.create({
                        type: "invoice",
                        settings: [
                            { name: "consolidationtype", value: "ACCTTYPE" }
                        ],
                        filters: [
                            ["type", "anyof", "CustInvc"],
                            "AND",
                            ["internalid", "anyof", inv],
                            "AND",
                            ["mainline", "is", "T"]
                        ],
                        columns: [
                            search.createColumn({ name: "entity", label: "Name" })
                        ]
                    });
                    
                    var searchResults = invoiceSearchObj.run().getRange({ start: 0, end: 10 });
                    searchResults.forEach(function(result) {
                        custId = result.getValue({ name: "entity" });
                        log.debug("Customer Name", result.getValue({ name: "entity" }));
                    });
                    
                    log.debug('custId', custId);
                    if (invIds.length>1){
                        email.send({
                            author: fromId,
                            recipients: toEmails,
                            cc: ccEmails,
                            subject: mergeResult.subject,
                            body: mergeResult.body,
                            attachments: attachments,
                            relatedRecords: {
                                entityId: custId,
                            }
                        });
                    }else{
                        email.send({
                            author: fromId,
                            recipients: toEmails,
                            cc: ccEmails,
                            subject: mergeResult.subject,
                            body: mergeResult.body,
                            attachments: attachments,
                            relatedRecords: {
                                transactionId: Number(invIds[0])
                            }
                        });
                    }
                    
                    log.debug('External Email Sent')

                    //update record
                    for (const invId of invIds) {
                        var thirdID = record.submitFields({
                            type: record.Type.INVOICE,
                            id: Number(invId),
                            values: {
                                'custbody_nc_ib_lastemaildate': new Date()
                            }
                        });
                    }
                }
                
            } catch (e) {
                log.error('e', e);
                throw e;
            }
        }

        const summarize = (summaryContext) => {
            var failureCount = 0;
            summaryContext.reduceSummary.errors.iterator().each(function (key, error) {
                failureCount++;
                return true;
            });
            log.debug('Total Reduce Errors: ' + failureCount);
            //get script param
            var scriptObj = runtime.getCurrentScript();
            var bgRecId = scriptObj.getParameter({ name: 'custscript_nc_ib_bgrecid' });
            var bgRec = record.load({
                type: 'customrecord_nc_ib_backgroundprocessor',
                id: bgRecId
            });
            var requestor = bgRec.getValue({
                fieldId: 'custrecord_nc_ib_requestor'
            });
            log.debug('requestor', requestor);
            var dataToProcess = JSON.parse(bgRec.getValue({
                fieldId: 'custrecord_nc_ib_data'
            }));
            var totalCount = dataToProcess.length;
            let emailBody;
            if(failureCount>0){
                var successCount = totalCount-failureCount
                emailBody = `Invoice blast successfully completed.<br>Number of Successful Emails: ${successCount}<br>Number of Failed Emails: ${failureCount}`;
            }else{
                emailBody = `Invoice blast successfully completed. All invoices have been sent to the respective recipients\nNumber of Successful Emails are: ${totalCount}`;
            }
            log.debug('emailBody', emailBody);
            email.send({
                author: 2565,
                recipients: requestor,
                subject: 'Invoice Blast Successfull',
                body: emailBody,
            })
        }

        return { getInputData, reduce, summarize }

    });
