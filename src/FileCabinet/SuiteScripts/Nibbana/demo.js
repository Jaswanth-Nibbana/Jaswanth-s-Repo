
/**
 * @description User Event Before Submit:
 * - Checks if PO is approved and edited.
 * - If amount exceeds tolerance, resets approval status.
 * - Inactivates all audit trail records.
 * - Re-triggers approval process starting from first approver.
 */
function beforeSubmit(context) {
    if (context.type === 'edit') {
        var poRecord = context.newRecord;
        if (String(poRecord.getValue('approvalstatus')) === String(approvalUtil.CONST.APPROVAL_STATUS.APPROVED)) {
            var toleranceAmount = parseFloat(poRecord.getValue('custrecord_zeta_tac_tolerance_amt')) || 0;
            var tolerancePercent = parseFloat(poRecord.getValue('custrecord_zeta_tac_percent_tolerance')) || 0;
            var poAmount = parseFloat(poRecord.getValue('total')) || 0;
            var originalAmount = parseFloat(poRecord.getValue('custbody_zeta_approvals_tran_orig_ammt')) || 0;

            if (poAmount > originalAmount) {
                var amountDiff = poAmount - originalAmount;
                var percentDiff = (amountDiff / originalAmount) * 100;

                if (amountDiff > toleranceAmount || percentDiff > tolerancePercent) {
                    log.debug('Tolerance Breach', 'Resetting approval process');
                    poRecord.setValue({ fieldId: 'approvalstatus', value: approvalUtil.CONST.APPROVAL_STATUS.PENDING });

                    // Inactivate all audit trail records
                    approvalUtil.inactivateAuditTrailRecords(poRecord.id);

                    // Re-trigger approval process
                    var configId = approvalUtil.getApprovalConfigForPo(poRecord);
                    if (configId) {
                        var seqRules = approvalUtil.getSequenceRules(configId);
                        var firstSeq = approvalUtil.getDistinctSequences(seqRules)[0];
                        var expandedApprovers = approvalUtil.expandSequenceApprovers(seqRules, firstSeq, poRecord);
                        if (expandedApprovers.length) {
                            var firstApprover = expandedApprovers[0];
                            var ar = record.create({ type: approvalUtil.CONST.REC.APPR_AUDIT_TRAIL });
                            ar.setValue(approvalUtil.CONST.FIELD.AAT_TRANSACTION, poRecord.id);
                            ar.setValue(approvalUtil.CONST.FIELD.AAT_SEQUENCE, firstApprover.seqLabel);
                            ar.setValue(approvalUtil.CONST.FIELD.AAT_TYPE, firstApprover.approverType);
                            if (firstApprover.approverType === approvalUtil.CONST.APPROVER_TYPE.ROLE) {
                                ar.setValue(approvalUtil.CONST.FIELD.AAT_ROLE, firstApprover.roleId);
                                poRecord.setValue({ fieldId: 'custbody_zeta_approvals_nxt_role', value: firstApprover.roleId });
                                poRecord.setValue({ fieldId: 'custbody_zeta_approvals_nxt_approvers', value: '' });
                            } else {
                                ar.setValue(approvalUtil.CONST.FIELD.AAT_APPROVER, firstApprover.id);
                                poRecord.setValue({ fieldId: 'custbody_zeta_approvals_nxt_approvers', value: firstApprover.id });
                                poRecord.setValue({ fieldId: 'custbody_zeta_approvals_nxt_role', value: '' });
                            }
                            ar.setValue(approvalUtil.CONST.FIELD.AAT_STATUS, approvalUtil.CONST.APPROVAL_STATUS.PENDING);
                            ar.save();
                        }
                    }
                }
            }
        }
    }
}
