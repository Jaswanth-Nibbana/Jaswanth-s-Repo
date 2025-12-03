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
            if (scriptContext.request.method === 'POST') {
                var request = scriptContext.request;
                var inpObj = JSON.parse(request.body);
                var action = inpObj.action;
                var apFinalCheck = inpObj.empId;

                if (action === 'getRoles'){
                    var isApmanager = search.create({
                        type: "employee",
                        filters:
                            [
                                ["internalid", "anyof", apFinalCheck]
                            ],
                        columns:
                            [
                                search.createColumn({ name: "role", label: "Role" })
                            ]
                    });
                    var resultSet = isApmanager.run();
                    var results = resultSet.getRange({ start: 0, end: 20 });
                    
                    var rolesArray = [];
                    if (results.length > 0) {
                        results.forEach(function(result) {
                            var role = result.getValue({ name: 'role' });
                            rolesArray.push(role);
                        });
                    }
                    log.debug("roles-array ", rolesArray)
                    scriptContext.response.write(JSON.stringify(rolesArray));
                }
            }
        }

        return {onRequest}

    });
