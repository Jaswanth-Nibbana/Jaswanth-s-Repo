require(['N/search', 'N/record', 'N/file', 'N/log', 'N/format'], function(search, record, file, log, format) {

    var csvContent = 'File ID,File Name,Full Folder Path\n';

    var fileSearch = search.create({
        type: "file",
        filters: [
            ['internalid', 'anyof', '']
        ],
        columns: [
            "name",
            "internalid",
            "folder"
        ]
    });

    fileSearch.run().each(function(result) {
        var fileName = result.getValue("name");
        var fileId = result.getValue("internalid");
        var folderId = result.getValue("folder");

        var fullPath = getFullFolderPath(folderId);

        var safeName = '"' + fileName.replace(/"/g, '""') + '"';
        var safePath = '"' + fullPath.replace(/"/g, '""') + '"';

        csvContent += fileId + ',' + safeName + ',' + safePath + '\n';

        return true; // continue
    });

    try {
        var csvFile = file.create({
            name: 'Tran_attachments_file_path_report20.csv',
            fileType: file.Type.CSV,
            contents: csvContent,
            folder: ''
        });

        var newFileId = csvFile.save();

        log.audit('Test CSV Created', 'Saved with ID: ' + newFileId);

    } catch (e) {
        log.error('Error saving CSV file', e);
    }


    function getFullFolderPath(folderId) {
        var path = '';

        while (folderId) {
            try {
                var folderLookup = search.lookupFields({
                    type: search.Type.FOLDER,
                    id: folderId,
                    columns: ['name', 'parent']
                });

                var folderName = folderLookup.name;
                var parent = folderLookup.parent && folderLookup.parent[0] ? folderLookup.parent[0].value : null;
                path = '/' + folderName + path;
                folderId = parent;

            } catch (e) {
                log.error('Folder Load Error', e);
                break;
            }
        }

        return path;
    }

});
