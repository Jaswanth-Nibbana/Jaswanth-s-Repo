/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/runtime', 'N/ui/serverWidget', 'N/record'],

    (runtime, serverWidget, record) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the scriptContext.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            var rec = scriptContext.newRecord

            var form = scriptContext.form;

            form.getField('memo').isMandatory = true
            var sublistId = 'expense'
            var sublist = form.getSublist({ id: sublistId });

        if (sublist) {
            var field = sublist.getField({ id: 'location' });

            if (field) {
                field.isMandatory = true;
            }
        }


        }


        return {
            beforeLoad, beforeLoad
        }

    });