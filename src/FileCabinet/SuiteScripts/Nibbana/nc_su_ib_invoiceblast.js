/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

/* 
  File: nc_su_ib_invoiceblast.js
  Author: Jayadeep Pulikallu <jpulikallu@nibbanaconsulting.com>
  Client: Zeta Global
  Purpose: Invoice Blast Suitelet
 
  Copyright (c) 2024 Nibbana Consulting Private Limited
  All rights reserved. No part of this code may be copied or used without express, written permission from Nibbana.
*/
define(['N/ui/serverWidget', 'N/runtime', 'N/search', 'N/url', 'N/format', 'N/record', 'N/ui/message'],
    /**
     * @param{search} search
     */
    (serverWidget, runtime, search, url, format, record, message) => {

        const PAGESIZE = 100;

        //Remove duplicate emails
        function removeDuplicateEmails(emailString) {
            const emails = emailString.split(',');
            const uniqueEmails = Array.from(new Set(emails));
            return uniqueEmails.join(',');
        }
        function calculateDateDifference(inputDate) {
            const endDate = new Date(inputDate);// Parse the given date string into a Date object
            const currentDate = new Date();
            // Calculate the difference in milliseconds
            const diffTime = endDate - currentDate;
            // Calculate the difference in days
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert milliseconds to days
        
            return diffDays;
        }
        //get function for suitelet
        var getFunction = function (scriptContext) {

            var rec = record.load({
                type: 'customrecord_nc_ib_productconfig',
                id: 1
            })
            var decryptDate = rec.getValue({
                fieldId: 'custrecord_nc_ib_validtill'
            })
            const dateDifference = calculateDateDifference(decryptDate);

            //add form
            var form = serverWidget.createForm({
                title: 'Invoice Blast'
            });
            //attach client script
            form.clientScriptModulePath = './nc_cl_ib_invoiceblast.js';

            if (dateDifference <= 7 && dateDifference >= 0) {
                const msg1 = message.create({
                    title: 'Subscription Reminder',
                    message: 'Your subscription is ' + dateDifference + ' days away from expiring. Please renew it before it expires.',
                    type: message.Type.INFORMATION
                });
                form.addPageInitMessage({message: msg1});
                buildButtons(form);
                buildFieldGroups(form);
                buildHeaderFields(form);
                buildSubTabs(form);
                buildSubTabFields(form, 0, 0);
                var invSublist = buildInvSublist(form);
                scriptContext.response.writePage(form);
            }else if (dateDifference < 0 && dateDifference >= -7) {
                const msg2 = message.create({
                    title: 'Subscription Expired',
                    message: 'Your subscription expired ' + Math.abs(dateDifference) + ' days ago. Please renew it to continue using the service.',
                    type: message.Type.WARNING
                });
                form.addPageInitMessage({message: msg2});
                buildButtons(form);
                buildFieldGroups(form);
                buildHeaderFields(form);
                buildSubTabs(form);
                buildSubTabFields(form, 0, 0);
                var invSublist = buildInvSublist(form);
                scriptContext.response.writePage(form);
            }else if (dateDifference < -7) {
                const msg3 = message.create({
                    title: 'Subscription Expired',
                    message: 'Your product subscription has expired. Please contact Admin for renewal.',
                    type: message.Type.ERROR
                });
                form.addPageInitMessage({message: msg3});
                var html = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Subscription Expired</title>
                        <style>
                            body, html {
                                height: 100%;
                                margin: 0;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                background-color: #f4f4f4;
                                font-family: Arial, sans-serif;
                            }
                            .alert-box {
                                border: 2px solid red;
                                padding: 20px;
                                background-color: white;
                                text-align: center;
                            }
                            .alert-box h2 {
                                color: red;
                                margin: 0 0 10px 0;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="alert-box">
                            <h2>Subscription Expired</h2>
                            <p>Your product subscription has expired. Please contact Admin for renewal.</p>
                        </div>
                    </body>
                    </html>`;
                scriptContext.response.write(html);
            }else{
                buildButtons(form);
                buildFieldGroups(form);
                buildHeaderFields(form);
                buildSubTabs(form);
                buildSubTabFields(form, 0, 0);
                var invSublist = buildInvSublist(form);
                scriptContext.response.writePage(form);
            }
        }

        //Build Field Groups
        var buildFieldGroups = function (form) {

            form.addFieldGroup({
                id: 'filtersgrp',
                label: 'Filters'
            });
            form.addFieldGroup({
                id: 'optionsgrp',
                label: 'Options'
            });
            form.addFieldGroup({
                id: 'invgrp',
                label: 'Invoice List'
            });
        }

        //Builds filter elements
        var buildHeaderFields = function (form) {

            //add filter fields
            form.addField({
                id: 'custpage_customer',
                type: serverWidget.FieldType.SELECT,
                source: 'customer',
                label: 'Customer',
                container: 'filtersgrp'
            });
            var legalEntityFld = form.addField({
                id: 'custpage_subsidiary',
                type: serverWidget.FieldType.SELECT,
                source: 'subsidiary',
                label: 'Legal Entity',
                container: 'filtersgrp'
            });
            legalEntityFld.isMandatory = true;

            form.addField({
                id: 'custpage_class',
                type: serverWidget.FieldType.SELECT,
                source: 'customlist286',
                label: 'Customer Class',
                container: 'filtersgrp'
            });
            form.addField({
                id: 'custpage_invcreatedby',
                type: serverWidget.FieldType.SELECT,
                source: 'employee',
                label: 'Invoice Created By',
                container: 'filtersgrp'
            });
            var custFormFld = form.addField({
                id: 'custpage_tranform',
                type: serverWidget.FieldType.SELECT,
                label: 'Transaction Form',
                source: '-171',
                container: 'filtersgrp'
            });
            custFormFld.isMandatory = true;
            form.addField({
                id: 'custpage_salesrep',
                type: serverWidget.FieldType.SELECT,
                label: 'Sales Rep',
                source: 'employee',
                container: 'filtersgrp'
            });
            form.addField({
                id: 'custpage_accmanager',
                type: serverWidget.FieldType.SELECT,
                label: 'Account Manager',
                source: 'employee',
                container: 'filtersgrp'
            });
            var fromDtFld = form.addField({
                id: 'custpage_fromdate',
                type: serverWidget.FieldType.DATE,
                label: 'From Date',
                container: 'filtersgrp'
            });
            // Get the first day of the current month
            var currentDate = new Date();
            var firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            var formattedFirstDayOfMonth = format.format({
                value: firstDayOfMonth,
                type: format.Type.DATE
            });
            fromDtFld.defaultValue = formattedFirstDayOfMonth;
            var toDtFld = form.addField({
                id: 'custpage_todate',
                type: serverWidget.FieldType.DATE,
                label: 'To Date',
                container: 'filtersgrp'
            });
            var formattedCurrentDate = format.format({
                value: currentDate,
                type: format.Type.DATE
            });
            toDtFld.defaultValue = formattedCurrentDate
            var periodField = form.addField({
                id: 'custpage_period',
                type: serverWidget.FieldType.SELECT,
                label: 'Posting Period',
                source: 'accountingperiod',
                container: 'filtersgrp',
            });

            form.addField({
                id: 'custpage_showonlyopeninv',
                type: serverWidget.FieldType.CHECKBOX,
                label: 'Show Only Open Invoices',
                container: 'filtersgrp',
            })
            form.updateDefaultValues({
                custpage_showonlyopeninv: 'T'
            });

            form.addField({
                id: 'custpage_excludepartialpaidinv',
                type: serverWidget.FieldType.CHECKBOX,
                label: 'Exclude Partial Paid Invoices',
                container: 'filtersgrp'
            });

            form.addField({
                id: 'custpage_excludeemailedtransactions',
                type: serverWidget.FieldType.CHECKBOX,
                label: 'Exclude emailed transactions',
                container: 'filtersgrp'
            })
            var modeOfDelFld = form.addField({
                id: 'custpage_modeofdel',
                type: serverWidget.FieldType.SELECT,
                label: 'Mode of Delivery',
                source: 'customlist_nc_ib_modeofdelivery',
                container: 'filtersgrp'
            })

            var emailTemplateFld = form.addField({
                id: 'custpage_emailtemplate',
                type: serverWidget.FieldType.SELECT,
                label: 'Email Templates',
                source: 'customrecord_nc_ib_invoiceemailtemplates',
                container: 'optionsgrp'
            })
            emailTemplateFld.isMandatory = true;


            form.addField({
                id: 'custpage_consemailpercust',
                type: serverWidget.FieldType.CHECKBOX,
                label: 'Consolidate Email Per Customer',
                container: 'optionsgrp'
            })

        }

        //Build buttons
        var buildButtons = function (form) {

            //add buttons
            form.addSubmitButton({
                label: 'Search Invoices'
            });
            form.addButton({
                id: 'custbtn_sendinvoiceblast',
                label: 'Send Invoice Blast',
                functionName: 'sendInvoiceBlast'
            });

        }

        //Build subtabs
        var buildSubTabs = function (form) {

            var invSubTab = form.addSubtab({
                id: 'custsubtab_inv',
                label: 'Invoices'
            });
            invSubTab.helpText = 'Select the Invoices that needs to be Included in Email Blast from the below list';

        }

        //Build Subtab Fields
        var buildSubTabFields = function (form, pageCount, pageId) {

            log.debug('buildSubTabFields', pageCount + ' : ' + pageId)
            var pageIndexFld = form.addField({
                id: 'custpage_pageindex',
                type: serverWidget.FieldType.SELECT,
                label: 'Page Index',
                container: 'custsubtab_inv'
            });

            // Set pageId to correct value if out of index
            if (!pageId || pageId == '' || pageId < 0)
                pageId = 0;
            else if (pageId >= pageCount)
                pageId = pageCount - 1;

            for (i = 0; i < pageCount; i++) {
                if (i == pageId) {
                    pageIndexFld.addSelectOption({
                        value: i,
                        text: ((i * PAGESIZE) + 1) + ' - ' + ((i + 1) * PAGESIZE),
                        isSelected: true
                    });
                } else {
                    pageIndexFld.addSelectOption({
                        value: i,
                        text: ((i * PAGESIZE) + 1) + ' - ' + ((i + 1) * PAGESIZE)
                    });
                }
            }
        }

        //Build invoice sublist
        var buildInvSublist = function (form) {

            var invSublist = form.addSublist({
                id: 'custsublist_inv',
                type: serverWidget.SublistType.LIST,
                label: 'Invoices',
                tab: 'custsubtab_inv'
            });
            invSublist.addMarkAllButtons();

            var fields = [
                { id: 'custpage_select', type: serverWidget.FieldType.CHECKBOX, label: 'Select' },
                { id: 'custpage_invinternalid', type: serverWidget.FieldType.TEXT, label: 'Invoice Internal Id', displayType: serverWidget.FieldDisplayType.HIDDEN },
                { id: 'custpage_lastemailsent', type: serverWidget.FieldType.DATE, label: 'Last Email Sent' },
                { id: 'custpage_invref', type: serverWidget.FieldType.TEXT, label: 'Invoice#' },
                { id: 'custpage_customer', type: serverWidget.FieldType.TEXT, label: 'Customer' },
                { id: 'custpage_date', type: serverWidget.FieldType.DATE, label: 'Invoice Date' },
                { id: 'custpage_duedate', type: serverWidget.FieldType.DATE, label: 'Invoice Due Date' },
                { id: 'custpage_billto', type: serverWidget.FieldType.TEXTAREA, label: 'Bill To', displayType: serverWidget.FieldDisplayType.INLINE },
                { id: 'custpage_amt', type: serverWidget.FieldType.CURRENCY, label: 'Amount' },
                { id: 'custpage_emailto', type: serverWidget.FieldType.TEXTAREA, label: 'Email To', displayType: serverWidget.FieldDisplayType.ENTRY },
                { id: 'custpage_emailcc', type: serverWidget.FieldType.TEXTAREA, label: 'Email Cc', displayType: serverWidget.FieldDisplayType.ENTRY }
            ];

            fields.forEach(function (field) {
                var fieldObj = invSublist.addField({
                    id: field.id,
                    type: field.type,
                    label: field.label
                });

                if (field.displayType) {
                    fieldObj.updateDisplayType({ displayType: field.displayType });
                }
            });

            return invSublist;
        };

        //search invoices
        var searchInvoices = function (inpObj) {
            log.debug('inp', inpObj);
            var resArr = [];
            var invFilters = [];
            if (inpObj.cust) {
                invFilters.push(search.createFilter({
                    name: 'name',
                    operator: search.Operator.ANYOF,
                    values: inpObj.cust
                }))
            }
            if (inpObj.subs) {
                invFilters.push(search.createFilter({
                    name: 'subsidiary',
                    operator: search.Operator.ANYOF,
                    values: inpObj.subs
                }))
            }
            if (inpObj.class) {
                invFilters.push(search.createFilter({
                    name: 'custentity2',
                    join: 'customer',
                    operator: search.Operator.ANYOF,
                    values: inpObj.class
                }))
            }
            if (inpObj.invCreatedBy) {
                invFilters.push(search.createFilter({
                    name: 'custbody_cretd_by',
                    operator: search.Operator.ANYOF,
                    values: inpObj.invCreatedBy
                }))
            }
            if (inpObj.tranForm) {
                invFilters.push(search.createFilter({
                    name: 'customform',
                    operator: search.Operator.ANYOF,
                    values: inpObj.tranForm
                }))
            }
            if (inpObj.salesRep) {
                invFilters.push(search.createFilter({
                    name: 'salesrep',
                    operator: search.Operator.ANYOF,
                    values: inpObj.salesRep
                }))
            }
            if (inpObj.accManager) {
                invFilters.push(search.createFilter({
                    name: 'custbody_zeta_customer_accountmanager',
                    operator: search.Operator.ANYOF,
                    values: inpObj.accManager
                }))
            }

            if (inpObj.fromDt) {
                invFilters.push(search.createFilter({
                    name: 'trandate',
                    operator: search.Operator.ONORAFTER,
                    values: inpObj.fromDt
                }))
            }
            if (inpObj.toDt) {
                invFilters.push(search.createFilter({
                    name: 'trandate',
                    operator: search.Operator.ONORBEFORE,
                    values: inpObj.toDt
                }))
            }
            if (inpObj.period) {
                invFilters.push(search.createFilter({
                    name: 'postingperiod',
                    operator: search.Operator.ANYOF,
                    values: inpObj.period
                }))
            }

            if (inpObj.showOnlyOpenInv === 'T'){
                invFilters.push(search.createFilter({
                    name: 'status',
                    operator: search.Operator.IS,
                    values: 'CustInvc:A'
                }))
            }

            if (inpObj.excludePartPaidINv === 'T'){
                invFilters.push(search.createFilter({
                    name: 'amountpaid',
                    operator: search.Operator.EQUALTO,
                    values: '0.00'
                }))

                invFilters.push(search.createFilter({
                    name: 'status',
                    operator: search.Operator.IS,
                    values: 'CustInvc:A'
                }))
            }

            if (inpObj.excludeEmailedTrans === 'T') {
                invFilters.push(search.createFilter({
                    name: 'custbody_nc_ib_lastemaildate',
                    operator: search.Operator.ISEMPTY
                }))
            }

            if (inpObj.modeOfDel === "2"){
                invFilters.push(search.createFilter({
                    name: 'custentity_nc_ib_modeofdelivery',
                    join: 'customer',
                    operator: search.Operator.ANYOF,
                    values: 2
                }))
            }else{
                invFilters.push(search.createFilter({
                    name: 'custentity_nc_ib_modeofdelivery',
                    join: 'customer',
                    operator: search.Operator.NONEOF,
                    values: 2
                }))
            }

            invFilters.push(search.createFilter({
                name: 'name',
                operator: search.Operator.NONEOF,
                values: '17515' //Stripe Unallocated Charges
            }))

            invFilters.push(search.createFilter({
                name: 'mainline',
                operator: search.Operator.IS,
                values: true
            }))

            var invColumns = [];
            invColumns[0] = search.createColumn({
                name: 'tranid'
            });
            invColumns[1] = search.createColumn({
                name: 'trandate'
            });
            invColumns[2] = search.createColumn({
                name: 'name'
            });
            invColumns[3] = search.createColumn({
                name: 'duedate'
            });
            invColumns[4] = search.createColumn({
                name: 'fxamount'
            });
            invColumns[5] = search.createColumn({
                name: 'custbody_nc_ib_lastemaildate'
            });
            invColumns[6] = search.createColumn({
                name: "custrecord145",
                join: "billingAddress"
            });
            invColumns[7] = search.createColumn({
                name: "custrecord_zeta_billaddremailcc",
                join: "billingAddress"
            });
            invColumns[8] = search.createColumn({
                name: "email",
                join: "customer"
            });
            invColumns[9] = search.createColumn({
                name: 'custbody_nc_ib_lastemaildate'
            });
            invColumns[10] = search.createColumn({
                name: "custentity_zeta_to_email",
                join: "customer"
            });
            invColumns[11] = search.createColumn({
                name: "custentity_zeta_cc_email",
                join: "customer"
            });
            invColumns[12] = search.createColumn({
                name: "email",
                join: "salesRep"
            })
            invColumns[13] = search.createColumn({
                name: "billaddress",
            })
            invColumns[14] = search.createColumn({
                name: "email",
                join: "custbody_zeta_customer_accountmanager",
            })

            var invSearchObj = search.create({
                type: 'invoice',
                filters: invFilters,
                columns: invColumns,
                settings: [
                    search.createSetting({
                        name: 'consolidationtype', value: 'NONE'
                    })]
            })
            var pagedData = invSearchObj.runPaged({ pageSize: PAGESIZE });
            log.debug('pagedData', pagedData);
            var pageCount = Math.ceil(pagedData.count / PAGESIZE);
            log.debug('pageCount', pageCount);
            log.debug('inpObj.pageIndex ', inpObj.pageIndex);


            if (pagedData.pageRanges.length != 0) {
                var currentPage = pagedData.fetch({ index: inpObj.pageIndex || 0 });
                var resArr = currentPage.data;
            }

            /*pagedData.pageRanges.forEach(function (pageRange) {
                var page = pagedData.fetch({ index: pageRange.index });
                resArr = resArr.concat(page.data);
            });*/
            log.debug('Res Length', resArr.length);
            log.debug('Res', resArr);
            var retObj = {}
            retObj.pageCount = pageCount;
            retObj.resArr = resArr
            return retObj;
        }

        //sets filter field values on post
        var setFilterFields = function (form, inpObj) {

            form.updateDefaultValues({
                custpage_customer: inpObj.cust,
                custpage_subsidiary: inpObj.subs,
                custpage_class: inpObj.class,
                custpage_invcreatedby: inpObj.invCreatedBy,
                custpage_tranform: inpObj.tranForm,
                custpage_salesrep: inpObj.salesRep,
                custpage_accmanager: inpObj.accManager,
                custpage_fromdate: inpObj.fromDt,
                custpage_todate: inpObj.toDt,
                custpage_period: inpObj.period,
                custpage_showonlyopeninv: inpObj.showOnlyOpenInv,
                custpage_excludepartialpaidinv: inpObj.excludePartPaidINv,
                custpage_emailtemplate: inpObj.emailTemplate,
                custpage_consemailpercust: inpObj.consEmailPerCust,
                custpage_excludeemailedtransactions: inpObj.excludeEmailedTrans,
                custpage_modeofdel: inpObj.modeOfDel
            })
        }

        //Build Sublist Data
        var buildInvSublistData = function (invSublist, invoiceList, inpObj, form) {

            /*
            var uniqueCustomerIds = [...new Set(invoiceList.map(invoice => invoice.getValue('name')))];

            // Perform batch lookup for customer emails
            var customerLookup = search.create({
                type: "customer",
                filters: [
                    ["internalid", "anyof", uniqueCustomerIds]
                ],
                columns: [
                    search.createColumn({ name: "email" })
                ]
            });

            // Run the search and fetch results
            var searchResults = customerLookup.run().getRange({ start: 0, end: 1000 });
            var customerEmails = {};

            searchResults.forEach(function (result) {
                var customerId = result.id;
                var email = result.getValue({ name: "email" });
                customerEmails[customerId] = email;
            });
            */

            //perform lookup to get additional cc fields
            var templateFieldLookUp = search.lookupFields({
                type: 'customrecord_nc_ib_invoiceemailtemplates',
                id: inpObj.emailTemplate,
                columns: ['custrecord_nc_ib_defaultcc']
            });
            var defaultCCEmails = templateFieldLookUp.custrecord_nc_ib_defaultcc;


            function setSublistValue(fieldId, line, value) {
                invSublist.setSublistValue({
                    id: fieldId,
                    line: line,
                    value: value
                });
            }
            
            for (var i = 0; i < invoiceList.length; i++) {
                var invoice = invoiceList[i];
                var customerId = invoice.getValue('name');
                //  var customerEmail = customerEmails[customerId];
                // Use url.resolveRecord directly
                var recLink = url.resolveRecord({
                    recordType: 'invoice',
                    recordId: invoice.id,
                    isEditMode: false
                });

                // Set sublist values
                setSublistValue('custpage_invinternalid', i, invoice.id);
                setSublistValue('custpage_invref', i, '<a target="_blank" href=' + recLink + '>' + invoice.getValue('tranid') + '</a>');
                setSublistValue('custpage_date', i, invoice.getValue('trandate'));
                setSublistValue('custpage_customer', i, invoice.getText('name'));
                if (invoice.getValue('billaddress')) {
                    setSublistValue('custpage_billto', i, invoice.getValue('billaddress'));
                }
                if (invoice.getValue('duedate')) {
                    setSublistValue('custpage_duedate', i, invoice.getValue('duedate'));
                }
                setSublistValue('custpage_amt', i, invoice.getValue('fxamount'));

                if (invoice.getValue('custbody_nc_ib_lastemaildate')) {
                    setSublistValue('custpage_lastemailsent', i, invoice.getValue('custbody_nc_ib_lastemaildate'));
                }
                // Logic for email to
                var toEmail = ''; var ccEmail = '';
                var billAddrTo = invoice.getValue(search.createColumn({
                    name: "custrecord145",
                    join: "billingAddress"
                })) || '';
                var billAddrCC = invoice.getValue(search.createColumn({
                    name: "custrecord_zeta_billaddremailcc",
                    join: "billingAddress"
                })) || '';
                var custEmail = invoice.getValue(search.createColumn({
                    name: "email",
                    join: "customer"
                })) || '';
                var custMainEmail = invoice.getValue(search.createColumn({
                    name: "custentity_zeta_to_email",
                    join: "customer"
                })) || '';
                var custCCEmail = invoice.getValue(search.createColumn({
                    name: "custentity_zeta_cc_email",
                    join: "customer"
                })) || '';
                var salesRepEmail = invoice.getValue(search.createColumn({
                    name: "email",
                    join: "salesRep"
                })) || '';
                var accMngrEmail = invoice.getValue({
                    name: "email",
                    join: "custbody_zeta_customer_accountmanager",
                }) || '';

                if (inpObj.emailTemplate == 13) {

                    //internal email
                    if (salesRepEmail) {
                        toEmail = salesRepEmail;
                    }
                    if (accMngrEmail) {
                        toEmail += toEmail ? ',' + accMngrEmail : accMngrEmail;
                    }
                } else {

                    //external email
                    if (billAddrTo) {
                        toEmail = billAddrTo;
                    } else {
                        toEmail = custEmail ? (custMainEmail ? custEmail + ',' + custMainEmail : custEmail) : custMainEmail;
                    }

                    ccEmail = billAddrCC || custCCEmail;
                    if (salesRepEmail) {
                        ccEmail += ccEmail ? ',' + salesRepEmail : salesRepEmail;
                    }
                    if (accMngrEmail) {
                        ccEmail += ccEmail ? ',' + accMngrEmail : accMngrEmail;
                    }
                    if (defaultCCEmails) {
                        ccEmail += ccEmail ? ',' + defaultCCEmails : defaultCCEmails;

                    }
                }
                toEmail = removeDuplicateEmails(toEmail)
                ccEmail = removeDuplicateEmails(ccEmail)
                if (toEmail) {
                    setSublistValue('custpage_emailto', i, toEmail.replace(/\s+/g, ''));
                }
                if (ccEmail) {
                    setSublistValue('custpage_emailcc', i, ccEmail.replace(/\s+/g, ''));
                }
            }
        };

        //post function for suitelet
        var postFunction = function (scriptContext) {
            var currentRecord = scriptContext.currentRecord
            //retrive parameters
            var request = scriptContext.request;
            var inpObj = {};
            inpObj.currentuser = runtime.getCurrentUser().id;
            inpObj.cust = request.parameters.custpage_customer;
            inpObj.subs = request.parameters.custpage_subsidiary;
            inpObj.class = request.parameters.custpage_class;
            inpObj.invCreatedBy = request.parameters.custpage_invcreatedby;
            inpObj.tranForm = request.parameters.custpage_tranform;
            inpObj.salesRep = request.parameters.custpage_salesrep;
            inpObj.accManager = request.parameters.custpage_accmanager;
            inpObj.fromDt = request.parameters.custpage_fromdate;
            inpObj.toDt = request.parameters.custpage_todate;
            inpObj.period = request.parameters.custpage_period;
            inpObj.showOnlyOpenInv = request.parameters.custpage_showonlyopeninv;
            inpObj.excludePartPaidINv = request.parameters.custpage_excludepartialpaidinv;
            inpObj.emailTemplate = request.parameters.custpage_emailtemplate;
            inpObj.consEmailPerCust = request.parameters.custpage_consemailpercust;
            inpObj.pageIndex = request.parameters.custpage_pageindex;
            inpObj.excludeEmailedTrans = request.parameters.custpage_excludeemailedtransactions;
            inpObj.modeOfDel = request.parameters.custpage_modeofdel;


            //perform search
            var searchData = searchInvoices(inpObj);
            var invoiceList = searchData.resArr;
            var pageCount = searchData.pageCount

            //add form
            var form = serverWidget.createForm({
                title: 'Invoice Blast'
            });

            //attach client script
            form.clientScriptModulePath = './nc_cl_ib_invoiceblast.js';

            buildFieldGroups(form);
            buildHeaderFields(form);
            buildButtons(form);
            buildSubTabs(form);
            buildSubTabFields(form, pageCount, inpObj.pageIndex)

            setFilterFields(form, inpObj);
            var invSublist = buildInvSublist(form);
            //buildInvSublistData(invSublist, invoiceList)
            if (invoiceList.length > 0) {

                buildInvSublistData(invSublist, invoiceList, inpObj, form)
            }

            scriptContext.response.writePage(form);

        }

        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {

            if (scriptContext.request.method === "GET") {
                getFunction(scriptContext)
            }
            else {
                postFunction(scriptContext)
            }
        }

        return { onRequest }

    });