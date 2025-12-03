/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/runtime'],
    /**
 * @param{runtime} runtime
 */
    (runtime) => {

        const beforeLoad = (scriptContext) => {
            var newRecord = scriptContext.newRecord;
            var userObj = runtime.getCurrentUser();
            var type = scriptContext.type;

            if(type == 'copy'){
                newRecord.setValue('custbody_nsts_gaw_created_by', userObj.id)
            }
        }

        const beforeSubmit = (scriptContext) => {

        }

        const afterSubmit = (scriptContext) => {

        }

        return { beforeLoad }

    });
