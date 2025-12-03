/**
 * @NApiVersion 2.1
 */
define(['N/currentRecord', 'N/https'],

    (currentRecord, https) => {


        const approvewithnotes = () => {

            var currRec = currentRecord.get();
            var recId = currRec.id;

            var suiteletURL = 'https://' + window.location.hostname + '/app/site/hosting/scriptlet.nl?script=customscript_zeta_su_vra_approvalprocess&deploy=customdeploy_zeta_su_vra_approvalprocess'
            suiteletURL = suiteletURL + '&recid=' + recId + '&action=approvewithnotes'
            window.open(suiteletURL, 'approval_notes', 'width=600,height=400,resizable=yes,scrollbars=yes');
            
        }

        const reject = () => {

            var currRec = currentRecord.get();
            var recId = currRec.id;
            var suiteletURL = 'https://' + window.location.hostname + '/app/site/hosting/scriptlet.nl?script=customscript_zeta_su_vra_approvalprocess&deploy=customdeploy_zeta_su_vra_approvalprocess'
            suiteletURL = suiteletURL + '&recid=' + recId + '&action=reject'
            window.open(suiteletURL, 'reject_alert', 'width=600,height=400,resizable=yes,scrollbars=yes');
        }

        const reSubmit = () => {
            var Rec = currentRecord.get();
            var recId = Rec.id;
            console.log("resubmit")
            console.log(recId);
            var suiteletURL = 'https://' + window.location.hostname + '/app/site/hosting/scriptlet.nl?script=customscript_zeta_su_vra_approvalprocess&deploy=customdeploy_zeta_su_vra_approvalprocess'
            suiteletURL = suiteletURL + '&recid=' + recId + '&action=reSubmit'
            var response = https.get({
                url: suiteletURL,
            });
            
            window.location.reload();
        }

        return { reject, reSubmit, approvewithnotes }

    });

    