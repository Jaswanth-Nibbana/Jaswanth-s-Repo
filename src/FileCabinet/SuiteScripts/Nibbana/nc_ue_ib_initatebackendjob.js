/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/task'],

    (task) => {


        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {

            log.debug('type', scriptContext.type);
            if (scriptContext.type == 'create') {
                var recId = scriptContext.newRecord.id;
                log.debug('Rec Id', recId);

                var mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscript_nc_mr_ib_sendemails',
                    params: { 'custscript_nc_ib_bgrecid': recId }
                });

                var mrTaskId = mrTask.submit();
                var taskStatusObj = task.checkStatus(mrTaskId);
                log.debug('MR Status', taskStatusObj.status);
            }


        }

        return { afterSubmit }

    });
