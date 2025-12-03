/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(['N/record', 'N/email', 'N/url', 'N/search', 'N/file', 'N/runtime'],
    /**
 * @param{record} record
 */
    (record, email, url, search, file, runtime) => {

        //fields on Zeta-Customer form
        var fieldData = [
            { type: 'main_subtab', fieldId: 'custentity2' },
            { type: 'main_subtab', fieldId: 'phone' },
            { type: 'main_subtab', fieldId: 'companyname' },
            { type: 'main_subtab', fieldId: 'entityid' },
            { type: 'main_subtab', fieldId: 'isperson' },
            { type: 'main_subtab', fieldId: 'entitystatus' },
            { type: 'main_subtab', fieldId: 'custentity_dba' },
            { type: 'main_subtab', fieldId: 'parent' },
            { type: 'main_subtab', fieldId: 'url' },
            { type: 'main_subtab', fieldId: 'altphone' },
            { type: 'main_subtab', fieldId: 'fax' },
            { type: 'main_subtab', fieldId: 'custentity3' },
            { type: 'main_subtab', fieldId: 'custentity5' },
            { type: 'main_subtab', fieldId: 'custentity6' },
            { type: 'main_subtab', fieldId: 'custentity10' },
            { type: 'main_subtab', fieldId: 'custentity9' },
            { type: 'main_subtab', fieldId: 'custentity11' },
            { type: 'main_subtab', fieldId: 'custentity12' },
            { type: 'main_subtab', fieldId: 'custentity13' },
            { type: 'main_subtab', fieldId: 'custentity15' },
            { type: 'main_subtab', fieldId: 'subsidiary' },
            { type: 'main_subtab', fieldId: 'custentity_esc_no_of_employees' },
            { type: 'main_subtab', fieldId: 'custentity_esc_annual_revenue' },
            { type: 'main_subtab', fieldId: 'custentity_2663_email_address_notif' },
            { type: 'main_subtab', fieldId: 'custentity_naw_trans_need_approval' },
            { type: 'main_subtab', fieldId: 'custentity_zeta_parent_company' },
            { type: 'main_subtab', fieldId: 'custentity_zeta_customer_type' },
            { type: 'main_subtab', fieldId: 'custentity_zeta_crm_1st_level_approver' },
            { type: 'main_subtab', fieldId: 'custentity_vendor_reject_reason' },
            { type: 'main_subtab', fieldId: 'comments' },
            { type: 'main_subtab', fieldId: 'custentity1' },
            { type: 'main_subtab', fieldId: 'custentity_zeta_vendor_list' },
            { type: 'main_subtab', fieldId: 'custentity_scaled_customer' },
            { type: 'main_subtab', fieldId: 'custentity_primary_key' },
            { type: 'main_subtab', fieldId: 'email' },
            { type: 'main_subtab', fieldId: 'custentity_esc_industry' },
            { type: 'main_subtab', fieldId: 'custentity_zeta_to_email' },
            { type: 'main_subtab', fieldId: 'custentity_zeta_cc_email' },
            { type: 'main_subtab', fieldId: 'custentity_zeta_family_group' },
            { type: 'main_subtab', fieldId: 'custentity_zeta_verticals' },
            { type: 'main_subtab', fieldId: 'custentity_celigo_sfnc_salesforce_id' },
            { type: 'main_subtab', fieldId: 'custentity_zeta_credit_check_details' },
            { type: 'main_subtab', fieldId: 'custentity_zeta_credit_check_date' },
            { type: 'main_subtab', fieldId: 'custentity_zeta_first_name' },
            { type: 'main_subtab', fieldId: 'custentity_zeta_last_name' },
            { type: 'main_subtab', fieldId: 'custentity_zeta_sales_tax_code' },
            { type: 'main_subtab', fieldId: 'custentity_zeta_tax_item' },
            { type: 'main_subtab', fieldId: 'custentity_zeta_acct_mgr' },
            { type: 'main_subtab', fieldId: 'accountnumber' },
            { type: 'main_subtab', fieldId: 'receivablesaccount' },
            { type: 'main_subtab', fieldId: 'draccount' },
            { type: 'main_subtab', fieldId: 'pricelevel' },
            { type: 'main_subtab', fieldId: 'currency' },
            { type: 'main_subtab', fieldId: 'terms' },
            { type: 'main_subtab', fieldId: 'creditholdoverride' },
            { type: 'main_subtab', fieldId: 'custentity14' },
            { type: 'main_subtab', fieldId: 'startdate' },
            { type: 'main_subtab', fieldId: 'enddate' },
            { type: 'main_subtab', fieldId: 'custentity7' },
            { type: 'main_subtab', fieldId: 'vatregnumber' },
            { type: 'main_subtab', fieldId: 'taxitem' },
            { type: 'main_subtab', fieldId: 'resalenumber' },
            { type: 'main_subtab', fieldId: 'taxable' },
            { type: 'main_subtab', fieldId: 'language' },
            { type: 'main_subtab', fieldId: 'numberformat' },
            { type: 'main_subtab', fieldId: 'negativenumberformat' },
            { type: 'main_subtab', fieldId: 'emailpreference' },
            { type: 'main_subtab', fieldId: 'printoncheckas' },
            { type: 'main_subtab', fieldId: 'isinactive' },
            { type: 'main_subtab', fieldId: 'custentity_zeta_ar_user_notes' },
            { type: 'main_subtab', fieldId: 'creditlimit' },
            { type: 'main_subtab', fieldId: 'custentity16' },
            { type: 'main_subtab', fieldId: 'custentity_zeta_collection_email' },
            { type: 'main_subtab', fieldId: 'custentity_zeta_collection_phone' },
            { type: 'main_subtab', fieldId: 'custentity_zeta_credit_hold' },
            { type: 'sublist', sublistId: 'salesteam', fieldId: 'employee' },
            { type: 'sublist', sublistId: 'salesteam', fieldId: 'salesrole' },
            { type: 'sublist', sublistId: 'salesteam', fieldId: 'isprimary' },
            { type: 'sublist', sublistId: 'salesteam', fieldId: 'contribution' },
            { type: 'sublist', sublistId: 'currency', fieldId: 'currency' },
            { type: 'sublist', sublistId: 'grouppricing', fieldId: 'group' },
            { type: 'sublist', sublistId: 'grouppricing', fieldId: 'level' },
            { type: 'sublist', sublistId: 'itempricing', fieldId: 'item' },
            { type: 'sublist', sublistId: 'itempricing', fieldId: 'level' },
            { type: 'sublist', sublistId: 'contactroles', fieldId: 'contact' },
            { type: 'sublist', sublistId: 'contactroles', fieldId: 'role' },
            { type: 'sublist', sublistId: 'addressbook', fieldId: 'defaultbilling' },
            { type: 'sublist', sublistId: 'addressbook', fieldId: 'defaultshipping' },
            { type: 'sublist', sublistId: 'addressbook', fieldId: 'isresidential' },
            { type: 'sublist', sublistId: 'addressbook', fieldId: 'label' },
            { type: 'subrecord', sublistId: 'addressbook', fieldId: 'addressbookaddress', subrecordfieldid: 'country' },
            { type: 'subrecord', sublistId: 'addressbook', fieldId: 'addressbookaddress', subrecordfieldid: 'attention' },
            { type: 'subrecord', sublistId: 'addressbook', fieldId: 'addressbookaddress', subrecordfieldid: 'addressee' },
            { type: 'subrecord', sublistId: 'addressbook', fieldId: 'addressbookaddress', subrecordfieldid: 'addrphone' },
            { type: 'subrecord', sublistId: 'addressbook', fieldId: 'addressbookaddress', subrecordfieldid: 'addr1' },
            { type: 'subrecord', sublistId: 'addressbook', fieldId: 'addressbookaddress', subrecordfieldid: 'addr2' },
            { type: 'subrecord', sublistId: 'addressbook', fieldId: 'addressbookaddress', subrecordfieldid: 'city' },
            { type: 'subrecord', sublistId: 'addressbook', fieldId: 'addressbookaddress', subrecordfieldid: 'state' },
            { type: 'subrecord', sublistId: 'addressbook', fieldId: 'addressbookaddress', subrecordfieldid: 'zip' },
            { type: 'subrecord', sublistId: 'addressbook', fieldId: 'addressbookaddress', subrecordfieldid: 'custrecord145' },
            { type: 'subrecord', sublistId: 'addressbook', fieldId: 'addressbookaddress', subrecordfieldid: 'override' }
        ];
        const AR_MANAGER_ROLE_ID = 1048;

        function generateEmailBody(context, nsDomain, recId, entityid, entityName) {
            var action = context === 'create' ? 'created' : 'edited';
            var customerRecordURL = "https://" + nsDomain + "/app/common/entity/custjob.nl?id=" + recId;
            var emailBody = "<html><body>";
            emailBody += "<p>Hi,</p>";
            emailBody += "<p>The customer record has been " + action + " and requires your approval. - " + entityid + " " + entityName + "</p>";
            emailBody += "<p>Please review and approve the " + action + " changes.</p>";
            emailBody += '<p>View ' + action.charAt(0).toUpperCase() + action.slice(1) + ' Record: <a href="' + customerRecordURL + '">Customer Record</a></p>';
            emailBody += "</body></html>";
            return emailBody;
        }

        function fetchAttachments(recId) {
            var attachments = []
            var entityId;
            var customerSearchObj = search.create({
                type: "customer",
                filters:
                    [
                        ["internalid", "anyof", recId]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            join: "file"
                        })
                    ]
            });
            customerSearchObj.run().each(function (result) {

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
            var newRecord = scriptContext.newRecord;
            var userObj = runtime.getCurrentUser();
            var execContext = runtime.executionContext;
            var role = userObj.role;
            scriptContext.form.getField({
                id: 'custentity_zeta_approval_status_vendor'
            }).updateDisplayType({
                displayType: 'disabled'
            });
            if (scriptContext.type === scriptContext.UserEventType.EDIT) {
                if (role!== 3) {
                    scriptContext.form.getField({
                        id: 'entitystatus'
                    }).updateDisplayType({
                        displayType: 'disabled'
                    });
                    scriptContext.form.getField({
                        id: 'isinactive'
                    }).updateDisplayType({
                        displayType: 'disabled'
                    });
                }

                if (role == AR_MANAGER_ROLE_ID && (execContext == runtime.ContextType.CSV_IMPORT || execContext == runtime.ContextType.USER_INTERFACE)) {
                    throw 'You do not have permissions to edit a customer record. Please contact your administrator.'
                }
            }

            // Set default values for fields when creating a new record
            if (scriptContext.type === scriptContext.UserEventType.CREATE) {
                const pendingApproval = '1';
                const customerInactive = '16';
                newRecord.setValue({ fieldId: 'custentity_zeta_approval_status_vendor', value: pendingApproval });
                newRecord.setValue({ fieldId: 'entitystatus', value: customerInactive });
                newRecord.setValue({ fieldId: 'isinactive', value: true });
                newRecord.setValue({ fieldId: 'custentity_zeta_created_by', value: userObj.id });

                if(role == AR_MANAGER_ROLE_ID){
                    throw 'You do not have permissions to create a customer record. Please contact your administrator.' 
                }
            }
        }

        const beforeSubmit = (scriptContext) => {

            if (scriptContext.type === scriptContext.UserEventType.CREATE) {

                var newRecord = scriptContext.newRecord;
                var arManager = newRecord.getValue({
                    fieldId: 'custentity_zeta_account_manager'
                });

                // Check if the ARmanager field is empty
                if (!arManager) {
                    throw 'AR Manager is missing. Please select AR Manager.'
                }
            }

            if (scriptContext.type === scriptContext.UserEventType.EDIT) {

                var reinitateApprovals = false;

                // Add fields that don't require approval here
                var fieldsNotRequiringApproval = ['entitystatus', 'isinactive', 'custentity1', 'comments', 'custentity_zeta_vendor_list', 'custentity_scaled_customer', 'custentity_primary_key',
                    'email', 'custentity_esc_industry', 'custentity_zeta_to_email', 'custentity_zeta_cc_email', 'custentity_celigo_sfnc_salesforce_id',
                    'custentity_zeta_family_group', 'custentity_zeta_verticals', 'custentity_zeta_credit_check_details', 'custentity_zeta_credit_check_date',
                    'custentity_zeta_ar_user_notes', 'creditlimit', 'custentity16', 'custentity_zeta_collection_email', 'custentity_zeta_collection_phone', 'custentity_zeta_credit_hold'];

                var newRecord = scriptContext.newRecord;
                var oldRecord = scriptContext.oldRecord;

                var approvalStatu = newRecord.getValue({ fieldId: 'custentity_zeta_approval_status_vendor' })
                if (approvalStatu == 3) {
                    return
                }

                for (var i = 0; i < fieldData.length; i++) {
                    var fieldInfo = fieldData[i];
                    var sublistId = fieldInfo.sublistId;
                    var fieldId = fieldInfo.fieldId;
                    var subrecordFieldId = fieldInfo.subrecordfieldid;
                    var isNonApprovalField = fieldsNotRequiringApproval.includes(fieldInfo.fieldId);

                    if (!isNonApprovalField) {
                        if (fieldInfo.type === 'main_subtab') {
                            var oldValue = oldRecord.getValue({ fieldId: fieldId });
                            var newValue = newRecord.getValue({ fieldId: fieldId });
                            var isMultipleSelect = Array.isArray(oldValue) || typeof oldValue == 'object';

                            if (isMultipleSelect) {
                                // Convert old and new values to strings for comparison
                                var oldValuesString = JSON.stringify(oldValue);
                                var newValuesString = JSON.stringify(newValue);

                                if (oldValuesString !== newValuesString) {
                                    reinitateApprovals = true;
                                    break;
                                }
                            } else {
                                if (oldValue !== newValue) {
                                    reinitateApprovals = true;
                                    break;
                                }
                            }
                        }
                        else if (fieldInfo.type === 'sublist') {
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
                                });

                                if (oldValue !== newValue) {
                                    reinitateApprovals = true;
                                    break;
                                }
                            }
                        }
                        else if (fieldInfo.type === 'subrecord') {
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
                                    }).getValue({ fieldId: subrecordFieldId });
                                    if (newValue !== oldValue) {
                                        reinitateApprovals = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }

                }

                if (reinitateApprovals) {

                    const pendingApproval = '1';
                    const customerInactive = '16';
                    newRecord.setValue({ fieldId: 'custentity_zeta_approval_status_vendor', value: pendingApproval });
                    newRecord.setValue({ fieldId: 'entitystatus', value: customerInactive });

                    var arManager = newRecord.getValue({
                        fieldId: 'custentity_zeta_account_manager'
                    });

                    // Check if the ARmanager field is empty
                    if (!arManager) {
                        throw 'AR Manager is missing. Please select AR Manager.'
                    } else {

                        var entityId = newRecord.getValue({ fieldId: 'entityid' });
                        var entityName = ''
                        var isIndividual = newRecord.getValue({ fieldId: 'isperson' });
                        log.debug('isIndividual', isIndividual)
                        if (isIndividual == 'T' || isIndividual === true) {
                            entityName = newRecord.getValue({ fieldId: 'firstname' }) + ' ' + newRecord.getValue({ fieldId: 'lastname' })
                        } else {
                            entityName = newRecord.getValue({ fieldId: 'companyname' })
                        }
                        var nsDomain = url.resolveDomain({
                            hostType: url.HostType.APPLICATION,
                        });
                        var attachments = fetchAttachments(newRecord.id)
                        email.send({
                            author: 2565,
                            recipients: arManager,
                            subject: 'Customer Updated - Approval Required : ' + ' ' + entityName,
                            body: generateEmailBody('edit', nsDomain, newRecord.id, entityId, entityName),
                            attachments: attachments
                        });
                    }
                }
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

            log.debug('After Submit')


            if (scriptContext.type === scriptContext.UserEventType.CREATE) {
                var newRecord = scriptContext.newRecord;
                var arManager = newRecord.getValue({
                    fieldId: 'custentity_zeta_account_manager'
                });
                var approvalStatus = newRecord.getValue({ fieldId: 'custentity_zeta_approval_status_vendor' });

                //Doing a lookup as the getValue is returning to be generated
                var custFieldLookUp = search.lookupFields({
                    type: search.Type.CUSTOMER,
                    id: newRecord.id,
                    columns: ['entityid']
                });
                var entityid = custFieldLookUp && custFieldLookUp.entityid;
                var entityName = ''
                var isIndividual = newRecord.getValue({ fieldId: 'isperson' });
                log.debug('isIndividual', isIndividual)
                if (isIndividual == 'T' || isIndividual === true) {
                    entityName = newRecord.getValue({ fieldId: 'firstname' }) + ' ' + newRecord.getValue({ fieldId: 'lastname' })
                } else {
                    entityName = newRecord.getValue({ fieldId: 'companyname' })
                }

                // Compose email content
                var nsDomain = url.resolveDomain({
                    hostType: url.HostType.APPLICATION,
                });
                var attachments = fetchAttachments(newRecord.id)

                if (arManager) {
                    email.send({
                        author: 2565,
                        recipients: arManager,
                        subject: 'New Customer Creation - Approval Required : ' + entityid + ' ' + entityName,
                        body: generateEmailBody('create', nsDomain, newRecord.id, entityid, entityName),
                        attachments: attachments
                    });
                }
            }
        };

        return {
            beforeLoad,
            beforeSubmit,
            afterSubmit
        };

    });