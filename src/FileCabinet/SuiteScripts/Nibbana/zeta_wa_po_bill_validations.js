/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/record', 'N/search'],
    /**
     * @param{record} record
     * @param{search} search
     */
    (record, search) => {
        /**
         * Defines the WorkflowAction script trigger point.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.workflowId - Internal ID of workflow which triggered this action
         * @param {string} scriptContext.type - Event type
         * @param {Form} scriptContext.form - Current form that the script uses to interact with the record
         * @since 2016.1
         */
        const onAction = (scriptContext) => {
            try {
                const billRecord = scriptContext.newRecord;
                const billId = billRecord.id;
                log.debug('Processing Bill ID', billId);

                // Get the PO reference
                const poId = billRecord.getValue({ fieldId: 'createdfrom' });
                const PoReferenceId = billRecord.getValue({ fieldId: 'podocnum' });
                log.debug('PO Reference ID', PoReferenceId);
                log.debug('PO ID', poId);

                if (!PoReferenceId) {
                    log.debug('No PO found', 'Bill created without PO reference');
                    return;
                }

                // Tolerance percentage (5%)
                const tolerancePercent = 5;

                // Load PO data
                const poData = loadPoData(PoReferenceId);

                // Get bill lines data
                const billLines = getBillLines(billRecord);

                // Validate each line and calculate total variance
                const validationResult = validateBillAgainstPO(billLines, poData, tolerancePercent);

                if (!validationResult.isValid) {
                    throw new Error(validationResult.errorMessage);
                }

                log.debug('Bill Validation Success', 'Bill is within tolerance limits');
            } catch (err) {
                log.error('Bill Validation Error', err.message);
                throw new Error('Bill validation failed: ' + err.message);
            }
        };

        /**
         * Load PO data (items and expenses amounts)
         */
        function loadPoData(poId) {
            const poData = {
                totalAmount: 0,
                items: {},
                expenses: {}
            };

            try {
                const poRec = record.load({
                    type: record.Type.PURCHASE_ORDER,
                    id: poId,
                    isDynamic: false
                });

                // Get the total PO amount
                poData.totalAmount = parseFloat(poRec.getValue({ fieldId: 'total' })) || 0;

                // Load item sublist
                const itemLineCount = poRec.getLineCount({ sublistId: 'item' }) || 0;
                for (let i = 0; i < itemLineCount; i++) {
                    const lineNum = poRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'line',
                        line: i
                    });
                    const amount = parseFloat(poRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'amount',
                        line: i
                    })) || 0;
                    const quantity = parseFloat(poRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i
                    })) || 0;

                    poData.items[String(lineNum)] = {
                        lineNum: lineNum,
                        amount: amount,
                        quantity: quantity,
                        type: 'item'
                    };
                }

                // Load expense sublist
                const expenseLineCount = poRec.getLineCount({ sublistId: 'expense' }) || 0;
                for (let i = 0; i < expenseLineCount; i++) {
                    const lineNum = poRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'line',
                        line: i
                    });
                    const amount = parseFloat(poRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'amount',
                        line: i
                    })) || 0;
                    const category = poRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'category',
                        line: i
                    });

                    poData.expenses[String(lineNum)] = {
                        lineNum: lineNum,
                        category: category,
                        amount: amount,
                        type: 'expense'
                    };
                }

                log.debug('PO Data Loaded', JSON.stringify(poData));
            } catch (err) {
                log.error('Error loading PO data', err);
                throw new Error('Failed to load PO data: ' + err.message);
            }

            return poData;
        }

        /**
         * Extract bill line items (both item and expense lines)
         */
        function getBillLines(billRecord) {
            const billLines = [];

            // Get item sublist lines
            const itemLineCount = billRecord.getLineCount({ sublistId: 'item' }) || 0;
            for (let i = 0; i < itemLineCount; i++) {
                // Select the line first
                billRecord.selectLine({ sublistId: 'item', line: i });
                
                const lineNum = billRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'line'
                });
                const amount = parseFloat(billRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount'
                })) || 0;
                const quantity = parseFloat(billRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity'
                })) || 0;

                billLines.push({
                    lineNum: lineNum,
                    amount: amount,
                    quantity: quantity,
                    type: 'item'
                });

                // Commit the line
                billRecord.commitLine({ sublistId: 'item' });
            }

            // Get expense sublist lines
            const expenseLineCount = billRecord.getLineCount({ sublistId: 'expense' }) || 0;
            for (let i = 0; i < expenseLineCount; i++) {
                // Select the line first
                billRecord.selectLine({ sublistId: 'expense', line: i });
                
                const lineNum = billRecord.getCurrentSublistValue({
                    sublistId: 'expense',
                    fieldId: 'line'
                });
                const amount = parseFloat(billRecord.getCurrentSublistValue({
                    sublistId: 'expense',
                    fieldId: 'amount'
                })) || 0;
                const category = billRecord.getCurrentSublistValue({
                    sublistId: 'expense',
                    fieldId: 'category'
                });

                billLines.push({
                    lineNum: lineNum,
                    category: category,
                    amount: amount,
                    type: 'expense'
                });

                // Commit the line
                billRecord.commitLine({ sublistId: 'expense' });
            }

            log.debug('Bill Lines', JSON.stringify(billLines));
            return billLines;
        }

        /**
         * Validate bill against PO with tolerance check
         * Calculates total of ALL bill lines and checks if within tolerance of PO total
         */
        function validateBillAgainstPO(billLines, poData, tolerancePercent) {
            const result = {
                isValid: true,
                errorMessage: '',
                totalBillAmount: 0,
                totalPoAmount: poData.totalAmount,
                totalVariance: 0,
                variancePercent: 0
            };

            // Calculate total amount from ALL bill lines
            let totalBillAmount = 0;
            for (let i = 0; i < billLines.length; i++) {
                totalBillAmount += billLines[i].amount;
            }

            result.totalBillAmount = totalBillAmount;
            
            // Calculate variance between bill total and PO total
            const totalVariance = totalBillAmount - result.totalPoAmount;
            const totalVariancePercent = result.totalPoAmount > 0 
                ? (Math.abs(totalVariance) / result.totalPoAmount) * 100 
                : 0;

            result.totalVariance = totalVariance;
            result.variancePercent = totalVariancePercent;

            log.debug('Bill Total Validation', {
                totalBillAmount: totalBillAmount,
                totalPoAmount: result.totalPoAmount,
                totalVariance: totalVariance,
                variancePercent: totalVariancePercent,
                tolerancePercent: tolerancePercent
            });

            // Check if total bill amount INCREASES beyond tolerance
            // Only throw validation error if bill amount is GREATER than PO amount
            if (totalVariance > 0 && totalVariancePercent > tolerancePercent) {
                result.isValid = false;
                result.errorMessage = 
                    `Bill total exceeds PO amount beyond ${tolerancePercent}% tolerance. ` +
                    `Bill Total: ${totalBillAmount.toFixed(2)}, ` +
                    `PO Total: ${result.totalPoAmount.toFixed(2)}, ` +
                    `Variance: ${totalVariance.toFixed(2)} (${totalVariancePercent.toFixed(2)}%)`;
            } else if (totalVariance <= 0) {
                // Bill amount is equal to or LESS than PO amount - ALLOW
                log.debug('Bill amount is within or below PO amount', 'No validation error thrown');
            }

            log.debug('Validation Result', JSON.stringify(result));
            return result;
        }

        return { onAction };
    });
