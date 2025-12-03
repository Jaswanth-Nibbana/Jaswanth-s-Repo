/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * @description Utility library for PO approval workflow
 */
define(['N/record', 'N/search', 'N/runtime', 'N/log', 'N/currency'], function(record, search, runtime, log, currency) {

    // Constants (internal ids / field ids / record ids)
    const CONST = {
        // Approver types (internal ids)
        APPROVER_TYPE: {
            EMPLOYEE_HIERARCHY: '1',
            EMPLOYEE: '2',
            SUBBU_LINE_EXPENSE: '3',
            SUBBU_LINE_ITEM: '4',
            ROLE: '5'
        },

        // Approval status values (internal ids)
        APPROVAL_STATUS: {
            PENDING: '1',
            APPROVED: '2',
            REJECTED: '3'
        },

        // Custom records
        REC: {
            TRAN_APPR_CONFIG: 'customrecord_zeta_tran_appr_config',
            APPR_SEQ_RULES: 'customrecord_zeta_appr_seq_rules',
            APPR_AUDIT_TRAIL: 'customrecord_zeta_appr_audit_trail'
        },

        // Common custom fields (on PO / records)
        FIELD: {
            // Transaction Approval Config fields
            TAC_TRANS_TYPE: 'custrecord_zeta_tac_trans_type',
            TAC_PERCENT_TOL: 'custrecord_zeta_tac_percent_tolerance',
            TAC_TOL_AMT: 'custrecord_zeta_tac_tolerance_amt',
            TAC_SUPER_APPROVER: 'custrecord_zeta_tac_super_approver', 
            TAC_DEF_CURRENCY: 'custrecord_zeta_tac_def_currency',
            TAC_USE_TRAN_DATE: 'custrecord_zeta_trandate_for_exc_rate',

            // Approval Sequence Rules fields
            ASR_PARENT_CONFIG: 'custrecord_zeta_asr_parent_config',
            ASR_SEQUENCE: 'custrecord_zeta_asr_sequence',
            ASR_APPROVER_TYPE: 'custrecord_zeta_asr_approver_type',
            ASR_APPROVER: 'custrecord_zeta_asr_approver',
            ASR_ROLE_TYPE: 'custrecord_zeta_asr_role_type',
            ASR_MIN_AMOUNT: 'custrecord_zeta_asr_min_amount',

            // Audit Trail fields
            AAT_SEQUENCE: 'custrecord_zeta_aat_sequence',
            AAT_TRANSACTION: 'custrecord_zeta_aat_transaction',
            AAT_APPROVER: 'custrecord_zeta_aat_approver',
            AAT_ROLE: 'custrecord_zeta_aat_role',
            AAT_TYPE: 'custrecord_zeta_aat_type',
            AAT_STATUS: 'custrecord_zeta_aat_status',
            AAT_DATETIME: 'custrecord_zeta_aat_datetime',
            AAT_REJ_REASON: 'custrecord_zeta_aat_rej_reason',
            AAT_ISLAST: 'custrecord_zeta_aat_islastinhierarchy',
            AAT_SUPER_APPROVED: 'custrecord_zeta_aat_super_approved'
        },

        // PO fields
        PO_FIELD: {
            NEXT_APPROVERS: 'custbody_zeta_approvals_nxt_approvers',
            CREATED_BY: 'custbody_cretd_by',
            ORIG_AMT: 'custbody_zeta_approvals_tran_orig_ammt',
            SUPERAPPROVED: 'custbody_zeta_approvals_superapp_aprvd'
        },

        // Default line approver field (override when calling)
        DEFAULT_LINE_APPROVER_FIELD: 'custcol8',

        TRANS_TYPE_MAP: {
            bill: '17',
            billcredit: '20',
            billpayment: '18',
            cashrefund: '29',
            cashsale: '5',
            ccardrefund: '22',
            check: '3',
            creditcard: '21',
            creditmemo: '10',
            currencyrevaluation: '36',
            customerdeposit: '40',
            customerrefund: '30',
            deposit: '4',
            depositapplication: '41',
            expensereport: '28',
            financecharge: '52',
            glimpactadjustment: '70',
            insertionorder: '31',
            invoice: '7',
            itemfulfillment: '32',
            journal: '1',
            payment: '9',
            purchaseorder: '15',
            returnauthorization: '33',
            revenuearrangement: '65',
            salestaxpayment: '23',
            statementcharge: '8',
            systemjournal: '74',
            tegatapayable: '50',
            tegatareceivable: '49',
            transfer: '2',
            vendorreturnauthorization: '43'
        }
    };

    /* ---------- Config & sequence helpers ---------- */

    function getApprovalConfigForPo(poRec) {
        try {
            log.debug('getApprovalConfigForPo', 'PO Type: ' + poRec.type + ', Mapped Type: ' + CONST.TRANS_TYPE_MAP[poRec.type]);
            var cfg = search.create({
                type: CONST.REC.TRAN_APPR_CONFIG,
                filters: [[CONST.FIELD.TAC_TRANS_TYPE, 'anyof', CONST.TRANS_TYPE_MAP[poRec.type]]],
                columns: ['internalid']
            }).run().getRange({ start: 0, end: 1 }) || [];
            log.debug('getApprovalConfigForPo', 'Found Config Count: ' + cfg.length);
            log.debug('getApprovalConfigForPo', 'Config Internal ID: ' + (cfg.length ? cfg[0].getValue('internalid') : 'N/A'));
            return cfg.length ? cfg[0].getValue('internalid') : null;
        } catch (e) {
            log.error('getApprovalConfigForPo', e);
            return null;
        }
    }

    function getSequenceRules(configId, limit) {
        try {
            var cols = [
                search.createColumn({ name: CONST.FIELD.ASR_SEQUENCE, sort: search.Sort.ASC }),
                CONST.FIELD.ASR_APPROVER_TYPE,
                CONST.FIELD.ASR_APPROVER,
                CONST.FIELD.ASR_ROLE_TYPE,
                CONST.FIELD.ASR_MIN_AMOUNT
            ];
            var filters = [[CONST.FIELD.ASR_PARENT_CONFIG, 'anyof', configId]];
            if (limit != null) {
                filters.push('AND', [CONST.FIELD.ASR_MIN_AMOUNT, 'lessthanorequalto', String(limit)]);
            }
            var rows = search.create({ type: CONST.REC.APPR_SEQ_RULES, filters: filters, columns: cols }).run().getRange({ start: 0, end: 1000 }) || [];
            return rows.map(function(r) {
                return {
                    sequence: r.getValue(CONST.FIELD.ASR_SEQUENCE),
                    approverType: r.getValue(CONST.FIELD.ASR_APPROVER_TYPE),
                    approver: r.getValue(CONST.FIELD.ASR_APPROVER),
                    roleType: r.getValue(CONST.FIELD.ASR_ROLE_TYPE),
                    minAmount: r.getValue(CONST.FIELD.ASR_MIN_AMOUNT)
                };
            }).sort(function(a,b){ return parseFloat(a.sequence || 0) - parseFloat(b.sequence || 0); });
        } catch (e) {
            log.error('getSequenceRules', e);
            return [];
        }
    }

    function getDistinctSequences(seqRules) {
        var arr = seqRules.map(function(r){ return parseInt(parseFloat(r.sequence) || 0, 10); }).filter(Boolean);
        return Array.from(new Set(arr)).sort(function(a,b){ return a-b; });
    }

    function normalizeSeq(seq) { return parseInt(parseFloat(seq) || 0, 10); }


    /* ---------- Approver resolvers ---------- */

    // Walk supervisor chain, respect explicit purchaseorderapprover and approvallimit fields.
    // Returns array of { id: <employeeInternalId>, approverType: CONST.APPROVER_TYPE.EMPLOYEE_HIERARCHY }
    function resolveHierarchyApprovers(creatorId, poAmount) {
        var out = [];
        if (!creatorId) return out;
        try {
            var empRec = record.load({ type: 'employee', id: creatorId });
            var explicit = empRec.getValue('purchaseorderapprover');
            if (explicit) { out.push({ id: explicit, approverType: CONST.APPROVER_TYPE.EMPLOYEE_HIERARCHY }); return out; }
            var supId = empRec.getValue('supervisor');
            var seen = {};
            while (supId && !seen[supId]) {
                seen[supId] = true;
                out.push({ id: supId, approverType: CONST.APPROVER_TYPE.EMPLOYEE_HIERARCHY });
                try {
                    var supRec = record.load({ type: 'employee', id: supId });
                    var supLimit = parseFloat(supRec.getValue('purchaseorderapprovallimit')) || parseFloat(supRec.getValue('purchaseorderlimit')) || 0;
                    if (supLimit && poAmount <= supLimit) break;
                    supId = supRec.getValue('supervisor');
                } catch (e) { break; }
            }
        } catch (e) {
            log.debug('resolveHierarchyApprovers', e);
        }
        return out;
    }

    // Returns array of { id: <employeeInternalId>, approverType: CONST.APPROVER_TYPE.SUBBU_LINE_ITEM|SUBBU_LINE_EXPENSE }
    function resolveLineLevelApprovers(poRec, lineApproverField) {
        var out = [];
        var field = lineApproverField || CONST.DEFAULT_LINE_APPROVER_FIELD;
        try {
            var itemCnt = poRec.getLineCount({ sublistId: 'item' });
            for (var i=0;i<itemCnt;i++){
                var a = poRec.getSublistValue({ sublistId:'item', fieldId: field, line: i });
                if (a) out.push({ id: a, approverType: CONST.APPROVER_TYPE.SUBBU_LINE_ITEM });
            }
        } catch(e){}
        try {
            var expCnt = poRec.getLineCount({ sublistId: 'expense' });
            for (var j=0;j<expCnt;j++){
                var b = poRec.getSublistValue({ sublistId:'expense', fieldId: field, line: j });
                if (b) out.push({ id: b, approverType: CONST.APPROVER_TYPE.SUBBU_LINE_EXPENSE });
            }
        } catch(e){}
        var seen = {}; 
        return out.filter(function(x){
            if (!x||!x.id) return false;
            var key = x.id + '|' + x.approverType;
            if (seen[key]) return false;
            seen[key]=true; 
            return true;
        });
    }
    
    /**
     * Expand approvers for a given sequence into a structured list with ordering and hierarchy info.
     *
     * @param {Array<Object>} seqRules - Sequence rule objects from approval configuration.
     * @param {number|string} targetSequence - Sequence number to expand (e.g., 1, 2, 3).
     * @param {Record} poRec - Loaded Purchase Order record object.
     *
     * @returns {Array<Object>} Array of approver objects:
     *          - id {number} (optional): Employee ID.
     *          - roleId {number} (optional): Role ID.
     *          - approverType {string}: Type of approver.
     *          - orderIndex {number}: Position in sequence.
     *          - seqLabel {string}: Composite label (e.g., "1.1").
     *          - isLastHierarchy {boolean}: True if last approver in hierarchy chain.
     */
    function expandSequenceApprovers(seqRules, targetSequence, poRec) {
        var poAmount = parseFloat(poRec.getValue('total')) || 0;
        var creatorId = poRec.getValue('custbody_cretd_by');
        var rules = seqRules.filter(function(r){ return normalizeSeq(r.sequence) === normalizeSeq(targetSequence); });
        var expanded = [];
        var idx = 1;

        rules.forEach(function(rule){
            var atype = (rule.approverType || '').toString();
            if (atype === CONST.APPROVER_TYPE.EMPLOYEE_HIERARCHY) {
                var hier = resolveHierarchyApprovers(creatorId, poAmount);
                hier.forEach(function(h, i){
                    expanded.push({
                        id: h.id,
                        approverType: CONST.APPROVER_TYPE.EMPLOYEE_HIERARCHY,
                        orderIndex: idx,
                        seqLabel: targetSequence + '.' + idx++,
                        isLastHierarchy: (i === hier.length - 1)
                    });
                });
            } else if (atype === CONST.APPROVER_TYPE.EMPLOYEE) {
                if (rule.approver) expanded.push({
                    id: rule.approver,
                    approverType: CONST.APPROVER_TYPE.EMPLOYEE,
                    orderIndex: idx,
                    seqLabel: targetSequence + '.' + idx++,
                    isLastHierarchy: false
                });
            } else if (atype === CONST.APPROVER_TYPE.SUBBU_LINE_ITEM) {
                var itemLines = resolveLineLevelApprovers(poRec, CONST.DEFAULT_LINE_APPROVER_FIELD)
                    .filter(function(l){ return l.approverType === CONST.APPROVER_TYPE.SUBBU_LINE_ITEM; });
                itemLines.forEach(function(l){
                    expanded.push({
                        id: l.id,
                        approverType: CONST.APPROVER_TYPE.SUBBU_LINE_ITEM,
                        orderIndex: idx,
                        seqLabel: targetSequence + '.' + idx++,
                        isLastHierarchy: false
                    });
                });
            } else if (atype === CONST.APPROVER_TYPE.SUBBU_LINE_EXPENSE) {
                var expLines = resolveLineLevelApprovers(poRec, CONST.DEFAULT_LINE_APPROVER_FIELD)
                    .filter(function(l){ return l.approverType === CONST.APPROVER_TYPE.SUBBU_LINE_EXPENSE; });
                expLines.forEach(function(l){
                    expanded.push({
                        id: l.id,
                        approverType: CONST.APPROVER_TYPE.SUBBU_LINE_EXPENSE,
                        orderIndex: idx,
                        seqLabel: targetSequence + '.' + idx++,
                        isLastHierarchy: false
                    });
                });
            } else if (atype === CONST.APPROVER_TYPE.ROLE) {
                if (rule.roleType) expanded.push({
                    roleId: rule.roleType,
                    approverType: CONST.APPROVER_TYPE.ROLE,
                    orderIndex: idx,
                    seqLabel: targetSequence + '.' + idx++,
                    isLastHierarchy: false
                });
            }
        });

        // Deduplicate while preserving order
        var seenEmp = {}, seenRole = {}, finalList = [];
        expanded.forEach(function(a){
            if (a.approverType === CONST.APPROVER_TYPE.ROLE) {
                if (!seenRole[a.roleId]) { seenRole[a.roleId]=true; finalList.push(a); }
            } else {
                var key = String(a.id) + '|' + String(a.approverType);
                if (a.id && !seenEmp[key]) { seenEmp[key]=true; finalList.push(a); }
            }
        });
        return finalList;
    }

    /* ---------- Small helpers ---------- */

    function findPendingAuditRows(poId) {
        try {
            return search.create({
                type: CONST.REC.APPR_AUDIT_TRAIL,
                filters: [
                    [CONST.FIELD.AAT_TRANSACTION, 'anyof', poId],
                    'AND',
                    [CONST.FIELD.AAT_STATUS, 'anyof', CONST.APPROVAL_STATUS.PENDING]
                ],
                columns: ['internalid', CONST.FIELD.AAT_TYPE, CONST.FIELD.AAT_APPROVER, CONST.FIELD.AAT_ROLE, CONST.FIELD.AAT_SEQUENCE]
            }).run().getRange({ start:0, end:1000 }) || [];
        } catch (e) { log.error('findPendingAuditRows', e); return []; }
    }

    function getExistingAuditSequenceLabels(poId) {
        try {
            var rows = search.create({ type: CONST.REC.APPR_AUDIT_TRAIL, filters: [[CONST.FIELD.AAT_TRANSACTION,'anyof',poId]], columns: [CONST.FIELD.AAT_SEQUENCE] }).run().getRange({ start:0, end:1000 }) || [];
            return rows.map(function(r){ return r.getValue(CONST.FIELD.AAT_SEQUENCE) || ''; });
        } catch(e){ log.error('getExistingAuditSequenceLabels', e); return []; }
    }
    
    /**
     * @description Inactivate all audit trail records for a given PO.
     * This is used when tolerance breach occurs and we need to restart the approval process.
     *
     * @param {number} poId - Internal ID of the Purchase Order.
     */
    function inactivateAuditTrailRecords(poId) {
        try {
            var rows = search.create({
                type: CONST.REC.APPR_AUDIT_TRAIL,
                filters: [[CONST.FIELD.AAT_TRANSACTION, 'anyof', poId]],
                columns: ['internalid']
            }).run().getRange({ start: 0, end: 1000 }) || [];

            rows.forEach(function(r) {
                var ar = record.load({ type: CONST.REC.APPR_AUDIT_TRAIL, id: r.getValue('internalid') });
                ar.setValue(CONST.FIELD.AAT_STATUS, 'Cancelled'); // Custom inactive status
                ar.save({ enableSourcing: false, ignoreMandatoryFields: true });
            });
        } catch (e) {
            log.error('inactivateAuditTrailRecords', e);
        }
    }
    
    /**
     * @description Checks if PO amount increase exceeds tolerance after currency conversion.
     * @param {Record} poRecord - Current Purchase Order record object.
     * @returns {boolean} - true if tolerance exceeded, false otherwise.
     */
    function checkToleranceWithCurrency(poRecord) {
        try {
            // Get PO details
            const poAmount = parseFloat(poRecord.getValue('total')) || 0;
            const originalAmount = parseFloat(poRecord.getValue(approvalUtil.CONST.PO_FIELD.ORIG_AMT)) || 0;
            const poCurrency = poRecord.getValue('currency');
            const tranDate = poRecord.getValue('trandate');

            if (poAmount <= originalAmount) return false;

            // Fetch approval config
            const configId = approvalUtil.getApprovalConfigForPo(poRecord);
            if (!configId) return false;

            const configRec = record.load({
                type: approvalUtil.CONST.REC.TRAN_APPR_CONFIG,
                id: configId
            });

            // Use constants for field IDs
            const tolerancePercent = parseFloat(configRec.getValue(approvalUtil.CONST.FIELD.TAC_PERCENT_TOL)) || 0;
            const toleranceAmount = parseFloat(configRec.getValue(approvalUtil.CONST.FIELD.TAC_TOL_AMT)) || 0;
            const defaultCurrency = configRec.getValue(approvalUtil.CONST.FIELD.TAC_DEF_CURRENCY);
            const useTranDateFlag = configRec.getValue(approvalUtil.CONST.FIELD.TAC_USE_TRAN_DATE);

            // Determine date for exchange rate
            const rateDate = useTranDateFlag ? tranDate : new Date();

            // Get exchange rate
            const exchangeRate = currency.exchangeRate({
                source: poCurrency,
                target: defaultCurrency,
                date: rateDate
            });

            // Convert amounts to default currency
            const originalBaseAmount = originalAmount * exchangeRate;
            const currentBaseAmount = poAmount * exchangeRate;

            const diff = currentBaseAmount - originalBaseAmount;
            const percentDiff = (diff / originalBaseAmount) * 100;

            log.debug('Tolerance Check', {
                poCurrency,
                defaultCurrency,
                exchangeRate,
                originalBaseAmount,
                currentBaseAmount,
                diff,
                toleranceAmount,
                tolerancePercent,
                percentDiff
            });

            return diff > toleranceAmount || percentDiff > tolerancePercent;

        } catch (e) {
            log.error('checkToleranceWithCurrency', e);
            return false;
        }
    }

    return {
        CONST: CONST,
        getApprovalConfigForPo: getApprovalConfigForPo,
        getSequenceRules: getSequenceRules,
        getDistinctSequences: getDistinctSequences,
        expandSequenceApprovers: expandSequenceApprovers,
        resolveHierarchyApprovers: resolveHierarchyApprovers,
        resolveLineLevelApprovers: resolveLineLevelApprovers,
        findPendingAuditRows: findPendingAuditRows,
        getExistingAuditSequenceLabels: getExistingAuditSequenceLabels,
        inactivateAuditTrailRecords: inactivateAuditTrailRecords,
        checkToleranceWithCurrency: checkToleranceWithCurrency
    };
});
