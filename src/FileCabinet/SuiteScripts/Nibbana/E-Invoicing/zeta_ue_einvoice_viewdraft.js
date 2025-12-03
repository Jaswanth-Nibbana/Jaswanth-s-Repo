
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/search', 'N/url', 'N/record'], function (search, url, record) {
    function beforeLoad(context) {
        if (context.type === context.UserEventType.VIEW) {
            var currentRecord = context.newRecord;
            var fileName = currentRecord.getValue({ fieldId: 'name' });
            log.debug('Before Load - File ID', fileName);

            var fileId = null;

            if (fileName) {
                // Search for file ID using file name
                var fileSearch = search.create({
                    type: 'file',
                    filters: [['name', 'is', fileName]],
                    columns: ['internalid']
                });

                var resultSet = fileSearch.run().getRange({ start: 0, end: 1 });
                if (resultSet.length > 0) {
                    fileId = resultSet[0].getValue({ name: 'internalid' });
                    log.debug('File Found', 'File ID: ' + fileId);
                } else {
                    log.error('File Not Found', 'No file found with name: ' + fileName);
                }
            } else {
                log.error('File Name Missing', 'custrecord_psg_ei_attach_edocfield is empty.');
            }

            if (fileId) {
                var suiteletUrl = url.resolveScript({
                    scriptId: 'customscript_zeta_su_extract_xml_data', // Suitelet script ID
                    deploymentId: 'customdeploy_zeta_su_extract_xml_data', // Suitelet deployment ID
                    params: { fileId: fileId } // Pass file ID as parameter
                });

                context.form.addButton({
                    id: 'custpage_view_xml',
                    label: 'View XML Data',
                    functionName: "window.open('" + suiteletUrl + "', '_blank');"
                });
            }
        }
    }
    return { beforeLoad: beforeLoad };
});
