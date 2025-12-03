/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/email', 'N/runtime', 'N/log', './zeta_approvals_util', 'N/currency'], function (record, search, email, runtime, log, approvalUtil, currency) {

    /** ---------------- BEFORE LOAD ---------------- **/
    function beforeLoad(context) {
        try {

            var form = context.form;
            var poRecord = context.newRecord;
            var approvalStatus = poRecord.getValue('approvalstatus');
            var currentUserId = runtime.getCurrentUser().id;
            log.debug('beforeLoad', 'Current User ID: ' + currentUserId + ', Approval Status: ' + approvalStatus);

            // handle record creation/copy initialization (these run during CREATE/COPY events)
            if (context.type == 'create' || context.type == 'copy') {
                try {
                    log.debug('beforeLoad:init', 'Initializing approval fields on PO creation/copy');
                    poRecord.setValue({ fieldId: 'custbody_cretd_by', value: currentUserId });
                    poRecord.setValue({ fieldId: 'memo', value: "Test" });
                    poRecord.setValue({ fieldId: approvalUtil.CONST.PO_FIELD.ORIG_AMT, value: '' });
                    poRecord.setValue({ fieldId: approvalUtil.CONST.PO_FIELD.NEXT_APPROVERS, value: [''] });
                    poRecord.setValue({ fieldId: approvalUtil.CONST.PO_FIELD.SUPERAPPROVED, value: false });
                    poRecord.setValue({ fieldId: 'custbody_zeta_approvals_rej_reason', value: '' });
                } catch (e) { log.debug('beforeLoad:init', e); }
            }

            if (context.type == 'view') {
                // Add Submit button if PO is not yet submitted
                if ((!poRecord.getValue('custbody_po_approved_by') && String(approvalStatus) == String(approvalUtil.CONST.APPROVAL_STATUS.PENDING)) || approvalStatus == String(approvalUtil.CONST.APPROVAL_STATUS.REJECTED)) {
                    form.addButton({
                        id: 'custpage_submit_btn',
                        label: 'Submit for Approval',
                        functionName: 'onSubmitApproval'
                    });
                }

                // Add Approve/Reject buttons only if current user is an active approver (including role-based)
                if (approvalStatus == String(approvalUtil.CONST.APPROVAL_STATUS.PENDING)) {
                    if (isUserApprover(poRecord, currentUserId)) {
                        form.addButton({
                            id: 'custpage_approve_btn',
                            label: 'Approve - Test',
                            functionName: 'onApprove'
                        });
                        form.addButton({
                            id: 'custpage_reject_btn',
                            label: 'Reject - Test',
                            functionName: 'onReject'
                        });
                    }

                    // Add Super Approve button if user is Super Approver
                    if (isSuperApprover(poRecord, currentUserId)) {
                        form.addButton({
                            id: 'custpage_superapprove_btn',
                            label: 'Super Approve',
                            functionName: 'onSuperApprove'
                        });
                    }
                }

                // Attach Client Script
                form.clientScriptModulePath = 'SuiteScripts/Nibbana Consulting/Purchase Order/zeta_cl_approvals_buttons.js';
            }

        } catch (e) {
            log.error('Error in beforeLoad', e);
        }
    }

    /** ---------------- BEFORE SUBMIT ---------------- **/
    /**
     * @description User Event Before Submit:
     * - Checks if PO is approved and edited or if any lines were modified.
     * - If amount exceeds tolerance, resets approval status.
     * - Inactivates all audit trail records.
     * - Re-triggers approval process starting from first approver.
     */
    function beforeSubmit(context) {
        try {
            var poRecord = context.newRecord;
            var oldRecord = context.oldRecord;

            var poAmount = parseFloat(poRecord.getValue('total')) || 0;
            var originalAmount = parseFloat(poRecord.getValue(approvalUtil.CONST.PO_FIELD.ORIG_AMT)) || 0;

            if (context.type === 'create' || context.type === 'copy') {
                // set original amount on create/copy
                poRecord.setValue({ fieldId: approvalUtil.CONST.PO_FIELD.ORIG_AMT, value: poAmount });
                log.debug('beforeSubmit', 'Set original amount on create/copy: ' + poAmount);
            }

            // Tolerance check on edit
            if (context.type === 'edit') { // Approved

                if (String(poRecord.getValue('approvalstatus')) == String(approvalUtil.CONST.APPROVAL_STATUS.APPROVED)) {
                    // Check if amount changed
                    if (checkToleranceWithCurrency(poRecord)) {
                        poRecord.setValue({
                            fieldId: 'approvalstatus',
                            value: String(approvalUtil.CONST.APPROVAL_STATUS.PENDING)
                        });
                        log.debug('beforeSubmit', 'Amount change exceeds tolerance. Re-triggering approval process.');
                        retriggerApprovalProcess(poRecord);
                    }
                }

                // One more check if PO lines were modified such as sub-bu, department, class, etc.
                // Check both item and expense lines
                // check if new lines are added or existing lines are removed from old record
                var oldLineCountItem = oldRecord.getLineCount({ sublistId: 'item' });
                var lineCountItem = poRecord.getLineCount({ sublistId: 'item' });
                var oldLineCountExpense = oldRecord.getLineCount({ sublistId: 'expense' });
                var lineCountExpense = poRecord.getLineCount({ sublistId: 'expense' });

                var retriggerNeeded = false;

                if (oldLineCountItem !== lineCountItem || oldLineCountExpense !== lineCountExpense) {
                    poRecord.setValue({ fieldId: 'approvalstatus', value: String(approvalUtil.CONST.APPROVAL_STATUS.PENDING) }); // Pending Approval
                    //retriggerApprovalProcess(poRecord);
                    retriggerNeeded = true;
                }

                // Compare monitored fields for each line
                var monitoredFields = ['class'];

                if (!retriggerNeeded) {
                    retriggerNeeded = checkLineChanges(newRec, oldRec, 'item', monitoredFields) ||
                        checkLineChanges(newRec, oldRec, 'expense', monitoredFields);
                }

                if (retriggerNeeded) {
                    log.debug('beforeSubmit', 'Line-level changes detected. Re-triggering approval process.');
                    retriggerApprovalProcess(poRecord);
                }

            }
        } catch (e) {
            log.error('Error in beforeSubmit', e);
        }
    }

    /** ---------------- AFTER SUBMIT ---------------- **/
    function afterSubmit(context) {
        try {

        } catch (e) {
            log.error('Error in afterSubmit', e);
        }
    }

    /** ---------------- Helper Functions ---------------- **/

    /**
     * Determine if current user is an active approver for this PO.
     * Only checks the active sequence (lowest pending sequence number).
     */
    function isUserApprover(poRecord, userId) {
        try {
            var poId = poRecord.id || poRecord.getValue('id');
            if (!poId || !userId) return false;
            var currentRole = runtime.getCurrentUser().role;

            // fetch all pending audit rows for this transaction
            var rows = search.create({
                type: approvalUtil.CONST.REC.APPR_AUDIT_TRAIL,
                filters: [
                    [approvalUtil.CONST.FIELD.AAT_TRANSACTION, 'anyof', poId],
                    'AND', [approvalUtil.CONST.FIELD.AAT_STATUS, 'is', approvalUtil.CONST.APPROVAL_STATUS.PENDING]
                ],
                columns: [
                    'internalid',
                    approvalUtil.CONST.FIELD.AAT_SEQUENCE,
                    approvalUtil.CONST.FIELD.AAT_APPROVER,
                    approvalUtil.CONST.FIELD.AAT_ROLE
                ]
            }).run().getRange({ start: 0, end: 1000 }) || [];

            if (!rows || rows.length === 0) return false;

            // compute active base sequence (minimum integer part of sequence among pending rows)
            var minBase = null;
            for (var i = 0; i < rows.length; i++) {
                var seqLabel = rows[i].getValue(approvalUtil.CONST.FIELD.AAT_SEQUENCE) || '';
                var base = parseInt(String(seqLabel).split('.')[0], 10);
                if (!isNaN(base)) {
                    if (minBase === null || base < minBase) minBase = base;
                }
            }
            if (minBase === null) return false;

            var prefix = String(minBase) + '.';

            // check only those pending rows that belong to the active base sequence
            for (var j = 0; j < rows.length; j++) {
                var rSeq = rows[j].getValue(approvalUtil.CONST.FIELD.AAT_SEQUENCE) || '';
                if (String(rSeq).indexOf(prefix) !== 0) continue; // not in active sequence

                var approverId = rows[j].getValue(approvalUtil.CONST.FIELD.AAT_APPROVER);
                var roleId = rows[j].getValue(approvalUtil.CONST.FIELD.AAT_ROLE);

                // match by employee internal id OR by role internal id
                if (approverId && String(approverId) === String(userId)) return true;
                if (roleId && String(roleId) === String(currentRole)) return true;
            }

            return false;
        } catch (e) {
            log.error('isUserApprover', e);
            return false;
        }
    }

    function isSuperApprover(poRecord, userId) {
        var superApproverId = getSuperApprover(poRecord)

        return userId == superApproverId;
    }

    function getSuperApprover(poRecord) {
        // use util's config lookup
        var configId = approvalUtil.getApprovalConfigForPo(poRecord);
        if (!configId) return null;

        var configRec = record.load({
            type: approvalUtil.CONST.REC.TRAN_APPR_CONFIG,
            id: configId
        });

        return configRec.getValue(approvalUtil.CONST.FIELD.TAC_SUPER_APPROVER); // Employee ID
    }

    /**
     * @description Re-trigger the approval process for a PO.
     * - Marks all existing audit trail rows inactive.
     * - Fetches approval configuration and sequence rules.
     * - Activates the first approver in the first sequence.
     * - Updates PO fields for next approver or role.
     *
     * @param {Record} poRecord - Loaded Purchase Order record object.
     */
    function retriggerApprovalProcess(poRecord) {
        try {
            // Mark existing audit rows inactive
            inactivateAuditTrailRecords(poRecord.id);

            // Get approval config and sequence rules
            var configId = getApprovalConfigForPo(poRecord);
            if (!configId) {
                log.debug('retriggerApprovalProcess', 'No approval config found for PO.');
                return;
            }

            var seqRules = getSequenceRules(configId);
            log.debug('retriggerApprovalProcess', 'Sequence Rules: ' + JSON.stringify(seqRules));

            var firstSeq = getDistinctSequences(seqRules)[0];
            log.debug('retriggerApprovalProcess', 'First Sequence: ' + firstSeq);

            var expandedApprovers = expandSequenceApprovers(seqRules, firstSeq, poRecord);
            log.debug('retriggerApprovalProcess', 'Expanded Approvers: ' + JSON.stringify(expandedApprovers));

            if (expandedApprovers.length) {
                var firstApprover = expandedApprovers[0];
                log.debug('retriggerApprovalProcess', 'First Approver: ' + JSON.stringify(firstApprover));

                // Create new audit row for first approver
                var ar = record.create({ type: CONST.REC.APPR_AUDIT_TRAIL });
                ar.setValue(CONST.FIELD.AAT_TRANSACTION, poRecord.id);
                ar.setValue(CONST.FIELD.AAT_SEQUENCE, firstApprover.seqLabel);
                ar.setValue(CONST.FIELD.AAT_TYPE, firstApprover.approverType);

                if (firstApprover.approverType === CONST.APPROVER_TYPE.ROLE) {
                    ar.setValue(CONST.FIELD.AAT_ROLE, firstApprover.roleId);
                    poRecord.setValue({ fieldId: 'custbody_zeta_approvals_nxt_approvers', value: '' });
                    //poRecord.setValue({ fieldId: 'custbody_zeta_approvals_nxt_role', value: firstApprover.roleId });
                } else {
                    ar.setValue(CONST.FIELD.AAT_APPROVER, firstApprover.id);
                    poRecord.setValue({ fieldId: 'custbody_zeta_approvals_nxt_approvers', value: firstApprover.id });
                    //poRecord.setValue({ fieldId: 'custbody_zeta_approvals_nxt_role', value: '' });
                }

                ar.setValue(CONST.FIELD.AAT_STATUS, CONST.APPROVAL_STATUS.PENDING);
                ar.save();
            }
        } catch (e) {
            log.error('retriggerApprovalProcess', e);
        }
    }

    /**
     * @description Checks if any monitored fields changed between old and new record for a given sublist.
     */
    function checkLineChanges(newRec, oldRec, sublistId, fields) {
        var newCount = newRec.getLineCount({ sublistId: sublistId });
        var oldCount = oldRec.getLineCount({ sublistId: sublistId });
        var maxCount = Math.max(newCount, oldCount);

        for (var i = 0; i < maxCount; i++) {
            for (var f = 0; f < fields.length; f++) {
                var fieldId = fields[f];
                var newVal = newRec.getSublistValue({ sublistId: sublistId, fieldId: fieldId, line: i }) || '';
                var oldVal = oldRec.getSublistValue({ sublistId: sublistId, fieldId: fieldId, line: i }) || '';
                if (String(newVal) !== String(oldVal)) {
                    return true;
                }
            }
        }
        return false;
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
});
