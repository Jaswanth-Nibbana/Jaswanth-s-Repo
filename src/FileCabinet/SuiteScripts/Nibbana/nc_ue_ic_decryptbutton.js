/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/runtime', 'N/ui/serverWidget'],
    /**
 * @param{record} record
 * @param{runtime} runtime
 * @param{serverWidget} serverWidget
 */
    (record, runtime, serverWidget) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {


            var form = scriptContext.form
            form.clientScriptModulePath = "./nc_cl_ib_decrypt.js";
            let openPGPField = form.addField({
                id: "custpage_openpgp_load",
                type: serverWidget.FieldType.INLINEHTML,
                label: "OpenPGP SCRIPT",
            });

            openPGPField.defaultValue =
                '<script src="https://3388294-sb1.app.netsuite.com/core/media/media.nl?id=2187499&c=3388294_SB1&h=StNKJBpNgnaUe9j7IWuidSpx3Hy9lwP4k7uTF-pHBg3JKtK-&_xt=.js"></script>';

            
            if(scriptContext.type == 'view'){
                form.addButton({
                    id: "custpage_decrypt_file",
                    label: "Validate Key",
                    functionName: 'decryptData'
                });
            }
            
        }

        return { beforeLoad }

    });
