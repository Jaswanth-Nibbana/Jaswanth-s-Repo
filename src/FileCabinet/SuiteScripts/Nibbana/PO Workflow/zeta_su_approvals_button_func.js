/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
    'N/email', 'N/record', 'N/search', 'N/ui/serverWidget', 'N/runtime', 'N/log',
    './zeta_approvals_util'
],
/**
 * @param{email} email
 * @param{record} record
 * @param{search} search
 * @param{serverWidget} serverWidget
 * @param{runtime} runtime
 * @param{log} log
 * @param{approvalUtil} approvalUtil
 */
(email, record, search, serverWidget, runtime, log, approvalUtil) => {

    const CONST = approvalUtil.CONST;

    const onRequest = (scriptContext) => {
        try {
            if (scriptContext.request.method == 'GET'){
                const params = scriptContext.request.parameters;
                const recId = params.recid;
                const action = params.action;
                if (!recId || !action) return;
                log.debug('onRequest', 'Action: ' + action + ', Rec ID: ' + recId);

                const userId = runtime.getCurrentUser().id;
                if (action == 'submit') {
                    submitPo(recId, userId);
                } else if (action == 'approve') {
                    approvePo(recId, userId);
                } else if (action == 'reject') {
                    rejectPo(recId, userId, params.reason || '');
                } else if (action == 'superapprove') {
                    superApprovePo(recId, userId);
                }
            }
            
        } catch (e) {
            log.error('onRequest', e);
        }
    };

    /**
     * Submit PO for approval:
     * - Sets initial approver (first in sequence).
     * - Creates audit trail for that approver only.
     * - Updates PO fields based on approver type (employee vs role).
     */
    function submitPo(poId, submittedBy) {
        try {
            
            const poRec = record.load({ type: record.Type.PURCHASE_ORDER, id: poId });
            const configId = approvalUtil.getApprovalConfigForPo(poRec);
            if (!configId) { log.debug('submitPo', 'No Transaction Approval Config found'); return; }

            const seqRules = approvalUtil.getSequenceRules(configId);
            if (!seqRules.length) { log.debug('submitPo', 'No sequence rules defined'); return; }

            const distinctSeqs = approvalUtil.getDistinctSequences(seqRules);
            const firstSeq = distinctSeqs[0];

            const expandedApprovers = approvalUtil.expandSequenceApprovers(seqRules, firstSeq, poRec);
            if (!expandedApprovers.length) { log.debug('submitPo', 'No approvers resolved for first sequence'); return; }

            // Sort and pick first approver
            const activeApprovers = dedupeApprovers(expandedApprovers).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
            const firstApprover = activeApprovers[0];
            if (!firstApprover) { log.debug('submitPo', 'No approver found'); return; }

            // Create audit trail for first approver only
            createAuditTrailForApprovers(poId, [firstApprover]);

            // Prepare PO field updates
            let poFieldValues = { 
                approvalstatus: CONST.APPROVAL_STATUS.PENDING, 
                custbody_po_approved_by: submittedBy,
                custbody_zeta_approvals_rej_reason: '' 
            };
            if (firstApprover.approverType === CONST.APPROVER_TYPE.ROLE) {
                //poFieldValues.custbody_zeta_approvals_nxt_role = firstApprover.roleId;
                poFieldValues.custbody_zeta_approvals_nxt_approvers = null;
            } else {
                poFieldValues.custbody_zeta_approvals_nxt_approvers = firstApprover.id;
                //poFieldValues.custbody_zeta_approvals_nxt_role = null;
            }

            record.submitFields({
                type: record.Type.PURCHASE_ORDER,
                id: poId,
                values: poFieldValues,
                options: { enableSourcing: false, ignoreMandatoryFields: true }
            });

            // Send email notification
            //sendEmailToApprovers([firstApprover], poId);

        } catch (e) {
            log.error('submitPo', e);
        }
    }

    /* ---------- Approve: validate user can approve, update current audit row, create next sequence ---------- */
    function approvePo(poId, userId) {
        try {
            const poRec = record.load({ type: record.Type.PURCHASE_ORDER, id: poId });
            const pendingRows = approvalUtil.findPendingAuditRows(poId);
            // log pending rows found
            log.debug('approvePo', 'Found ' + pendingRows.length + ' pending audit rows for PO ' + poId);
            log.debug('approvePo', 'Pending Rows: ' + JSON.stringify(pendingRows.map(r => ({ id: r.id, seq: r.getValue(CONST.FIELD.AAT_SEQUENCE), approver: r.getValue(CONST.FIELD.AAT_APPROVER), role: r.getValue(CONST.FIELD.AAT_ROLE) }))));
            if (!pendingRows.length) { log.debug('approvePo', 'No pending audit rows for PO ' + poId); return; }

            const currentUserRole = runtime.getCurrentUser().role;
            log.debug('approvePo', 'User ID: ' + userId + ', Role ID: ' + currentUserRole);

            let rowToApprove = null;

            // Find the audit row the user is authorized to approve
            for (let i = 0; i < pendingRows.length; i++) {
                const r = pendingRows[i];
                const approverId = r.getValue(CONST.FIELD.AAT_APPROVER);
                const roleId = r.getValue(CONST.FIELD.AAT_ROLE);
                if (approverId && String(approverId) === String(userId)) { rowToApprove = r; break; }
                if (roleId && String(roleId) === String(currentUserRole)) { rowToApprove = r; break; }
            }

            if (!rowToApprove) { log.debug('approvePo', 'User not authorized to approve any pending audit row for PO ' + poId); return; }

            // Approve the current audit row
            const ar = record.load({ type: CONST.REC.APPR_AUDIT_TRAIL, id: rowToApprove.id });
            const seqLabel = ar.getValue(CONST.FIELD.AAT_SEQUENCE) || '';
            const baseSeq = parseInt(String(seqLabel).split('.')[0], 10) || 0;
            ar.setValue(CONST.FIELD.AAT_STATUS, CONST.APPROVAL_STATUS.APPROVED);
            ar.setValue(CONST.FIELD.AAT_DATETIME, new Date());
            ar.setValue(CONST.FIELD.AAT_APPROVER, userId);
            ar.save({ enableSourcing: false, ignoreMandatoryFields: true });

            // Prepare PO updates
            const poUpdates = { custbody_po_approved_by: userId };

            // Get approval config and sequence rules
            const configId = approvalUtil.getApprovalConfigForPo(poRec);
            if (!configId) return;
            const seqRules = approvalUtil.getSequenceRules(configId);
            log.debug('approvePo', 'Approval Config ID: ' + configId + ', Sequence Rules Count: ' + seqRules.length);
            log.debug('approvePo', 'Sequence Rules: ' + JSON.stringify(seqRules));

            // Get all approved audit rows for this PO
            const allAuditRows = search.create({
                type: CONST.REC.APPR_AUDIT_TRAIL,
                filters: [
                    [CONST.FIELD.AAT_TRANSACTION, 'anyof', poId],
                    'AND',
                    [CONST.FIELD.AAT_STATUS, 'anyof', CONST.APPROVAL_STATUS.APPROVED]
                ],
                columns: [CONST.FIELD.AAT_SEQUENCE]
            }).run().getRange({ start: 0, end: 1000 }) || [];

            const approvedLabels = allAuditRows.map(r => r.getValue(CONST.FIELD.AAT_SEQUENCE));
            log.debug('approvePo', 'Approved Audit Sequence Labels: ' + JSON.stringify(approvedLabels));

            // Filter remaining approvers in current sequence
            const expandedApprovers = approvalUtil.expandSequenceApprovers(seqRules, baseSeq, poRec)
                .sort((a, b) => a.orderIndex - b.orderIndex);
            log.debug('approvePo', 'Expanded Approvers in Current Sequence: ' + JSON.stringify(expandedApprovers));

            const remainingApprovers = expandedApprovers.filter(a => !approvedLabels.includes(a.seqLabel));
            log.debug('approvePo', 'Remaining Approvers in Current Sequence: ' + JSON.stringify(remainingApprovers));

            if (remainingApprovers.length) {
                // Activate next approver in same sequence
                const nextApprover = remainingApprovers[0];
                createAuditTrailForApprovers(poId, [nextApprover]);
                if (nextApprover.approverType === CONST.APPROVER_TYPE.ROLE) {
                    //poUpdates.custbody_zeta_approvals_nxt_role = nextApprover.roleId;
                    poUpdates.custbody_zeta_approvals_nxt_approvers = null;
                } else {
                    poUpdates.custbody_zeta_approvals_nxt_approvers = nextApprover.id;
                    //poUpdates.custbody_zeta_approvals_nxt_role = null;
                }
                record.submitFields({ type: record.Type.PURCHASE_ORDER, id: poId, values: poUpdates, options: { enableSourcing: false, ignoreMandatoryFields: true } });
                return;
            }

            // If no approvers left in current sequence, activate next sequence
            const distinctSeqs = approvalUtil.getDistinctSequences(seqRules);
            log.debug('approvePo', 'Distinct Sequences: ' + JSON.stringify(distinctSeqs));

            const idx = distinctSeqs.indexOf(baseSeq);
            log.debug('approvePo', 'Current Sequence Index: ' + idx);

            //log next sequence info
            log.debug('approvePo', 'Current Sequence: ' + baseSeq + ', Next Sequence Index: ' + (idx + 1) + ', Next Sequence: ' + (idx >= 0 && idx < distinctSeqs.length - 1 ? distinctSeqs[idx + 1] : 'N/A'));
            
            // Loop through all remaining sequences
            for (let i = idx + 1; i < distinctSeqs.length; i++) {
                const nextSeq = distinctSeqs[i];
                const existingLabels = approvalUtil.getExistingAuditSequenceLabels(poId);
                const prefix = String(nextSeq) + '.';
                const alreadyExists = existingLabels.some(lbl => String(lbl).startsWith(prefix));
                if (alreadyExists) continue;

                const expanded = approvalUtil.expandSequenceApprovers(seqRules, nextSeq, poRec);
                if (expanded.length) {
                    // Found approvers in next sequence → activate first approver and stop
                    const nextApprover = dedupeApprovers(expanded)[0];
                    createAuditTrailForApprovers(poId, [nextApprover]);
                    let poFieldValues = { approvalstatus: CONST.APPROVAL_STATUS.PENDING, custbody_po_approved_by: userId };
                    if (nextApprover.approverType === CONST.APPROVER_TYPE.ROLE) {
                        //poFieldValues.custbody_zeta_approvals_nxt_role = nextApprover.roleId;
                        poFieldValues.custbody_zeta_approvals_nxt_approvers = null;
                    } else {
                        poFieldValues.custbody_zeta_approvals_nxt_approvers = nextApprover.id;
                        //poFieldValues.custbody_zeta_approvals_nxt_role = null;
                    }
                    record.submitFields({ type: record.Type.PURCHASE_ORDER, id: poId, values: poFieldValues, options: { enableSourcing: false, ignoreMandatoryFields: true } });
                    return;
                }
                // If no approvers, continue to next sequence
            }

            // if (idx >= 0 && idx < distinctSeqs.length - 1) {
            //     const nextSeq = distinctSeqs[idx + 1];
            //     const existingLabels = approvalUtil.getExistingAuditSequenceLabels(poId);
            //     log.debug('approvePo', 'Next Sequence: ' + nextSeq + ', Existing Audit Labels: ' + JSON.stringify(existingLabels));

            //     const prefix = String(nextSeq) + '.';
            //     const alreadyExists = existingLabels.some(lbl => String(lbl).indexOf(prefix) === 0);
            //     log.debug('approvePo', 'Already exists: ' + alreadyExists);

            //     if (!alreadyExists) {
            //         const expanded = approvalUtil.expandSequenceApprovers(seqRules, nextSeq, poRec);
            //         log.debug('approvePo', 'Expanded Approvers in Next Sequence: ' + JSON.stringify(expanded));

            //         if (expanded.length) {
            //             const deduped = dedupeApprovers(expanded).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
            //             const nextApprover = deduped[0]; // Only first approver
            //             log.debug('approvePo', 'Next Approver in Next Sequence: ' + JSON.stringify(nextApprover));

            //             if (nextApprover) {
            //                 createAuditTrailForApprovers(poId, [nextApprover]);
            //                 let poFieldValues = { approvalstatus: CONST.APPROVAL_STATUS.PENDING, custbody_po_approved_by: userId };
            //                 if (nextApprover.approverType === CONST.APPROVER_TYPE.ROLE) {
            //                     //poFieldValues.custbody_zeta_approvals_nxt_role = nextApprover.roleId;
            //                     poFieldValues.custbody_zeta_approvals_nxt_approvers = null;
            //                 } else {
            //                     poFieldValues.custbody_zeta_approvals_nxt_approvers = nextApprover.id;
            //                     //poFieldValues.custbody_zeta_approvals_nxt_role = null;
            //                 }
            //                 record.submitFields({ type: record.Type.PURCHASE_ORDER, id: poId, values: poFieldValues, options: { enableSourcing: false, ignoreMandatoryFields: true } });
            //                 return;
            //             }
            //         }
            //     }
            // }

            // Fully approved only if no next sequence exists
            poUpdates.approvalstatus = CONST.APPROVAL_STATUS.APPROVED;
            poUpdates.custbody_zeta_approvals_nxt_approvers = null;
            poUpdates.custbody_zeta_approvals_tran_orig_ammt = poRec.getValue('total');
            //poUpdates.custbody_zeta_approvals_nxt_role = null;
            record.submitFields({ type: record.Type.PURCHASE_ORDER, id: poId, values: poUpdates, options: { enableSourcing: false, ignoreMandatoryFields: true } });
            log.debug('approvePo', 'PO fully approved: ' + poId);

        } catch (e) {
            log.error('approvePo', e);
        }
    }

    /**
     * @description Rejects a Purchase Order (PO) by the current user or specified user.
     * - Validates if the user is authorized to reject (employee or role-level approver).
     * - Updates the audit trail for the approver's row to REJECTED.
     * - Updates the PO status and rejection reason.
     *
     * @param {number} poId - Internal ID of the Purchase Order.
     * @param {number} userId - Internal ID of the user performing the rejection (optional).
     * @param {string} reason - Reason for rejection (optional).
     */
    function rejectPo(poId, userId, reason) {
        try {
            // Get current user details if userId not provided
            const uid = userId || runtime.getCurrentUser().id;
            const currentUserRole = runtime.getCurrentUser().role;

            // Fetch all pending audit rows for this PO
            const pendingRows = approvalUtil.findPendingAuditRows(poId) || [];
            log.debug('rejectPo', 'Found ' + pendingRows.length + ' pending audit rows for PO ' + poId);
            log.debug('rejectPo', 'Pending Rows: ' + JSON.stringify(pendingRows.map(r => ({
                id: r.id,
                seq: r.getValue(CONST.FIELD.AAT_SEQUENCE),
                approver: r.getValue(CONST.FIELD.AAT_APPROVER),
                role: r.getValue(CONST.FIELD.AAT_ROLE)
            }))));

            // If no pending rows, nothing to reject
            if (!pendingRows.length) return;

            // Determine the active base sequence (lowest sequence number among pending rows)
            let minBase = null;
            pendingRows.forEach(function(r) {
                const seq = r.getValue(CONST.FIELD.AAT_SEQUENCE) || '';
                const base = parseInt(String(seq).split('.')[0], 10);
                if (!isNaN(base) && (minBase === null || base < minBase)) minBase = base;
            });
            if (minBase === null) return;

            // Prefix for active sequence rows (e.g., "1.")
            const prefix = String(minBase) + '.';

            // Loop through pending rows in active sequence
            for (let r of pendingRows) {
                const seq = r.getValue(CONST.FIELD.AAT_SEQUENCE) || '';
                if (!String(seq).startsWith(prefix)) continue; // Skip rows not in active sequence

                const approverId = r.getValue(CONST.FIELD.AAT_APPROVER);
                const roleId = r.getValue(CONST.FIELD.AAT_ROLE);

                // Check if current user is authorized to reject (employee or role match)
                const canReject = (approverId && String(approverId) === String(uid)) ||
                                (roleId && String(roleId) === String(currentUserRole));
                log.debug('rejectPo', `Evaluating row ID ${r.id}: canReject = ${canReject}`);

                if (!canReject) continue;

                // Load audit trail record and update status to REJECTED
                const ar = record.load({ type: CONST.REC.APPR_AUDIT_TRAIL, id: r.id });
                ar.setValue(CONST.FIELD.AAT_STATUS, CONST.APPROVAL_STATUS.REJECTED);
                ar.setValue(CONST.FIELD.AAT_REJ_REASON, reason || '');
                ar.setValue(CONST.FIELD.AAT_DATETIME, new Date());
                ar.save({ enableSourcing: false, ignoreMandatoryFields: true });

                log.audit('rejectPo', `PO ${poId} rejected by user ${uid} (role: ${currentUserRole})`);
                break; // Stop after first valid rejection
            }

            // Update PO status and rejection reason, clear next approver fields
            record.submitFields({
                type: record.Type.PURCHASE_ORDER,
                id: poId,
                values: {
                    approvalstatus: CONST.APPROVAL_STATUS.REJECTED,
                    custbody_zeta_approvals_rej_reason: reason || '',
                    //custbody_zeta_approvals_nxt_role: null,
                    custbody_zeta_approvals_nxt_approvers: null
                },
                options: { enableSourcing: false, ignoreMandatoryFields: true }
            });
        } catch (e) {
            log.error('rejectPo', e);
        }
    }

    /* ---------- Super-approve ---------- */
    function superApprovePo(poId, userId) {
        try {
            const pendingRows = approvalUtil.findPendingAuditRows(poId);
            pendingRows.forEach(function(r) {
                const ar = record.load({ type: CONST.REC.APPR_AUDIT_TRAIL, id: r.id });
                ar.setValue(CONST.FIELD.AAT_STATUS, CONST.APPROVAL_STATUS.APPROVED);
                ar.setValue(CONST.FIELD.AAT_SUPER_APPROVED, true);
                ar.setValue(CONST.FIELD.AAT_DATETIME, new Date());
                ar.save({ enableSourcing: false, ignoreMandatoryFields: true });
            });
            record.submitFields({
                type: record.Type.PURCHASE_ORDER,
                id: poId,
                values: { 
                    approvalstatus: CONST.APPROVAL_STATUS.APPROVED, 
                    custbody_zeta_approvals_superapp_aprvd: true, 
                    custbody_po_approved_by: userId, 
                    custbody_zeta_approvals_nxt_approvers: null 
                },
                options: { enableSourcing: false, ignoreMandatoryFields: true }
            });
        } catch (e) {
             log.error('superApprovePo', e);
         }
    }

    /* ---------- Local helpers (use CONST from util) ---------- */
    /**
     * Deduplicate approvers array by approver id or role id, preserving order.
     * approver item shape: { id?, roleId?, approverType }
     */
    function dedupeApprovers(approvers) {
        if (!approvers || !approvers.length) return [];
        const seen = {};
        const out = [];
        for (let i = 0; i < approvers.length; i++) {
            const a = approvers[i];
            const key = a.id ? ('E:' + String(a.id)) : ('R:' + String(a.roleId));
            if (!seen[key]) {
                seen[key] = true;
                out.push(a);
            }
        }
        return out;
    }
    
    /**
     * Create audit trail records for given approvers.
     *
     * @param {number} poId - Internal ID of the Purchase Order.
     * @param {Array<Object>} approvers - Array of approver objects:
     *        - seqLabel {string}: Sequence label (e.g., "1.1").
     *        - approverType {string}: Approver type (EMPLOYEE, ROLE, etc.).
     *        - id {number} (optional): Employee ID.
     *        - roleId {number} (optional): Role ID.
     *        - isLastHierarchy {boolean}: True if last approver in hierarchy.
     *
     * @description
     * Creates one audit trail record per approver with:
     * - Transaction ID
     * - Sequence label
     * - Approver type and ID or role
     * - Status = PENDING
     * - AAT_ISLAST = true if approver is last in hierarchy
     */
    function createAuditTrailForApprovers(poId, approvers) {
        approvers.forEach(function(a) {
            try {
                const ar = record.create({ type: CONST.REC.APPR_AUDIT_TRAIL });
                ar.setValue(CONST.FIELD.AAT_TRANSACTION, poId);
                ar.setValue(CONST.FIELD.AAT_SEQUENCE, a.seqLabel);
                ar.setValue(CONST.FIELD.AAT_TYPE, a.approverType);

                if (a.approverType === CONST.APPROVER_TYPE.ROLE) {
                    ar.setValue(CONST.FIELD.AAT_ROLE, a.roleId);
                } else {
                    ar.setValue(CONST.FIELD.AAT_APPROVER, a.id);
                }

                ar.setValue(CONST.FIELD.AAT_STATUS, CONST.APPROVAL_STATUS.PENDING);
                ar.setValue(CONST.FIELD.AAT_ISLAST, a.isLastHierarchy || false);
                ar.save({ enableSourcing: false, ignoreMandatoryFields: true });
            } catch (e) {
                log.error('createAuditTrailForApprovers', e);
            }
        });
    }

    function sendEmailToApprovers(approvers, poId) {
        approvers.forEach(function(a) {
            try {
                if (a.id) {
                    email.send({
                        author: runtime.getCurrentUser().id,
                        recipients: a.id,
                        subject: 'PO Approval Required - PO #' + poId,
                        body: 'You have a Purchase Order awaiting approval. PO ID: ' + poId
                    });
                }
            } catch (e) { log.debug('sendEmailToApprovers', e); }
        });
    }

    return { onRequest };
});
