/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * @Description This script shows/hides spinner.
 */
define(['N/ui/dialog', 'N/runtime'],

    function (dialog, runtime) {
        function pageInit(context) {
            try {
                var form = document.forms[0];

                // Disable the Save button
                var saveButton = document.querySelector("[id*='btn_multibutton_submitter']");
                if (saveButton) {
                    saveButton.disabled = true;
                }

                // Wait for the page to fully load
                setTimeout(function () {
                    if (saveButton) {
                        saveButton.disabled = false;
                    }
                }, 16000);  // Adjust timing if needed


                document.getElementById("loading").style.display = "none";

            } catch (e) {
                dialog.alert({ title: 'Error in PageInit ', message: e });
            }
        }

        return {
            pageInit: pageInit
        }
    });