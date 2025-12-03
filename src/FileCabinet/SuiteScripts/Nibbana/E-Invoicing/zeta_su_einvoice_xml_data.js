
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/xml', 'N/file', 'N/log', 'N/format'],
    function (serverWidget, xml, file, log, format) {
        function onRequest(context) {
            try {
                log.debug('Suitelet Start', 'Request Method: ' + context.request.method);

                if (context.request.method === 'GET') {
                    var fileId = context.request.parameters.fileId;
                    log.debug('File ID Received', fileId);

                    if (!fileId) {
                        log.error('Missing File ID', 'No fileId parameter provided.');
                        context.response.write('File ID not provided.');
                        return;
                    }

                    // Load XML file
                    var xmlFile = file.load({ id: fileId });
                    log.debug('XML File Loaded', 'File Name: ' + xmlFile.name + ', Size: ' + xmlFile.size);
                    var xmlContent = xmlFile.getContents();
                    log.debug('XML Content Length', xmlContent.length);

                    // Parse XML
                    var xmlDoc = xml.Parser.fromString({ text: xmlContent });
                    log.debug('XML Parsing', 'XML Document parsed successfully.');

                    // Helper function for XPath
                    function getValue(xpath, node) {
                        var nodes = xml.XPath.select({ node: node || xmlDoc, xpath: xpath });
                        log.debug('XPath Query', 'XPath: ' + xpath + ', Nodes Found: ' + nodes.length);
                        return nodes.length ? nodes[0].textContent : '';
                    }

                    // Extract raw values
                    var tranid = getValue('//ram:ID');
                    var rawTranDate = getValue('//ram:IssueDateTime/udt:DateTimeString');
                    var rawDueDate = getValue('//ram:DueDateDateTime/udt:DateTimeString');
                    var memo = getValue('//ram:SellerTradeParty/ram:Name');
                    var currency = getValue('//ram:InvoiceCurrencyCode');

                    // Format dates using N/format

                    function formatDate(rawDate) {
                        if (!rawDate || rawDate.length < 8) return null;
                        try {
                            // Handle both formats: YYYYMMDD and YYYY-MM-DD
                            var formattedInput = rawDate.includes('-')
                                ? rawDate
                                : rawDate.substring(0, 4) + '-' + rawDate.substring(4, 6) + '-' + rawDate.substring(6, 8);

                            log.debug('Date Formatting Input', formattedInput);

                            var jsDate = new Date(formattedInput);

                            // Parse into Date object
                            var parsedDate = format.parse({
                                value: jsDate,
                                type: format.Type.DATE
                            });

                            log.debug('Date Parsed', parsedDate);
                            return parsedDate; // Return Date object
                        } catch (e) {
                            log.error('Date Formatting Error', e.message);
                            return null;
                        }
                    }

                    var trandate = formatDate(rawTranDate);
                    var duedate = formatDate(rawDueDate);
                    log.debug('Extracted and Formatted Data', {
                        tranid: tranid,
                        trandate: trandate,
                        memo: memo,
                        currency: currency,
                        duedate: duedate
                    });

                    // Create form
                    var form = serverWidget.createForm({ title: 'XML Invoice Data' });

                    var tranidField = form.addField({
                        id: 'custpage_tranid',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Transaction ID'
                    });
                    tranidField.defaultValue = tranid;
                    tranidField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

                    var trandateField = form.addField({
                        id: 'custpage_trandate',
                        type: serverWidget.FieldType.DATE,
                        label: 'Transaction Date'
                    });
                    trandateField.defaultValue = trandate;
                    trandateField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

                    var memoField = form.addField({
                        id: 'custpage_memo',
                        type: serverWidget.FieldType.TEXTAREA,
                        label: 'Memo'
                    });
                    memoField.defaultValue = memo;
                    memoField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

                    var currencyField = form.addField({
                        id: 'custpage_currency',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Currency'
                    });
                    currencyField.defaultValue = currency;
                    currencyField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

                    var duedateField = form.addField({
                        id: 'custpage_duedate',
                        type: serverWidget.FieldType.DATE,
                        label: 'Due Date'
                    });
                    duedateField.defaultValue = duedate;
                    duedateField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });


                    // Sublist for expenses
                    var sublist = form.addSublist({ id: 'custpage_expenses', type: serverWidget.SublistType.LIST, label: 'Expenses' });
                    sublist.addField({ id: 'item_name', type: serverWidget.FieldType.TEXT, label: 'Item Name' });
                    sublist.addField({ id: 'item_amount', type: serverWidget.FieldType.TEXT, label: 'Amount' });

                    var expenseNodes = xml.XPath.select({ node: xmlDoc, xpath: '//ram:IncludedSupplyChainTradeLineItem' });
                    log.debug('Expense Nodes Found', expenseNodes.length);

                    for (var i = 0; i < expenseNodes.length; i++) {
                        var itemName = getValue('.//ram:Name', expenseNodes[i]);
                        var amount = getValue('.//ram:LineTotalAmount', expenseNodes[i]);
                        log.debug('Expense Item', { line: i, itemName: itemName, amount: amount });

                        sublist.setSublistValue({ id: 'item_name', line: i, value: itemName });
                        sublist.setSublistValue({ id: 'item_amount', line: i, value: amount });
                    }


                    var htmlField = form.addField({
                        id: 'custpage_summary_html',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: 'Summary'
                    });


                    var htmlContent = `
                    <div style="font-family: Arial, sans-serif; font-size:14px; margin-top:15px;">
                        <h2 style="color:#333;">Invoice Summary</h2>
                        <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
                            <tr>
                                <th style="text-align:left; padding:8px; border-bottom:1px solid #ccc;">Field</th>
                                <th style="text-align:left; padding:8px; border-bottom:1px solid #ccc;">Value</th>
                            </tr>
                            <tr>
                                <td style="padding:8px;">Transaction ID</td>
                                <td style="padding:8px;">${tranid}</td>
                            </tr>
                            <tr>
                                <td style="padding:8px;">Transaction Date</td>
                                <td style="padding:8px;">${trandate}</td>
                            </tr>
                            <tr>
                                <td style="padding:8px;">Due Date</td>
                                <td style="padding:8px;">${duedate}</td>
                            </tr>
                            <tr>
                                <td style="padding:8px;">Currency</td>
                                <td style="padding:8px;">${currency}</td>
                            </tr>
                            <tr>
                                <td style="padding:8px;">Memo</td>
                                <td style="padding:8px;">${memo}</td>
                            </tr>
                        </table>

                        <h3 style="color:#333;">Expense Details</h3>
                        <table style="width:100%; border-collapse:collapse;">
                            <tr>
                                <th style="text-align:left; padding:8px; border-bottom:1px solid #ccc;">Item Name</th>
                                <th style="text-align:left; padding:8px; border-bottom:1px solid #ccc;">Amount</th>
                                <th style="text-align:left; padding:8px; border-bottom:1px solid #ccc;">Memo</th>
                            </tr>
                    `;

                    for (var i = 0; i < expenseNodes.length; i++) {
                        var itemName = getValue('.//ram:Name', expenseNodes[i]);
                        var amount = getValue('.//ram:LineTotalAmount', expenseNodes[i]);
                        var lineMemo = getValue('.//ram:Description', expenseNodes[i]) || itemName;

                        htmlContent += `
                            <tr>
                                <td style="padding:8px;">${itemName}</td>
                                <td style="padding:8px;">${amount}</td>
                                <td style="padding:8px;">${lineMemo}</td>
                            </tr>
                        `;
                    }

                    htmlContent += `
                        </table>
                    </div>
                    `;

                    htmlField.defaultValue = htmlContent;

                    context.response.writePage(form);
                    log.debug('Form Displayed', 'Suitelet execution completed successfully.');
                }
            } catch (e) {
                log.error('Suitelet Error', e.name + ': ' + e.message);
                context.response.write('An error occurred: ' + e.message);
            }
        }
        return { onRequest: onRequest };
    });