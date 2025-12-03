/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/search'],
    /**
 * @param{search} search
 */
    (search) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {

            var request = scriptContext.request;
            var inpObj = JSON.parse(request.body);
            log.debug('inpObj', inpObj);
            if (inpObj.length > 0 && inpObj[0] !== "") {
                var inactiveApprovers = [];

                var employeeSearchObj = search.create({
                    type: "employee",
                    filters: [
                        ["internalid", "anyof", inpObj],
                        "AND",
                        ["isinactive", "is", "T"]
                    ],
                    columns: [
                        search.createColumn({ name: "entityid", label: "Name" })
                    ]
                });

                var searchResults = employeeSearchObj.run();
                
                searchResults.each(function (result) {
                    inactiveApprovers.push(result.getValue("entityid"));
                    return true;
                });
                log.debug("inactiveApprovers",inactiveApprovers);
                scriptContext.response.write(JSON.stringify(inactiveApprovers));
            }
            
        }

        return { onRequest }

    });