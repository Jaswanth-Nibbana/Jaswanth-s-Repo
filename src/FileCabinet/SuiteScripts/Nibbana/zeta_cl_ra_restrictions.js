function restrictLineFields(){

    var approvalStatus = nlapiGetFieldValue('custbody16');
    if(approvalStatus == 2){
        nlapiDisableLineItemField('item', 'quantity', true);
        nlapiDisableLineItemField('item', 'rate', true);
        nlapiDisableLineItemField('item', 'amount', true);
    }
}
