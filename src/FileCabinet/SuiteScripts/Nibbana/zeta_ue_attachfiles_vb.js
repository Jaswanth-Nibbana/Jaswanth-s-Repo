/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(['N/runtime', 'N/record'], (runtime, record) => {

    function afterSubmit(context) {
        try {
            // Only run on CREATE + CSV Import
            if (context.type == context.UserEventType.CREATE && runtime.executionContext == runtime.ContextType.CSV_IMPORT) {
                const newRecord = context.newRecord;
                const recordId = newRecord.id;
                const recordType = newRecord.type;
                // Get file IDs field
                const fileIdsString = newRecord.getValue('custbody_zeta_file_ids');
                if (!checkValuePresentOrNot(fileIdsString)) {
                    log.debug("No File IDs", "File ids is empty");
                    return;
                }
                // Convert to array and remove duplicates and empty strings
                let fileIds = [...new Set(
                    fileIdsString
                        .split(";")
                        .map(id => id.trim())
                        .filter(id => id !== "")
                )];
                log.debug("File IDs Parsed", fileIds);

                if (fileIds.length === 0) {
                    return;
                }
                // Attach files to Vendor Bill
                fileIds.forEach(fileId => {
                    try {
                        log.debug("Attaching file", fileId);

                        record.attach({
                            record: { type: 'file', id: Number(fileId) },
                            to: { type: recordType, id: recordId }
                        });

                    } catch (fileError) {
                        log.error(`Failed to attach file ${fileId}`, fileError);
                    }
                });
            }
        } catch (e) {
            log.error("UE Error", e);
        }
    }


    // Utility function to check if a value is present
    const checkValuePresentOrNot = (value) => {
        if (value != null && value != '' && value != undefined && value.toString() != 'NaN') {
            return true;
        } else {
            return false;
        }
    }

    return { afterSubmit };
});