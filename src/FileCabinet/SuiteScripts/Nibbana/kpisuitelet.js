/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record'],
    /**
 * @param{record} record
 */
    (record) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {

            var recId = scriptContext.request.parameters.recid;
            var action = scriptContext.request.parameters.action;

            var kpiRec = record.load({
                type: 'customrecord896',
                id: recId,
            })

            if (action == 'approve'){
                kpiRec.setValue('custrecord158', 2)
                kpiRec.save();

            }else if(action == 'reject'){
                kpiRec.setValue('custrecord158', 3)
                kpiRec.save();
            }

        }

        return {onRequest}

    });


