/**
 * @NApiVersion 2.1
 */
define(['N/currentRecord', 'N/https', 'N/record', 'N/email'],

    (currentRecord, https, record) => {

        const approve = () => {

            var currRec = currentRecord.get();
            var recId = currRec.id;

            var suiteletURL = 'https://' + window.location.hostname + '/app/site/hosting/scriptlet.nl?script=customscript_zeta_su_raapprovals&deploy=customdeploy_zeta_su_raapprovals'
            suiteletURL = suiteletURL + '&recid=' + recId + '&action=approve'
            var response = https.get({
                url: suiteletURL,
            });
            window.location.reload();
        }

        const reject = () => {

            var currRec = currentRecord.get();
            var recId = currRec.id;
            var suiteletURL = 'https://' + window.location.hostname + '/app/site/hosting/scriptlet.nl?script=customscript_zeta_su_raapprovals&deploy=customdeploy_zeta_su_raapprovals'
            suiteletURL = suiteletURL + '&recid=' + recId + '&action=reject'
            window.open(suiteletURL, 'reject_alert', 'width=600,height=400,resizable=yes,scrollbars=yes');
        }


        const reSubmit = () => {
            var Rec = currentRecord.get();
            var recId = Rec.id;
            console.log("resubmit")
            console.log(recId);

            var suiteletURL = 'https://' + window.location.hostname + '/app/site/hosting/scriptlet.nl?script=customscript_zeta_su_raapprovals&deploy=customdeploy_zeta_su_raapprovals'
            suiteletURL = suiteletURL + '&recid=' + recId + '&action=reSubmit'
            var response = https.get({
                url: suiteletURL,
            });
            window.location.reload();

        }

        return { approve, reject, reSubmit }

    });

    