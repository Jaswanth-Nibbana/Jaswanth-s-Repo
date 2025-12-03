/**
 * @NApiVersion 2.1
 */
define(['N/currentRecord', 'N/record', 'N/runtime', 'N/ui/dialog', 'N/url', 'N/search'],

    (currentRecord, record, runtime, dialog, url, search) => {

        const sendInvoiceBlast = () => {
            var currRec = currentRecord.get();
            var lineCount = currRec.getLineCount({
                sublistId: 'custsublist_inv'
            });
            var consEmailPerCust = currRec.getValue({
                fieldId: 'custpage_consemailpercust'
            })
            var zipcheck = false;
            if(consEmailPerCust){
                zipcheck = currRec.getValue({
                    fieldId: 'custpage_zipfile'
                })
            }
            console.log("zipcheck ", zipcheck)
            console.log("consEmailPerCust ", consEmailPerCust)
            var emailTemplate = currRec.getValue({
                fieldId: 'custpage_emailtemplate'
            })
            var invalidEmailsObj = {
                "To emails": [],
                "CC emails": [],
                "total": []
            };
            var invBlastArr = [];
            for (var i = 0; i < lineCount; i++) {

                var isSelected = currRec.getSublistValue({
                    sublistId: 'custsublist_inv',
                    fieldId: 'custpage_select',
                    line: i
                });

                if (isSelected) {
                    var cust = currRec.getSublistValue({
                        sublistId: 'custsublist_inv',
                        fieldId: 'custpage_customer',
                        line: i
                    });
                    var invIntId = currRec.getSublistValue({
                        sublistId: 'custsublist_inv',
                        fieldId: 'custpage_invinternalid',
                        line: i
                    });
                    var toEmailIds = currRec.getSublistValue({
                        sublistId: 'custsublist_inv',
                        fieldId: 'custpage_emailto',
                        line: i
                    });
                    var ccEmailIds = currRec.getSublistValue({
                        sublistId: 'custsublist_inv',
                        fieldId: 'custpage_emailcc',
                        line: i
                    })
                    var invoiceNo = currRec.getSublistValue({
                        sublistId: 'custsublist_inv',
                        fieldId: 'custpage_invref',
                        line: i
                    })
                    console.log("toEmailIds ", toEmailIds)
                    console.log("ccEmailIds ", ccEmailIds)
                    var to_email_list = toEmailIds.split(/[\s;,]+/).filter(Boolean);
                    var cc_list = ccEmailIds.split(/[\s;,]+/).filter(Boolean);
                    var combined_list = to_email_list.concat(cc_list);
                    console.log("combined_list ", combined_list)
                    var unique_list = [...new Set(combined_list)];
                    const totalEmails = unique_list.length;
                    console.log("combined_list length ", totalEmails)
                    if (totalEmails > 10){
                        invalidEmailsObj["total"].push(i + 1);
                    }

                    function validateEmail(email) {
                        var re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                            
                        return re.test(email);
                    }
                    function validateMultipleEmails(emailsString) {
                        var emails = emailsString.split(/[\s;,]+/).filter(Boolean);
                        return emails.map(email =>validateEmail(email.trim()));
                    }
                    var validTo = validateMultipleEmails(toEmailIds)
                    console.log("validTo ", validTo)
                    var validCc = validateMultipleEmails(ccEmailIds)
                    console.log("validCc ", validCc)
                    if (validTo.includes(false)) {
                        invalidEmailsObj["To emails"].push(invoiceNo);
                    }
                    if (validCc.includes(false)){
                        invalidEmailsObj["CC emails"].push(invoiceNo);
                    }

                    if (consEmailPerCust) {
                        console.log("invBlastArr", invBlastArr)
                        var customerIndex = invBlastArr.findIndex(item => item.cust === cust && item.toemailids === toEmailIds.replace(/\s+/g, '') && item.ccemailids === ccEmailIds.replace(/\s+/g, ''));
                        
                        if (customerIndex !== -1) {
                            // Customer exists, add the invoice number to the existing array
                            invBlastArr[customerIndex].invIds.push(invIntId);
                        } else {
                            // Customer doesn't exist, create a new object
                            invBlastArr.push({
                                "cust": cust,
                                "emailtemplate": emailTemplate,
                                "invIds": [invIntId],
                                "toemailids": toEmailIds.replace(/\s+/g, ''),
                                "ccemailids": ccEmailIds.replace(/\s+/g, '')
                            });
                        }

                    } else {
                        invBlastArr.push({
                            "cust": cust,
                            "emailtemplate": emailTemplate,
                            "invIds": [invIntId],
                            "toemailids": toEmailIds.replace(/\s+/g, ''),
                            "ccemailids": ccEmailIds.replace(/\s+/g, '')
                        })
                    }
                }
            }
            console.log("invBlastArr", invBlastArr)

            if (invBlastArr.length>0){
                var toEmailsLength = invalidEmailsObj["To emails"];
                var ccEmailsLength = invalidEmailsObj["CC emails"];
                var combinedEmails = invalidEmailsObj["total"];
                if (toEmailsLength.length > 0 || ccEmailsLength.length > 0) {
                    dialog.alert({
                        title: "Validation Error",
                        message: "Invalid emails have been detected in the selected invoices. Please correct them and resubmit." + "<br>The issues are found as follows: <br>In the To field: lines - " + toEmailsLength.join(", ") + "<br> In the Cc field: lines - " + ccEmailsLength.join(", ")
                    });
                    return false;
                } else if (combinedEmails.length > 0) {
                    dialog.alert({
                        title: "Validation Error",
                        message: "One or more of the selected invoices contain(s) more than 10 recipients (including both To and CC).<br>This issue is identified in the following line(s): " + combinedEmails.join(", ")
                    });

                } else {
                    var options = {
                        title: "Confirmation Required",
                        message: "Are you sure you want to send the Invoice emails? Press OK to confirm or Cancel to abort."
                    };
                    function success(result) {
                        console.log("Success with value " + result);
                        if (result) {

                            invBlastArr = invBlastArr.map(entry => ({
                                ...entry,
                                "zipcheck": zipcheck
                            }));
                            console.log(invBlastArr);

                            var userObj = runtime.getCurrentUser();

                            //create custom Record
                            var bgProcessorRec = record.create({
                                type: 'customrecord_nc_ib_backgroundprocessor',
                            });
                            bgProcessorRec.setValue({
                                fieldId: 'custrecord_nc_ib_requestor',
                                value: userObj.id
                            });
                            bgProcessorRec.setValue({
                                fieldId: 'custrecord_nc_ib_data',
                                value: JSON.stringify(invBlastArr)
                            })
                            var bgRecId = bgProcessorRec.save();
                            console.log('bgRecId', bgRecId);

                            var confOptions = {
                                title: "Invoice Blast Initiated",
                                message: "Your Invoice Blast job has been successfully initiated. You will receive a notification once the job is completed."
                            };
                            function confSuccess(result) {
                                console.log('Success with value ' + result);
                                window.onbeforeunload = null;
                                window.location.reload();
                            }
                            function confFailure(reason) {
                                console.log('Failure: ' + reason);
                            }

                            dialog.alert(confOptions).then(confSuccess).catch(confFailure);

                        } else {
                            return false
                        }
                    }
                    function failure(reason) {
                        console.log("Failure: " + reason);
                    }
                    dialog.confirm(options).then(success).catch(failure);
            }
            }else{
                dialog.alert({
                    title: 'Important',
                    message: 'No lines have been selected.'
                });
            }
            
        }

        return { sendInvoiceBlast }

    });

