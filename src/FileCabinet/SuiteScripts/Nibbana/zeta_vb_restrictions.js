/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/https', 'N/search', 'N/ui/message'],
/**
 * @param{currentRecord} currentRecord
 * @param{https} https
 * @param{search} search
 * @param{message} message
 */
function(currentRecord, https, search, message) {
    
    var mode = '';
    function pageInit(scriptContext) {

    }

    function saveRecord(scriptContext) {
        log.debug("mode", mode)
        var record = currentRecord.get();
        var fileIds = [];

        // Collect file IDs from the "mediaitem" sublist
        var lineCount = record.getLineCount({ sublistId: 'mediaitem' });
        log.debug("lineCount", lineCount)
        for (var i = 0; i < lineCount; i++) {
            var fileId = record.getSublistValue({
                sublistId: 'mediaitem',
                fieldId: 'file',
                line: i
            });
            if (fileId) {
                fileIds.push(fileId);
            }
        }
        log.debug("fileIds", fileIds)
    }

    return {
        pageInit: pageInit,
        saveRecord: saveRecord
    };
    
});
