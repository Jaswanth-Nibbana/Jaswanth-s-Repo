/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/runtime', 'N/search', 'N/url', 'N/email', 'N/record', 'N/file', 'N/compress'],

    (runtime, search, url, email, record, file, compress) => {

        function generateEmailBodyOnEdit(context, nsDomain, recId, entityId, entityName, changes, userName) {
            var action = context === 'create' ? 'created' : 'edited';
            var customerRecordURL = "https://" + nsDomain + "/app/common/entity/vendor.nl?id=" + recId;
            var emailBody = "<html><body>";
            emailBody += "<p>Hi,</p>";
            emailBody += "<p>The vendor record has been " + action + " by " + userName + " and requires your approval. - " + entityId + " " + entityName + "</p>";
            emailBody += '<p>View ' + action.charAt(0).toUpperCase() + action.slice(1) + ' Record: <a href="' + customerRecordURL + '">Vendor Record</a></p>';
            emailBody += "<p>Please review and approve the changes.</p>";

            emailBody += "<p>Changes</p>";
            emailBody += '<table style="border-collapse: collapse; width: 100%; border: 2px solid #000;">';
            emailBody += '<thead>';
            emailBody += '<tr style="background-color: #0074d9; color: #ffffff;">';
            emailBody += '<th style="border: 1px solid #dddddd; text-align: left; padding: 12px;">Field Label</th>';
            // emailBody += '<th style="border: 1px solid #dddddd; text-align: left; padding: 12px;">Field ID</th>';
            emailBody += '<th style="border: 1px solid #dddddd; text-align: left; padding: 12px;">Old Value</th>';
            emailBody += '<th style="border: 1px solid #dddddd; text-align: left; padding: 12px;">New Value</th>';
            emailBody += '</tr>';
            emailBody += '</thead>';
            emailBody += '<tbody id="changesTableBody">';

            // Use a for loop to add data rows with alternating row colors
            for (var i = 0; i < changes.length; i++) {
                var bgColor = i % 2 === 0 ? '#f2f2f2' : '#ffffff'; // Alternate row colors
                emailBody += '<tr style="background-color: ' + bgColor + ';">';
                emailBody += '<td style="border: 1px solid #dddddd; text-align: left; padding: 12px;">' + changes[i].fieldLabel + '</td>';
                // emailBody += '<td style="border: 1px solid #dddddd; text-align: left; padding: 12px;">' + changes[i].fieldId + '</td>';
                emailBody += '<td style="border: 1px solid #dddddd; text-align: left; padding: 12px;">' + changes[i].oldValue + '</td>';
                emailBody += '<td style="border: 1px solid #dddddd; text-align: left; padding: 12px;">' + changes[i].newValue + '</td>';
                emailBody += '</tr>';
            }

            emailBody += '</tbody>';
            emailBody += '</table>';
            emailBody += "</body></html>";
            return emailBody;
        }

        function fetchVendorDetails(recId) {
            var attachments = []
            var entityId;
            var vendorSearchObj = search.create({
                type: "vendor",
                filters:
                    [
                        ["internalid", "anyof", recId]
                    ],
                columns:
                    [
                        "entityid",
                        search.createColumn({
                            name: "internalid",
                            join: "file"
                        })
                    ]
            });
            vendorSearchObj.run().each(function (result) {

                entityId = result.getValue('entityid')
                var attachmentId = result.getValue(search.createColumn({
                    name: "internalid",
                    join: "file"
                }))
                if (attachmentId)
                    attachments.push(file.load({ id: attachmentId }))

                return true;
            });
            log.debug('Entity Id', entityId);

            var retObj = {
                entityid: entityId,
                attachments: attachments
            }

            return retObj

        }

        function compressFilesToZip(files) {
            var archiver = compress.createArchiver();
            
            // Add each file to the zip archive
            files.forEach(function(f) {
                archiver.add({
                    file: f,
                    name: f.name // Use the original file name
                });
            });
            
            // Archive the files and return the zip file (NetSuite file object)
            var zipFile = archiver.archive({
                name: 'attachments.zip',
                fileType: file.Type.ZIP
            });

            return zipFile;
        }

        function sendMail(userId, supervisorId, subject, emailBody, attachments, bodyWithoutAttach) {
            var totalSize = 0;
            attachments.forEach(function (attachmentFile) {
                totalSize += attachmentFile.size;
            });

            if (totalSize > 10 * 1024 * 1024) {
                // Compress files into a zip
                var zipFile = compressFilesToZip(attachments);

                // Check if the zip file is still greater than 10MB or if total message size exceeds 15MB
                if (zipFile.size > 10 * 1024 * 1024 || (zipFile.size + emailBody.length) > 15 * 1024 * 1024) {
                    // Send email without attachment, stating file size limitation
                    email.send({
                        author: userId,
                        recipients: supervisorId,
                        subject: subject,
                        body: bodyWithoutAttach
                    });
                    log.debug('Email sent without attachments due to file size limit.');
                } else {
                    // Attach zip file and send email
                    email.send({
                        author: userId, // System user
                        recipients: supervisorId,
                        subject: subject,
                        body: emailBody,
                        attachments: [zipFile]
                    });
                    log.debug('Email sent with zip file attachment.');
                }
            } else {
                // If total size is under 10MB, check if overall message size is within 15MB limit
                if (totalSize + emailBody.length <= 15 * 1024 * 1024) {
                    email.send({
                        author: userId,
                        recipients: supervisorId,
                        subject: subject,
                        body: emailBody,
                        attachments: attachments
                    });
                    log.debug('Email sent with attachments.');
                } else {
                    // Send email without attachments if total message size exceeds 15MB
                    email.send({
                        author: userId,
                        recipients: supervisorId,
                        subject: subject,
                        body: bodyWithoutAttach
                    });
                    log.debug('Email sent without attachments due to total message size limit.');
                }
            }
        }

        function emailBodyWithoutAttachment(userName, entityId, nsDomain, recId, limitMessage, entityName, userName, changes) {
            var customerRecordURL = "https://" + nsDomain + "/app/common/entity/vendor.nl?id=" + recId;
            var emailBody = "<html><body>";
            emailBody += "<p>Hi,</p>";
            emailBody += "<p>The vendor record has been " + "Edited" + " by " + userName + " and requires your approval. - " + entityId + " " + entityName + "</p>";
            emailBody += '<p>View ' + "Edited" + ' Record: <a href="' + customerRecordURL + '">Vendor Record</a></p>';
            emailBody += "<p>Please review and approve the changes.</p>";
            emailBody += "<p>Changes</p>";
            emailBody += '<table style="border-collapse: collapse; width: 100%; border: 2px solid #000;">';
            emailBody += '<thead>';
            emailBody += '<tr style="background-color: #0074d9; color: #ffffff;">';
            emailBody += '<th style="border: 1px solid #dddddd; text-align: left; padding: 12px;">Field Label</th>';
            // emailBody += '<th style="border: 1px solid #dddddd; text-align: left; padding: 12px;">Field ID</th>';
            emailBody += '<th style="border: 1px solid #dddddd; text-align: left; padding: 12px;">Old Value</th>';
            emailBody += '<th style="border: 1px solid #dddddd; text-align: left; padding: 12px;">New Value</th>';
            emailBody += '</tr>';
            emailBody += '</thead>';
            emailBody += '<tbody id="changesTableBody">';
            // Use a for loop to add data rows with alternating row colors
            for (var i = 0; i < changes.length; i++) {
                var bgColor = i % 2 === 0 ? '#f2f2f2' : '#ffffff'; // Alternate row colors
                emailBody += '<tr style="background-color: ' + bgColor + ';">';
                emailBody += '<td style="border: 1px solid #dddddd; text-align: left; padding: 12px;">' + changes[i].fieldLabel + '</td>';
                // emailBody += '<td style="border: 1px solid #dddddd; text-align: left; padding: 12px;">' + changes[i].fieldId + '</td>';
                emailBody += '<td style="border: 1px solid #dddddd; text-align: left; padding: 12px;">' + changes[i].oldValue + '</td>';
                emailBody += '<td style="border: 1px solid #dddddd; text-align: left; padding: 12px;">' + changes[i].newValue + '</td>';
                emailBody += '</tr>';
            }
            emailBody += '</tbody>';
            emailBody += '</table>';
            if (limitMessage) {
                emailBody += "<br/><p><strong>Note:</strong></p>";
                emailBody += "<p>The files associated with vendor - " + entityId + " " + entityName + " exceed the 10MB size limit. Due to system limitations, attachments could not be included.</p>";
                emailBody += "<p>Please review the files directly in the Vendor record.</p>";
            }
            emailBody += "</body></html>";
    
            return emailBody;
        }
        
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

            // Set default values for fields when creating a new record
            if (scriptContext.type === scriptContext.UserEventType.CREATE) {
                var newRecord = scriptContext.newRecord;
                const pendingapproval = '1';
                newRecord.setValue({ fieldId: 'custentity_zeta_approval_status_vendor', value: pendingapproval });
            }
            
            
        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            if (scriptContext.type === scriptContext.UserEventType.CREATE) {
                var user = runtime.getCurrentUser().id;
                var newRecord = scriptContext.newRecord;
                const pendingapproval = '1';
                newRecord.setValue({ fieldId: 'custentity_zeta_approval_status_vendor', value: pendingapproval });
                newRecord.setValue({ fieldId: 'custentity_zeta_vend_isdraft', value: true });
            }
        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {

            var newRecord = scriptContext.newRecord;
            var userObj = runtime.getCurrentUser();
            var userId = userObj.id;
            var userName = userObj.name;
            log.debug("userid", userId);
            var empLookUp = search.lookupFields({
                type: search.Type.EMPLOYEE,
                id: userId,
                columns: ['supervisor']
            });
            
            var supervisorId;
            if (empLookUp && empLookUp.supervisor && empLookUp.supervisor.length > 0) {
                supervisorId = empLookUp.supervisor[0].value;
                log.debug('supervisorId', supervisorId)
            }

            log.debug('supervisorId1', supervisorId)

            
            if (scriptContext.type === scriptContext.UserEventType.EDIT) {
                //fields on Zeta-Customer form
                var fieldData = [
                    { type: 'main_subtab', fieldId: 'isperson', fieldLable: 'Type', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'companyname', fieldLable: 'Company Name', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'legalname', fieldLable: 'LEGAL NAME', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'category', fieldLable: 'CATEGORY', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'comments', fieldLable: 'COMMENTS', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity21', fieldLable: 'AP COMMENTS', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_zeta_related_party', fieldLable: 'RELATED PARTY', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_zeta_name_related_party', fieldLable: 'RELATED PARTY IS:', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity20', fieldLable: 'CRITICAL', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_zeta_contract_doc_rec', fieldLable: 'CONTRACT DOCUMENT RECEIVED', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_zeta_contract_start_date', fieldLable: 'CONTRACT START DATE', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_zeta_contract_end_date', fieldLable: 'CONTRACT END DATE', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_zeta_renewal_date', fieldLable: 'RENEWAL DATE', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_zeta_customer_list', fieldLable: 'CUSTOMER LIST', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_zeta_vendor_banking_details', fieldLable: 'BANKING DETAILS', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_zeta_w8_received', fieldLable: 'W8 RECEIVED', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_zeta_w9_w8_received', fieldLable: 'W9 RECEIVED', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'taxidnum', fieldLable: 'TAX ID', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_zeta_indv_llc', fieldLable: 'INDIVIDUAL/SOLE PROPRIETOR OR SINGLE-MEMBER LLC', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_zeta_c_corporation', fieldLable: 'C CORPORATION', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_s_corporation', fieldLable: 'S CORPORATION', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_zeta_partnership', fieldLable: 'PARTNERSHIP', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_zeta_trust_estate', fieldLable: 'TRUST / ESTATE', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity23', fieldLable: 'LLC', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity24', fieldLable: 'OTHER', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'email', fieldLable: 'EMAIL', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'phone', fieldLable: 'PHONE', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'altphone', fieldLable: 'ALT. PHONE', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'fax', fieldLable: 'FAX', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'subsidiary', fieldLable: 'PRIMARY LEGAL ENTITY', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_zeta_subbu_vendor_record', fieldLable: 'SUB-BU', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_ava_usetaxassessment', fieldLable: 'ASSESS USE TAX ON BILL(AVATAX', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_zeta_deparment_vendor_record', fieldLable: 'DEPARTMENT', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_2663_email_address_notif', fieldLable: 'EMAIL ADDRESS FOR PAYMENT NOTIFICATION', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_zeta_account_manager', fieldLable: 'REQUESTOR', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_zeta_wire_details', fieldLable: 'WIRE DETAILS', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_zeta_vendor_pymt_method', fieldLable: 'VENDOR PAYMENT METHOD', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'accountnumber', fieldLable: 'ACCOUNT', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'expenseaccount', fieldLable: 'DEFAULT EXPENSE ACCOUNT', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'payablesaccount', fieldLable: 'DEFAULT PAYABLES ACCOUNT', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'currency', fieldLable: 'PRIMARY CURRENCY', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'terms', fieldLable: 'TERMS', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'is1099eligible', fieldLable: '1099 ELIGIBLE', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_zeta_gst_reg_no', fieldLable: 'GST REG NO.', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity18', fieldLable: 'MSME REG NO', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity19', fieldLable: 'MSME', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'emailpreference', fieldLable: 'EMAIL PREFERENCE', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'printoncheckas', fieldLable: 'PRINT ON CHECK AS', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'sendtransactionsvia', fieldLable: 'SEND TRANSACTIONS VIA', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity_2663_payment_method', fieldLable: 'EFT BILL PAYMENT', requireApproval: true },
                    { type: 'main_subtab', fieldId: 'custentity17', fieldLable: 'BANK NAME', requireApproval: true },
                    { type: 'sublist', sublistId: 'submachine', fieldId: 'subsidiary', fieldLable: 'Subsidiary', requireApproval: true },
                    { type: 'sublist', sublistId: 'submachine', fieldId: 'creditlimit', fieldLable: 'Credit Limit', requireApproval: true },
                    { type: 'sublist', sublistId: 'submachine', fieldId: 'taxitem', fieldLable: 'Tax Code', requireApproval: true },
                    { type: 'sublist', sublistId: 'currency', fieldId: 'currency', fieldLable: 'Currency', requireApproval: true },
                    { type: 'sublist', sublistId: 'addressbook', fieldId: 'defaultshipping', fieldLable: 'Default Shipping', requireApproval: true },
                    { type: 'sublist', sublistId: 'addressbook', fieldId: 'defaultbilling', fieldLable: 'Default Billing', requireApproval: true },
                    { type: 'sublist', sublistId: 'addressbook', fieldId: 'label', fieldLable: 'Label', requireApproval: true },
                    { type: 'subrecord', sublistId: 'addressbook', fieldId: 'addressbookaddress', subrecordFieldId: 'country', requireApproval: true },
                    { type: 'subrecord', sublistId: 'addressbook', fieldId: 'addressbookaddress', subrecordFieldId: 'attention', requireApproval: true },
                    { type: 'subrecord', sublistId: 'addressbook', fieldId: 'addressbookaddress', subrecordFieldId: 'addressee', requireApproval: true },
                    { type: 'subrecord', sublistId: 'addressbook', fieldId: 'addressbookaddress', subrecordFieldId: 'addrphone', requireApproval: true },
                    { type: 'subrecord', sublistId: 'addressbook', fieldId: 'addressbookaddress', subrecordFieldId: 'addr1', requireApproval: true },
                    { type: 'subrecord', sublistId: 'addressbook', fieldId: 'addressbookaddress', subrecordFieldId: 'addr2', requireApproval: true },
                    { type: 'subrecord', sublistId: 'addressbook', fieldId: 'addressbookaddress', subrecordFieldId: 'city', requireApproval: true },
                    { type: 'subrecord', sublistId: 'addressbook', fieldId: 'addressbookaddress', subrecordFieldId: 'state', requireApproval: true },
                    { type: 'subrecord', sublistId: 'addressbook', fieldId: 'addressbookaddress', subrecordFieldId: 'zip', requireApproval: true },
                    { type: 'subrecord', sublistId: 'addressbook', fieldId: 'addressbookaddress', subrecordFieldId: 'custrecord145', requireApproval: true },
                    //{ type: 'subrecord', sublistId: 'addressbook', fieldId: 'addressbookaddress', subrecordFieldId: 'override', requireApproval: true }
                ];

                var oldRecord = scriptContext.oldRecord;

                var approvalStatu = newRecord.getValue({ fieldId: 'custentity_zeta_approval_status_vendor' })
                if (approvalStatu == 3) {
                    return
                }
                var changes = [];

                for (var i = 0; i < fieldData.length; i++) {

                    var fieldInfo = fieldData[i];
                    var fieldId = fieldInfo.fieldId;
                    var fieldLabel = fieldInfo.fieldLable;
                    var requireApproval = fieldInfo.requireApproval;

                    if (requireApproval) {
                        if (fieldInfo.type === 'main_subtab') {
                            var oldValue = oldRecord.getValue({ fieldId: fieldId });
                            var newValue = newRecord.getValue({ fieldId: fieldId });
                            var isNonPrimitive = Array.isArray(oldValue) || typeof oldValue == 'object';


                            if (isNonPrimitive) {
                                // Convert old and new values to strings for comparison
                                var oldValuesString = JSON.stringify(oldValue);
                                var newValuesString = JSON.stringify(newValue);

                                if (oldValuesString !== newValuesString) {
                                    log.debug("old" + oldValuesString + "new" + newValuesString);
                                    changes.push({ fieldLabel: fieldLabel, fieldId: fieldId, oldValue: oldValue, newValue: newValue })
                                }
                            } else {
                                if (oldValue !== newValue) {
                                    log.debug("old" + oldValue + "new" + newValue);
                                    changes.push({ fieldLabel: fieldLabel, fieldId: fieldId, oldValue: oldValue, newValue: newValue })
                                }
                            }
                        }
                        else if (fieldInfo.type === 'sublist') {
                            var sublistId = fieldInfo.sublistId;
                            var numLines = newRecord.getLineCount({ sublistId: sublistId });
                            for (var line = 0; line < numLines; line++) {
                                var newValue = newRecord.getSublistValue({
                                    sublistId: sublistId,
                                    fieldId: fieldId,
                                    line: line
                                });
                                var oldValue = oldRecord.getSublistValue({
                                    sublistId: sublistId,
                                    fieldId: fieldId,
                                    line: line
                                }) || '';
                                var fieldLabel = 'Sublits Field - ' + fieldInfo.fieldLable;

                                if (oldValue !== newValue) {
                                    log.debug("old" + oldValue + "new" + newValue);
                                    changes.push({ fieldLabel: fieldLabel, fieldId: fieldId, oldValue: oldValue, newValue: newValue })
                                }
                            }
                        }
                        else if (fieldInfo.type === 'subrecord') {
                            var sublistId = fieldInfo.sublistId;
                            var subrecordFieldId = fieldInfo.subrecordFieldId
                            var numLines = newRecord.getLineCount({ sublistId: sublistId });
                            for (var line = 0; line < numLines; line++) {
                                var subrecord = newRecord.getSublistSubrecord({
                                    sublistId: sublistId,
                                    fieldId: fieldId,
                                    line: line
                                });
                                if (subrecord) {
                                    var newValue = subrecord.getValue({ fieldId: subrecordFieldId });
                                    var oldValue = oldRecord.getSublistSubrecord({
                                        sublistId: sublistId,
                                        fieldId: fieldId,
                                        line: line
                                    }).getValue({ fieldId: subrecordFieldId }) || '';
                                    if (newValue !== oldValue) {
                                        var fieldLabel = 'Sublits Field - ' + fieldInfo.subrecordFieldId;
                                        changes.push({ fieldLabel: fieldLabel, fieldId: fieldId, oldValue: oldValue, newValue: newValue })
                                    }
                                }
                            }
                        }
                    }
                }

                log.debug('changes', changes);
                if (changes.length > 0) {
                    var currentUser = runtime.getCurrentUser();
                    var currentUserId = currentUser.id;
                    //update record
                    var recId = record.submitFields({
                        type: record.Type.VENDOR,
                        id: newRecord.id,
                        values: {
                            'custentity_zeta_approval_status_vendor': 1, //pending approval
                            'custentity_modified_vendor': true,
                            'custentity_zeta_modifiedby':currentUserId,
                        }
                    });

                    var vendDetails = fetchVendorDetails(newRecord.id);
                    var entityId = vendDetails.entityid;
                    var attachments = vendDetails.attachments;

                    var entityName = ''
                    var isIndividual = newRecord.getValue({ fieldId: 'isperson' });
                    if (isIndividual == 'T' || isIndividual === true) {
                        entityName = newRecord.getValue({ fieldId: 'firstname' }) + ' ' + newRecord.getValue({ fieldId: 'lastname' })
                    } else {
                        entityName = newRecord.getValue({ fieldId: 'companyname' })
                    }

                    // Compose email content
                    var nsDomain = url.resolveDomain({
                        hostType: url.HostType.APPLICATION,
                    });

                    var isDraft = newRecord.getValue({ fieldId: 'custentity_zeta_vend_isdraft' });
                    if(isDraft == 'F' || isDraft === false){
                        if (supervisorId) {
                            var subject = 'Vendor modified - Approval Required : ' + entityId + ' ' + entityName
                            var emailBody = generateEmailBodyOnEdit('edit', nsDomain, newRecord.id, entityId, entityName, changes, userName)
                            var bodyWithoutAttach = emailBodyWithoutAttachment(userName, entityId, nsDomain, recId, true, entityName, userName, changes)
                            if (attachments.length > 0) {
                                sendMail(currentUserId, Number(supervisorId), subject, emailBody, attachments, bodyWithoutAttach)
                            } else {
                                email.send({
                                    author: currentUserId,
                                    recipients: supervisorId,
                                    subject: subject,
                                    body: emailBody,
                                });
                            }
                            log.debug('email sent(edit)')
                        } else {
                            log.audit('Supervisor Not Found', newRecord.id)
                        }
                    }
                    
                }
            }
        }

        return { beforeLoad, beforeSubmit, afterSubmit }

    });
