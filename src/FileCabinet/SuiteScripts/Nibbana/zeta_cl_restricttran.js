/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/ui/dialog', 'N/record', 'N/runtime'],

    function (search, dialog, record, runtime) {
        var mode;

        function getSalesOrderLineByUniqueId(salesOrder, lineId) {
            var lineCount = salesOrder.getLineCount({ sublistId: 'item' });
            for (var i = 0; i < lineCount; i++) {
                var salesOrderLineId = salesOrder.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_celigo_sfio_sf_id',
                    line: i
                });
    
                if (salesOrderLineId === lineId) {
                    return {
                        quantity: salesOrder.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i }),
                        amount: salesOrder.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i })
                    };
                }
            }
            return null;
        }

        function pageInit(scriptContext) {
            var curRec = scriptContext.currentRecord
            var createdFrom = curRec.getValue({ fieldId: 'createdfrom' });
            var recordtype = curRec.type;
            mode = scriptContext.mode;
            log.debug("mode", mode)
            if ((recordtype == "creditmemo") && (mode == "copy" || mode == "create") && createdFrom) {
                var raRec = record.load({
                    type: record.Type.RETURN_AUTHORIZATION,
                    id: createdFrom,
                    isDynamic: false
                });
                var tranDate = raRec.getValue({
                    fieldId: 'trandate'
                });
                curRec.setValue('trandate', tranDate);

            }
        }

        function lineInit(scriptContext) {
            var userRole = runtime.getCurrentUser().role;
            var currRec = scriptContext.currentRecord;
            var recordtype = currRec.type;
            var createdFrom = currRec.getValue({ fieldId: 'createdfrom' });
            if ((recordtype == "creditmemo") && (userRole != 3) && createdFrom) {
                var lineCount = currRec.getLineCount({
                    sublistId: 'item'
                });

                for (var i = 0; i < lineCount; i++) {
                    var rateField = currRec.getSublistField({
                        sublistId: 'item',
                        fieldId: 'rate',
                        line: i
                    });
                    rateField.isDisabled = true;
                    var locField = currRec.getSublistField({
                        sublistId: 'item',
                        fieldId: 'location',
                        line: i
                    });
                    locField.isDisabled = true;

                }
            }
        }

        function validateInsert(scriptContext) {
            var userRole = runtime.getCurrentUser().role;
            var currRec = scriptContext.currentRecord;
            var recordtype = currRec.type;
            var createdFrom = currRec.getValue({ fieldId: 'createdfrom' });

            // level1 approval
            if ((recordtype == "creditmemo") && (userRole != 3) && createdFrom) {
                dialog.alert({
                    title: 'Validation Error',
                    message: 'You are not allowed to insert a new line on transaction.'
                })
                return false
            }
            return true
        }

        function validateDelete(scriptContext) {
            var userRole = runtime.getCurrentUser().role;
            var currRec = scriptContext.currentRecord;
            var recordtype = currRec.type;
            var createdFrom = currRec.getValue({ fieldId: 'createdfrom' });
            var approvalStatus = currRec.getValue({ fieldId: 'custbody16' });
            try {
                if ((recordtype == "creditmemo") && (userRole != 3) && createdFrom) {
                    dialog.alert({
                        title: 'Validation Error',
                        message: 'You are not allowed to delete a line on transaction.'
                    })
                    return false
                }
                if ((recordtype == "returnauthorization") && (userRole != 3) && (approvalStatus == '2')) {
                    dialog.alert({
                        title: 'Validation Error',
                        message: 'You are not allowed to delete a line on transaction.'
                    })
                    return false
                }
                return true
            } catch (e) {
                log.error('Error', e);
            }

        }

        function saveRecord(scriptContext) {
            try {

                var currRec = scriptContext.currentRecord;
                var recordtype = currRec.type;
                var customer = currRec.getValue({
                    fieldId: 'entity'
                });
                log.debug('customer', customer);

                if (customer) {
                    var customerLookup = search.lookupFields({
                        type: search.Type.CUSTOMER,
                        id: customer,
                        columns: ['entitystatus']
                    });

                    var customerStatus = customerLookup.entitystatus[0].value;

                    if (customerStatus === '16') {
                        dialog.alert({
                            title: 'Validation Error',
                            message: 'New transactions cannot be initiated for inactive customers.'
                        });
                        return false; // Prevent saving the record
                    }
                }

                if ((mode == "create" || mode == "copy") && recordtype == "returnauthorization") {
                    var lineCount = currRec.getLineCount({
                        sublistId: 'item'
                    });
                    var zeroQuantityLines = 0;
                    for (var i = 0; i < lineCount; i++) {
                        var quantity = currRec.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            line: i
                        });

                        if (quantity == 0) {
                            zeroQuantityLines++;
                        }
                    }

                    if (zeroQuantityLines > 0) {
                        dialog.alert({
                            title: 'Validation Error',
                            message: 'There are some lines with zero quantity. To ensure successful saving, please remove them.'
                        });
                        return false;
                    }
                }

                if (recordtype == "invoice") {
                    var createdFrom = currRec.getValue('createdfrom')

                    if (createdFrom) {
                        var soRec = record.load({
                            type: record.Type.SALES_ORDER,
                            id: createdFrom,
                        })

                        var lineCount = currRec.getLineCount({ sublistId: 'item' });
                        for (var i = 0; i < lineCount; i++) {
                            var invoiceOppId = currRec.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_celigo_sfio_sf_id',
                                line: i
                            });

                            var invoiceQuantity = currRec.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                line: i
                            });

                            var invoiceAmount = currRec.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'amount',
                                line: i
                            });

                            var salesorderSearchObj = search.create({
                                type: "salesorder",
                                settings: [{ "name": "consolidationtype", "value": "NONE" }],
                                filters:
                                    [
                                        ["type", "anyof", "SalesOrd"],
                                        "AND",
                                        ["internalid", "anyof", createdFrom],
                                        "AND",
                                        ["taxline", "is", "F"],
                                        "AND",
                                        ["shipping", "is", "F"],
                                        "AND",
                                        ["quantity", "greaterthanorequalto", "1"],
                                        "AND",
                                        ["custcol_celigo_sfio_sf_id", "is", invoiceOppId]
                                    ],
                                columns:
                                    [
                                        search.createColumn({
                                            name: "quantity",
                                            join: "billingTransaction",
                                            label: "Qty Invoiced"
                                        }),
                                        search.createColumn({
                                            name: "total",
                                            join: "billingTransaction",
                                            label: "Amount Invoiced"
                                        }),
                                        search.createColumn({
                                            name: "formulacurrency",
                                            formula: "ABS({billingtransaction.totalamount} - {amount})",
                                            label: "Remaining Amount"
                                        })
                                    ]
                            });
    
                            var searchResults = salesorderSearchObj.run().getRange({
                                start: 0,
                                end: 50
                            });
                            
                            var qtyInvoiced
                            var amountInvoiced
                            var remainingAmount
                            searchResults.forEach(function(result) {
                                qtyInvoiced = result.getValue({
                                    name: 'quantity',
                                    join: 'billingTransaction'
                                });
                                amountInvoiced = result.getValue({
                                    name: 'total',
                                    join: 'billingTransaction'
                                });
                                remainingAmount = result.getValue({
                                    name: 'formulacurrency',
                                    formula: "ABS({billingtransaction.totalamount} - {amount})"
                                });
                    
                                log.debug('Qty Invoiced', qtyInvoiced);
                                log.debug('Amount Invoiced', amountInvoiced);
                                log.debug('Remaining Amount', remainingAmount);
                            });
    
                            var remainingQty = invoiceQuantity - qtyInvoiced
                            log.debug("remainingQty", remainingQty)
                            if(qtyInvoiced > 0 || amountInvoiced > 0){
    
                                if(invoiceQuantity > remainingQty || invoiceAmount > remainingAmount){
                                    dialog.alert({
                                        title: 'Validation Error',
                                        message: 'Invoicing greater Quantity or Amount. Please verify the amount or quantity.'
                                    })
                                    return false
                                }
                                if((invoiceQuantity == remainingQty && invoiceAmount < remainingAmount)){
                                    dialog.alert({
                                        title: 'Validation Error',
                                        message: 'Invoicing Full Quantity with less Amount. Please verify the quantity or amount.'
                                    })
                                    return false
                                }
                                
                            }else{
                                var salesOrderLine = getSalesOrderLineByUniqueId(soRec, invoiceOppId);
                                var salesOrderQuantity = salesOrderLine.quantity;
                                var salesOrderAmount = salesOrderLine.amount;

                                if (invoiceQuantity > salesOrderQuantity || invoiceAmount > salesOrderAmount) {
                                    dialog.alert({
                                        title: 'Validation Error',
                                        message: 'Invoicing greater Quantity or Amount. Please verify the amount or quantity.'
                                    })
                                    return false
                                }
                                if((invoiceQuantity == salesOrderQuantity && invoiceAmount < salesOrderQuantity)){
                                    dialog.alert({
                                        title: 'Validation Error',
                                        message: 'Invoicing Full Quantity with less Amount. Please verify the quantity or amount.'
                                    })
                                    return false
                                }
                            }
                        }
                    }
                }

            } catch (e) {
                log.error('Error', e);
                return true // returning true as there is a UE script also that handles validation.
            }
            return true; // Allow saving the record
        }

        return {
            pageInit: pageInit,
            lineInit: lineInit,
            validateInsert: validateInsert,
            validateDelete: validateDelete,
            saveRecord: saveRecord
        };

    });
    