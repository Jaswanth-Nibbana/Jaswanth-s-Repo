/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/runtime', 'N/ui/serverWidget', 'N/file'],
    /**
 * @param{record} record
 * @param{runtime} runtime
 * @param{serverWidget} serverWidget
 */
    (record, runtime, serverWidget, file) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            var currScript = runtime.getCurrentScript();
            if (scriptContext.request.method === 'GET') {
                let privateKeyFileId = currScript.getParameter({
                    name: 'custscript_pgp_privatekeyfileid'
                });
                log.debug("privateKeyFileId", privateKeyFileId)
                let privateKeyFile = file.load({
                    id: privateKeyFileId,
                });
                let privateKeyFileContents = privateKeyFile.getContents();
                var response = {
                    privateKeyField: privateKeyFileContents
                };
                var jsondata = JSON.stringify(response)
                log.debug("jsondata", jsondata)
                scriptContext.response.write(JSON.stringify(response));

            }else{

                var decryptedData = scriptContext.request.body;
                log.debug("decryptedData", decryptedData)
                record.submitFields({
                    type: 'customrecord_nc_ib_productconfig',
                    id: 1,
                    values: {
                        'custrecord_nc_ib_validtill': decryptedData
                    }
                });

                scriptContext.response.write("<script>window.location.reload();</script>");
            }
        }

        return {onRequest}

    });
