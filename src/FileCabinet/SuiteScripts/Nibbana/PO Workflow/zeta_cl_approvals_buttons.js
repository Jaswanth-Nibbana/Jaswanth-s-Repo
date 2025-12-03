/**
 * @NApiVersion 2.1
 * @description Button action functions for Purchase Order approval workflow
 */
define(['N/currentRecord', 'N/https'], function(currentRecord, https) {

    function onSubmitApproval() {
        var currRec = currentRecord.get();
        log.debug('onSubmitApproval', 'Current Record ID: ' + currRec.id);
        if (!confirm('Submit this Purchase Order for approval?')) return;
        var suiteletURL = 'https://' + window.location.hostname + '/app/site/hosting/scriptlet.nl?script=customscript_zeta_su_approvals_po_workfl&deploy=customdeploy_zeta_su_approvals_po_workfl'
        suiteletURL = suiteletURL + '&recid=' + currRec.id + '&action=submit'
        log.debug('onSubmitApproval', 'Suitelet URL: ' + suiteletURL);
        var response = https.get({
            url: suiteletURL,
        });
        console.log('Suitelet response:', response);
        window.location.reload();
    }

    function onApprove() {
        var currRec = currentRecord.get();
        if (!confirm('Approve this Purchase Order?')) return;
        var suiteletURL = 'https://' + window.location.hostname + '/app/site/hosting/scriptlet.nl?script=customscript_zeta_su_approvals_po_workfl&deploy=customdeploy_zeta_su_approvals_po_workfl'
        suiteletURL = suiteletURL + '&recid=' + currRec.id + '&action=approve'
        var response = https.get({
            url: suiteletURL,
        });
        window.location.reload();
    }

    function onReject() {
        var currRec = currentRecord.get();
        // ask for rejection reason
        var reason = window.prompt('Enter rejection reason (required):', '');
        if (reason === null) return; // user cancelled
        reason = String(reason).trim();
        if (!reason) {
            alert('Rejection reason is required.');
            return;
        }
        
        var suiteletURL = 'https://' + window.location.hostname + '/app/site/hosting/scriptlet.nl?script=customscript_zeta_su_approvals_po_workfl&deploy=customdeploy_zeta_su_approvals_po_workfl'
        suiteletURL = suiteletURL + '&recid=' + currRec.id + '&action=reject' + '&reason=' + reason
        var response = https.get({
            url: suiteletURL,
        });
        window.location.reload();
    }

    function onSuperApprove() {
        var currRec = currentRecord.get();
        if (!confirm('Super-approve this Purchase Order?')) return;
        var suiteletURL = 'https://' + window.location.hostname + '/app/site/hosting/scriptlet.nl?script=customscript_zeta_su_approvals_po_workfl&deploy=customdeploy_zeta_su_approvals_po_workfl'
        suiteletURL = suiteletURL + '&recid=' + currRec.id + '&action=superapprove'
        var response = https.get({
            url: suiteletURL,
        });
        window.location.reload();
    }

    return {
        onSubmitApproval: onSubmitApproval,
        onApprove: onApprove,
        onReject: onReject,
        onSuperApprove: onSuperApprove
    };
});
