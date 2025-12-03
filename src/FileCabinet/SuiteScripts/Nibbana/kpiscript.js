/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/email', 'N/runtime', 'N/https'],
    /**
 * @param{email} email
 * @param{runtime} runtime
 */
    (email, runtime, https) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            var newRecord = scriptContext.newRecord;
            var type = scriptContext.type;
            var recId  = newRecord.id

            if (type === 'create') {
                newRecord.setValue('custrecord158', 1);
            }

            if(type === 'view'){
                var form = scriptContext.form

                var suiteletURL = url.resolveScript({
                    scriptId: 'customscript1581',
                    deploymentId: 'customdeploy1',
                    params: {
                        rec_id: recId,
                    }
                });

                form.addButton({
                    id: 'approvebutton',
                    label: 'Approve',
                    functionName: 'window.open("' + suiteletURL + '","_blank");'
                })
                form.addButton({
                    id: 'rejectbutton',
                    label: 'Reject',
                    functionName: 'window.open("' + suiteletURL + '","_blank");'
                })

            }
        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            var newRecord = scriptContext.newRecord;
            var user = runtime.getCurrentUser();
            var userId = user.id; // Correct capitalization
            var date = new Date();
            var type = scriptContext.type;

            if (type === 'create') {
                newRecord.setValue('custrecord159', userId);
                newRecord.setValue('custrecord161', date);
            }
        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            var newRecord = scriptContext.newRecord;
            var user = runtime.getCurrentUser();
            var userId = user.id; // Correct capitalization

            if (scriptContext.type == 'create') {
                var body = 'Please approve KPI ' + newRecord.getValue('custrecord154');

                email.send({
                    author: userId, // ID of the current user
                    recipients: userId, // Replace this with dynamic supervisor ID
                    subject: 'KPI for your approval',
                    body: body
                });
            }
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
