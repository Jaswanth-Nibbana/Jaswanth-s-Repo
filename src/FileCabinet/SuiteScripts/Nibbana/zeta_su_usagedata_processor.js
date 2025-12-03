/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/runtime', 'N/search', 'N/task', 'N/ui/serverWidget'],
    /**
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 * @param{task} task
 */
    (record, runtime, search, task, serverWidget) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {

            if (scriptContext.request.method === 'GET') {

                var userObj = runtime.getCurrentUser();

                const form = serverWidget.createForm({
                    title: 'Usage Data Processor'
                });

                var fromDtFld = form.addField({
                    id: 'custpage_ud_fromdate',
                    type: serverWidget.FieldType.DATE,
                    label: 'From Date',
                });
                fromDtFld.isMandatory = true;

                var toDtFld = form.addField({
                    id: 'custpage_ud_todate',
                    type: serverWidget.FieldType.DATE,
                    label: 'To Date',
                });
                toDtFld.isMandatory = true;

                const biller = form.addField({
                    id: 'custpage_ud_billerid',
                    type: serverWidget.FieldType.SELECT,
                    source: 'employee',
                    label: 'Biller'
                });
                biller.isMandatory = true;
                biller.defaultValue = userObj.id

                form.addSubmitButton({
                    label: 'Initiate Processor'
                });
                scriptContext.response.writePage(form);

            } else {

                const fromDate = scriptContext.request.parameters.custpage_ud_fromdate;
                const toDate = scriptContext.request.parameters.custpage_ud_todate;
                const biller = scriptContext.request.parameters.custpage_ud_billerid;

                var dateObj = {
                    "fromDate": fromDate,
                    "toDate": toDate
                }

                const mapReduceTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscript_zeta_mr_invprocessor',
                });
                mapReduceTask.params = {
                    custscript_ud_daterange: JSON.stringify(dateObj),
                    custscript_ud_biller: biller
                };

                const taskId = mapReduceTask.submit();
                log.debug("taskId", taskId);

                const form = serverWidget.createForm({
                    title: 'Usage Data Processor'
                });

                const messageField = form.addField({
                    id: 'custpage_message',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'Message'
                });

                messageField.defaultValue = '<p style="font-size:12pt;"><strong>Processing in Progress</strong></p>' +
                    '<p style="font-size:12pt;">Your request is being processed. You will receive an email notification once the process is complete.</p>';
                messageField.updateLayoutType({
                    layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
                });
                messageField.updateBreakType({
                    breakType: serverWidget.FieldBreakType.STARTROW
                });

                scriptContext.response.writePage(form);
            }
        }

        return {onRequest}

    });
