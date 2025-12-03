/**
* @NApiVersion 2.1
* @NScriptType Suitelet
*/
define(['N/query'], function(query) {
    function onRequest(context) {
        if (context.request.method === 'POST' && context.request.body) {
            try {
                var req = JSON.parse(context.request.body);
                if (req.action === 'lookupInternalIds' && Array.isArray(req.transactionNumbers)) {
                    var tranNumbers = req.transactionNumbers.map(function (id) { return id.trim(); }).filter(Boolean);
                    if (tranNumbers.length === 0) {
                        context.response.write(JSON.stringify({ success: false, message: 'No transaction numbers provided.' }));
                        return;
                    }
                    var idsStr = tranNumbers.map(function (id) { return "'" + id.replace(/'/g, "''") + "'"; }).join(",");
                    var sql = "SELECT BUILTIN_RESULT.TYPE_INTEGER(TRANSACTION.ID) AS ID, " +
                        "BUILTIN_RESULT.TYPE_STRING(TRANSACTION.tranid) AS tranid " +
                        "FROM TRANSACTION " +
                        "WHERE TRANSACTION.transactionnumber IN (" + idsStr + ")";
                    var results = query.runSuiteQL({ query: sql }).asMappedResults();
                    var internalIds = results.map(function (r) { return r.id.toString(); });
                    context.response.write(JSON.stringify({ success: true, internalIds: internalIds }));
                    return;
                }
            } catch (e) {
                context.response.write(JSON.stringify({ success: false, message: e.message }));
                return;
            }
        }
        context.response.write(JSON.stringify({ success: false, message: 'Invalid request.' }));
    }
    return { onRequest: onRequest };
});
