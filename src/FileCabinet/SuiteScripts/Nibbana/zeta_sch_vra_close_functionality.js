/*
File: zeta_sch_vra_close_functionality.js
Author: Jaswanth Vardireddy <jvardireddy@nibbanaconsulting.com>
Client: Zeta Global
Purpose: Handling the Scheduled script to update the Is-Closed field on Vendor Return Authorization
Copyright (c) 2025 Nibbana Consulting Private Limited
All rights reserved. No part of this code may be copied or used without express, written permission from Nibbana.
*/
/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search) => {

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */
        const execute = (scriptContext) => {

            var vendorreturnauthorizationSearchObj = search.create({
                type: "vendorreturnauthorization",
                filters:
                    [
                        ["type", "anyof", "VendAuth"],
                        "AND",
                        ["linesystemnotes.field", "anyof", "TRANLINE.BRECEIVED"],
                        "AND",
                        ["linesystemnotes.oldvalue", "is", "F"],
                        "AND",
                        ["linesystemnotes.newvalue", "is", "T"],
                        "AND",
                        ["custbody_zeta_vra_isclosed", "is", "F"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "internalid", label: "Internal ID" }),
                        search.createColumn({ name: "tranid", label: "Document Number" }),
                        search.createColumn({ name: "custbody_zeta_vra_isclosed", label: "Is Closed" })
                    ]
            });

            var internalIds = [];

            var searchResult = vendorreturnauthorizationSearchObj.run().getRange({
                start: 0,
                end: 1000
            });

            if (searchResult.length > 0) {
                internalIds = searchResult.map(function (result) {
                    return result.getValue({ name: 'internalid' });
                });
            }

            log.debug("Vendor Return Auth Internal IDs", internalIds);

            // Loop through the internal IDs and update the records
            for (var i = 0; i < internalIds.length; i++) {
                recId = internalIds[i];
                // Update the header field
                record.submitFields({
                    type: record.Type.VENDOR_RETURN_AUTHORIZATION,
                    id: recId,
                    values: {
                        custbody_zeta_vra_isclosed: true
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });

                log.debug("Updated custbody_zeta_vra_isclosed to true for record ID: " + recId);
            }

            log.debug("All records processed successfully.");
        }

        return { execute }

    });
