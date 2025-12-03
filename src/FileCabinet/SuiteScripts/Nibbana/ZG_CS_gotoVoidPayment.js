/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/transaction', 'N/url'],

function(record, transaction, url) {
   
    function pageInit(scriptContext) {

    }

    function voidPayment(id) {
        const url = 'https://3388294-sb1.app.netsuite.com/app/common/custom/custrecordentry.nl?cf=165&rectype=974&payment='+id;
        window.location.href = url;
    }

    function voidTransaction(id, draftId, action){
        const draftRecord = record.load({
            type: 'customrecord_draft_void_payment_je',
            id: draftId
        });

        if(action == 1){
            const voidId = transaction.void({
                type: 'vendorpayment',
                id: id
            });

            record.submitFields({
                type: 'customrecord_draft_void_payment_je',
                id: draftId,
                values: {
                    custrecord_draft_void_pay_status: 2
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields : true
                }
            });

            record.submitFields({
                type: 'journalentry',
                id: voidId,
                values: {
                    custbody20: draftRecord.getValue('custrecord_void_payment_sup_doc'),
                    trandate: draftRecord.getValue('custrecord_draft_void_payment_date'),
                    custbody_nsts_gaw_created_by: draftRecord.getValue('ownerid')
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields : true
                }
            });

            var voidLink = url.resolveRecord({
                recordType: 'journalentry',
                recordId: voidId
            });
            
            window.location.replace(voidLink);
        } else if (action == 2 ){
            let recordUrl = url.resolveRecord({
                recordType: 'customrecord_draft_reject_reason'
            });
    
            recordUrl += '&draft=' + draftId + '&record=custrecord_reject_draft_void_payment';
            window.location.replace(recordUrl);
        }
    }

    return {
        pageInit: pageInit,
        voidPayment: voidPayment,
        voidTransaction: voidTransaction
    };
    
});
