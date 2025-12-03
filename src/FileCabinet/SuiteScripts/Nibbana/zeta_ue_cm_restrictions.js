/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/runtime', 'N/ui/serverWidget', 'N/record'],

    (runtime, serverWidget, record) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the scriptContext.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

            var currRec = scriptContext.newRecord;
            var itemLines = currRec.getLineCount({
                sublistId: 'item'
            });
            var form = scriptContext.form;

            var userObj = runtime.getCurrentUser();
            var userId = userObj.id;
            var role = userObj.role;
            var type = scriptContext.type;
            log.debug("type ", type)
            var createdFrom = currRec.getValue({ fieldId: 'createdfrom' });

            //AR manager restriction
            if (type == 'create' || type == 'edit') {
                if (role == 1048) {
                    throw 'You are not allowed to create/edit Credit Memo directly'
                }
            }
            if (type == 'create') {
                currRec.setValue({
                    fieldId: 'custbody_cretd_by',
                    value: userId
                })
                currRec.setValue({
                    fieldId: 'custbody_nsts_gaw_created_by',
                    value: userId
                })
                currRec.setValue({
                    fieldId: 'custbody_aprvd_by',
                    value: null
                })

                if(createdFrom) {
                    currRec.setValue({
                        fieldId: 'custbody_zeta_collection_notes',
                        value: ''
                    })
                    currRec.setValue({
                        fieldId: 'custbody_zeta_fuel_ar_user_notes',
                        value: ''
                    })
                    currRec.setValue({
                        fieldId: 'custbody_zeta_collection_status',
                        value: ''
                    })
                    currRec.setValue({
                        fieldId: 'custbody_zeta_category_escalation',
                        value: ''
                    })

                }

                if (role == 1046 || role == 1042) {
                    throw 'You are not allowed to create Credit Memo directly'
                }
            }

            var execContext = runtime.executionContext;

            //Should not disable for admin and suitesync
            if ((role != 3 && role != 1055) && createdFrom) {

                //User should be able to update the trandate on create
                if (type == 'edit') {
                    form.getField({
                        id: 'trandate'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED
                    });
                }

                // for header fields
                var restrictedHeaderFlds = ['entity', 'postingperiod', 'billaddresslist', 'shipaddresslist', 'department', 'discountitem',
                    'discountrate', 'custbody_ava_taxinclude', 'custbody_ava_taxoverride', 'custbody_zeta_business_cm_app', 'custbody_zeta_ar_manager', 'custbody_zeta_final_check_approver'];

                for (var i = 0; i < restrictedHeaderFlds.length; i++) {

                    var fieldId = restrictedHeaderFlds[i];
                    var headerFld = form.getField({
                        id: fieldId
                    });
                    if (headerFld) {
                        headerFld.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.DISABLED
                        });
                    }
                }

                // for line fields
                var restrictedLineFlds = ['item', 'quantity', 'location', 'rate', 'amount', 'taxcode', 'taxrate1', 'class', 'custcol_cseg_department',
                    'department', 'price', 'custcol1', 'custcol2'];

                var itemLines = currRec.getLineCount({
                    sublistId: 'item'
                });
                var itemSublist = form.getSublist({
                    id: 'item'
                });

                for (var i = 0; i < itemLines; i++) { // for line fields

                    for (var j = 0; j < restrictedLineFlds.length; j++) {
                        var fieldId = restrictedLineFlds[j];
                        var lineFld = itemSublist.getField({
                            id: fieldId
                        });
                        if (lineFld) {
                            lineFld.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                        }
                    }
                }
            }

            if (role == 1046 || role == 1042) {
                var restrictHeaderFlds = ['customform','custbody_nsts_gaw_tran_requestor','subsidiary', 'tranid', 'custbody_zeta_cm_ra_subject', 'trandate', 'otherrefnum', 'entity', 'postingperiod', 'memo', 'custbody_advertiser_id', 'custbody_zeta_business_reason', 'custbody_zeta_revenueimpact', 'billaddresslist', 'shipcarrier', 'custbody_avashippingcode', 'account', 'exchangerate', 'currency', 'custbody_approval_email_sent', 'custbody_refno_originvoice', 'custbody_zeta_script_field_vba', 'custbody_zeta_prior_approvers', 'shipaddresslist', 'department', 'discountitem',
                    'discountrate', 'custbody_ava_taxinclude','autoapply','custbody_ava_taxcredit', 'custbody_ava_taxoverride','custbody_zeta_opp_name','custbody_celigo_sfnc_salesforce_id', 'custbody_ava_taxdateoverride', 'custbody_zeta_business_cm_app', 'custbody_zeta_ar_manager', 'custbody_zeta_final_check_approver', 'custbody_zeta_ra_newinvoicenumner', 'custbody_zeta_knock_off_entry', 'custbody4', 'custbody6', 'custbody5', 'custbody7', 'custbody_zeta_advertiser_placiq', 'custbody_zeta_camp_start_date', 'custbody_zeta_camp_end_date', 'custbody_wh_script_processed', 'custbody_ava_shiptousecode', 'custbody_ava_billtousecode','custbody_zeta_cleared_transaction', 'custbody_zeta_campaign_name', 'custbody_ava_is_sellerimporter', 'custbody_zeta_verticals', 'custbody_zeta_industry', 'custbody_zeta_service_type', 'custbody_15699_exclude_from_ep_process', 'custbody_zeta_campaign_id', 'custbody_zeta_customer_accountmanager', 'custbody_zeta_orginvno', 'custbody_ava_disable_tax_calculation'];

                var restrictLineFlds = ['item', 'quantity', 'description', 'rate', 'amount', 'taxcode', 'taxrate1', 'class', 'custcol_cseg_department', 'custcol_zeta_fuel_po', 'custcol_zeta_fuel_campaignno','custcol_zeta_fuel_campaign_flight_det', 'custcol_zeta_fuel_campaign_name', 'custcol_zeta_fuel_agency', 'custcol_zeta_fuel_advertiser',
                    'department', 'price', 'custcol1', 'custcol2', 'custcol_cseg_cost_center', 'custcol_celigo_sfio_order_id', 'custcol_advertiseridlinelevel', 'custcol_celigo_sfio_sf_id', 'custcol_sf_product_code', 'custcol_ava_preowned', 'custpage_ava_multitaxtypes', 'custpage_ava_editmultitaxtype'];

                if (role === 1042) {
                    restrictHeaderFlds.push('custbody_zeta_category_escalation');
                    restrictHeaderFlds.push('custbody_zeta_collection_notes');
                    restrictHeaderFlds.push('custbody_zeta_fuel_ar_user_notes');
                    // Add more values as needed
                }
                
                for (var i = 0; i < restrictHeaderFlds.length; i++) {

                    var fieldId = restrictHeaderFlds[i];
                    var headerFld = form.getField({
                        id: fieldId
                    });
                    if (headerFld) {
                        headerFld.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.DISABLED
                        });
                    }
                }
                var itemLines = currRec.getLineCount({
                    sublistId: 'item'
                });
                var itemSublist = form.getSublist({
                    id: 'item'
                });

                for (var i = 0; i < itemLines; i++) { // for line fields

                    for (var j = 0; j < restrictLineFlds.length; j++) {
                        var fieldId = restrictLineFlds[j];
                        log.debug("fieldId", fieldId)
                        var lineFld = itemSublist.getField({
                            id: fieldId
                        });

                        // Skip fields that are not on the form or lack the method
                        if (!lineFld || typeof lineFld.updateDisplayType !== 'function') {
                            log.debug({ title: 'Skipped (not on form)', details: fieldId });
                            return;
                        }

                        try {
                            lineFld.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                        } catch (e) {  // Hidden or system field ignore
                            log.error({ title: 'Cannot disable ' + fieldId, details: e });
                        }
                    }
                }
            }
        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the scriptContext.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            var currRec = scriptContext.newRecord;
            var oldRec = scriptContext.oldRecord;
            var executionContext = runtime.executionContext;
            var legalEntity = currRec.getValue({
                fieldId: 'subsidiary'
            })
            var createdFrom = currRec.getValue({ fieldId: 'createdfrom' });

            var userObj = runtime.getCurrentUser();
            var role = userObj.role;
            var type = scriptContext.type;

            if ((type == 'create' || type == 'edit') && (role == 3 || role == 1034) && !createdFrom) {
                var allowedEntites = ['19', '22', '41', '23', '49', '54', '51', '65', '52', '57'];
                if (allowedEntites.indexOf(legalEntity) === -1) {
                    throw "Error: Direct creation of Credit Memo for this entity is not allowed. Please create a Return Authorization first and then convert it to Credit Memo. Contact Administrator if you need further assistance.";
                }
            }

            if ((role == 1046 || role == 1042) && executionContext === runtime.ContextType.CSV_IMPORT ){
                var restrictHeaderFields = [
                    'customform', 'custbody_nsts_gaw_tran_requestor', 'subsidiary', 'tranid',
                    'custbody_zeta_cm_ra_subject', 'trandate', 'otherrefnum', 'entity', 'postingperiod',
                    'memo', 'custbody_zeta_category_escalation', 'custbody_advertiser_id',
                    'custbody_zeta_business_reason', 'custbody_zeta_revenueimpact', 'billaddresslist',
                    'shipcarrier', 'custbody_avashippingcode', 'account', 'exchangerate', 'currency',
                    'custbody_approval_email_sent', 'custbody_refno_originvoice',
                    'custbody_zeta_script_field_vba', 'custbody_zeta_prior_approvers',
                    'shipaddresslist', 'department', 'discountitem', 'discountrate', 'custbody_ava_taxinclude',
                    'autoapply', 'custbody_ava_taxcredit', 'custbody_ava_taxoverride',
                    'custbody_zeta_opp_name', 'custbody_celigo_sfnc_salesforce_id',
                    'custbody_ava_taxdateoverride', 'custbody_zeta_business_cm_app',
                    'custbody_zeta_ar_manager', 'custbody_zeta_final_check_approver',
                    'custbody_zeta_ra_newinvoicenumner', 'custbody_zeta_knock_off_entry', 'custbody4',
                    'custbody6', 'custbody5', 'custbody7', 'custbody_zeta_advertiser_placiq',
                    'custbody_zeta_camp_start_date', 'custbody_zeta_camp_end_date', 'custbody_wh_script_processed',
                    'custbody_ava_shiptousecode', 'custbody_ava_billtousecode', 'custbody_zeta_cleared_transaction',
                    'custbody_zeta_campaign_name', 'custbody_ava_is_sellerimporter', 'custbody_zeta_verticals',
                    'custbody_zeta_industry', 'custbody_zeta_service_type', 'custbody_15699_exclude_from_ep_process',
                    'custbody_zeta_campaign_id', 'custbody_zeta_customer_accountmanager',
                    'custbody_zeta_orginvno', 'custbody_ava_disable_tax_calculation'
                ];
        
                var restrictLineFields = [
                    'item', 'quantity', 'description', 'location', 'rate', 'amount', 'taxcode',
                    'taxrate1', 'class', 'custcol_cseg_department', 'department', 'price', 'custcol1',
                    'custcol2', 'custcol_cseg_cost_center', 'custcol_celigo_sfio_order_id',
                    'custcol_advertiseridlinelevel', 'custcol_celigo_sfio_sf_id', 'custcol_sf_product_code',
                    'custcol_ava_preowned', 'custpage_ava_multitaxtypes', 'custpage_ava_editmultitaxtype'
                ];

                restrictHeaderFields.forEach(function (fieldId) {
                    var oldValue = oldRec.getValue({ fieldId: fieldId });
                    var newValue = currRec.getValue({ fieldId: fieldId });
    
                    if (oldValue !== newValue) {
                        throw new Error("You are not allowed to update field '" + fieldId + "' via CSV Import.");
                    }
                });

                var lineCount = currRec.getLineCount({ sublistId: 'item' });

                for (var i = 0; i < lineCount; i++) {
                    restrictLineFields.forEach(function (fieldId) {
                        var oldValue = oldRec.getSublistValue({ sublistId: 'item', fieldId: fieldId, line: i }) || "";
                        var newValue = currRec.getSublistValue({ sublistId: 'item', fieldId: fieldId, line: i }) || "";

                        if (oldValue !== newValue) {
                            throw new Error("You are not allowed to update field '" + fieldId + "' in Line " + (i + 1) + " via CSV Import.");
                        }
                    });
                }
            }
        }

        return {
            beforeLoad, beforeSubmit
        }

    });