/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/runtime', 'N/search', 'N/url', 'N/email', 'N/record', 'N/file'],

    (runtime, search, url, email, record, file) => {

        function generateEmailBody(context, nsDomain, recId, entityid, entityName, changes, userName) {
            var action = context === 'create' ? 'created' : 'edited';
            var customerRecordURL = "https://" + nsDomain + "/app/common/entity/vendor.nl?id=" + recId;
            var emailBody = "<html><body>";
            emailBody += "<p>Hi,</p>";
            emailBody += "<p>The vendor record has been " + action + " by " + userName + " and requires your approval. - " + entityid + " " + entityName + "</p>";
            emailBody += '<p>View ' + action.charAt(0).toUpperCase() + action.slice(1) + ' Record: <a href="' + customerRecordURL + '">Vendor Record</a></p>';
            emailBody += "<p>Please review and approve the changes.</p>";
            emailBody += "<p>Changes</p>";

            emailBody += '<table style="border-collapse: collapse; width: 100%; border: 2px solid #000;">';
            emailBody += '<thead>';
            emailBody += '<tr style="background-color: #0074d9; color: #ffffff;">';
            emailBody += '<th style="border: 1px solid #dddddd; text-align: left; padding: 12px;">Field Label</th>';
            emailBody += '<th style="border: 1px solid #dddddd; text-align: left; padding: 12px;">Field ID</th>';
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
                emailBody += '<td style="border: 1px solid #dddddd; text-align: left; padding: 12px;">' + changes[i].fieldId + '</td>';
                emailBody += '<td style="border: 1px solid #dddddd; text-align: left; padding: 12px;">' + changes[i].oldValue + '</td>';
                emailBody += '<td style="border: 1px solid #dddddd; text-align: left; padding: 12px;">' + changes[i].newValue + '</td>';
                emailBody += '</tr>';
            }

            emailBody += '</tbody>';
            emailBody += '</table>';
            emailBody += "</body></html>";
            return emailBody;
        }
        

        var fieldData = [
            { type: 'main_subtab', fieldId: 'custrecord_2663_entity_bank_type', fieldLable: 'Type', requireApproval: true },
            { type: 'main_subtab', fieldId: 'custrecord_2663_entity_file_format', fieldLable: 'Payment File Format', requireApproval: true },
            { type: 'main_subtab', fieldId: 'custrecord_2663_entity_acct_no', fieldLable: 'Bank Account Number', requireApproval: true },
            { type: 'main_subtab', fieldId: 'custrecord_2663_entity_bank_no', fieldLable: 'Bank Number', requireApproval: true },
            { type: 'main_subtab', fieldId: 'custrecord_2663_entity_bank_code', fieldLable: 'Bank Account Type', requireApproval: true },
            { type: 'main_subtab', fieldId: 'custrecord_9572_subsidiary', fieldLable: 'Subsidiary', requireApproval: true }
        ];


        function fetchVendorDetails(recId) {
            var attachments = []
            var entityId, isPerson, companyName, firstName, lastName;
            var vendorSearchObj = search.create({
                type: "vendor",
                filters:
                    [
                        ["internalid", "anyof", recId]
                    ],
                columns:
                    [
                        "entityid",
                        "isperson",
                        "companyname",
                        "firstname",
                        "lastname",
                        "custentity_zeta_vend_isdraft",
                        search.createColumn({
                            name: "internalid",
                            join: "file"
                        })
                    ]
            });
            vendorSearchObj.run().each(function (result) {

                entityId = result.getValue('entityid');
                isPerson = result.getValue('isperson');
                companyName = result.getValue('companyname');
                firstName = result.getValue('firstname');
                lastName = result.getValue('lastname');
                isDraft = result.getValue('custentity_zeta_vend_isdraft')

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
                isperson : isPerson,
                companyname : companyName,
                firstname : firstName,
                lastname : lastName,
                isDraft : isDraft,
                attachments: attachments
            }

            return retObj

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
            var empLookUp = search.lookupFields({
                type: search.Type.EMPLOYEE,
                id: userId,
                columns: ['supervisor']
            });
            var supervisorId = empLookUp && empLookUp.supervisor[0].value;
            log.debug('supervisorId', supervisorId)

            var vendorId = newRecord.getValue({fieldId: 'custrecord_2663_parent_vendor'});
            var vendorRec = record.load({
                type:'vendor',
                id: vendorId
            })

            if (scriptContext.type === scriptContext.UserEventType.CREATE) {

                //Doing a lookup as the getValue is returning- to be generated, when creating a new record.
                var vendorId = newRecord.getValue({fieldId: 'custrecord_2663_parent_vendor'})
                if(vendorId){

                    var vendDetails = fetchVendorDetails(vendorId);
                    var entityId = vendDetails.entityid;
                    var attachments = vendDetails.attachments;
                    var isDraft = vendDetails.isDraft;
                    log.debug("isdraft ", isDraft);
                    var entityName = ''
                    var isIndividual = vendDetails.isperson;
                    if (isIndividual == 'T' || isIndividual === true) {
                        entityName = vendDetails.firstname + ' ' + vendDetails.lastname;
                    } else {
                        entityName = vendDetails.companyname;
                    }
    
                    var changes = [];
                    for (var i = 0; i < fieldData.length; i++) {
                        var fieldInfo = fieldData[i];
                        var fieldId = fieldInfo.fieldId;
                        var fieldLabel = fieldInfo.fieldLable;
                        var newValue = newRecord.getValue({ fieldId: fieldId });
                        changes.push({ fieldLabel: fieldLabel, fieldId: fieldId, oldValue: '', newValue: newValue })
                    }

                    if (changes.length > 0) {

                        //update record
                        var recId = record.submitFields({
                            type: record.Type.VENDOR,
                            id: vendorId,
                            values: {
                                'custentity_zeta_approval_status_vendor': 1, //pending approval
                                'custentity_modified_vendor': true,
                            }
                        });

                        // Compose email content
                        var nsDomain = url.resolveDomain({
                            hostType: url.HostType.APPLICATION,
                        });
                        
                        if(isDraft == false){
                            if (supervisorId) {
                                email.send({
                                    author: userId,
                                    recipients: Number(supervisorId),
                                    subject: 'Vendor modified - Approval Required : ' + entityId + ' ' + entityName,
                                    body: generateEmailBody('edit', nsDomain, newRecord.id, entityId, entityName, changes, userName),
                                    attachments: attachments
                                });
                                log.debug('email sent(edit)')
                            } else {
                                log.audit('Supervisor Not Found', newRecord.id)
                            }
                        }
                    }
                }
            }

            if (scriptContext.type === scriptContext.UserEventType.EDIT) {
                //fields on Zeta-Customer form

                var oldRecord = scriptContext.oldRecord;
                log.debug('old record', oldRecord);
                log.debug('new Record', newRecord);

                var approvalStatu = vendorRec.getValue({ fieldId: 'custentity_zeta_approval_status_vendor' })
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
                            log.debug('fieldId old and new ' + fieldId, oldValue + ' : ' + newValue)

                            var isNonPrimitive = Array.isArray(oldValue) || typeof oldValue == 'object';
                            if (isNonPrimitive) {
                                // Convert old and new values to strings for comparison
                                var oldValuesString = JSON.stringify(oldValue);
                                var newValuesString = JSON.stringify(newValue);

                                if (oldValuesString !== newValuesString) {
                                    changes.push({ fieldLabel: fieldLabel, fieldId: fieldId, oldValue: oldValue, newValue: newValue })
                                }
                            } else {
                                if (oldValue !== newValue) {
                                    changes.push({ fieldLabel: fieldLabel, fieldId: fieldId, oldValue: oldValue, newValue: newValue })
                                }
                            }
                        }
                    }
                }

                log.debug('changes', changes);
                if (changes.length > 0) {

                    var vendorId = newRecord.getValue({ fieldId: 'custrecord_2663_parent_vendor' })

                    //update record
                    var recId = record.submitFields({
                        type: record.Type.VENDOR,
                        id: vendorId,
                        values: {
                            'custentity_zeta_approval_status_vendor': 1, //pending approval
                            'custentity_modified_vendor': true,
                        }
                    });
                    var vendDetails = fetchVendorDetails(vendorId);
                    var entityId = vendDetails.entityid;
                    var attachments = vendDetails.attachments;
                    var isDraft = vendDetails.isDraft;
                    log.debug("isdraft ", isDraft);
                    var entityName = ''
                    var isIndividual = vendDetails.isperson;
                    if (isIndividual == 'T' || isIndividual === true) {
                        entityName = vendDetails.firstname + ' ' + vendDetails.lastname;
                    } else {
                        entityName = vendDetails.companyname;
                    }
                
                    // Compose email content
                    var nsDomain = url.resolveDomain({
                        hostType: url.HostType.APPLICATION,
                    });

    
                
                    if(isDraft == false){
                        log.debug("ok draft")
                        if (supervisorId) {
                            log.debug("ok superv")
                            email.send({
                                author: userId,
                                recipients: Number(supervisorId),
                                subject: 'Vendor modified - Approval Required : ' + entityId + ' ' + entityName,
                                body: generateEmailBody('edit', nsDomain, newRecord.id, entityId, entityName, changes, userName),
                                attachments: attachments
                            });
                            log.debug('email sent(edit)')
                        } else {
                            log.audit('Supervisor Not Found', newRecord.id)
                        }
                    }
                }
            }
        }

        return {  afterSubmit }

    });
