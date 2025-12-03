/*
File: zeta_pl_approvals_email_plugin.js
Author: Jaswanth Vardireddy <jvardireddy@nibbanaconsulting.com>
Client: Zeta Global
Purpose: Email capture for Vendor Return Authorization  pproval Process
Copyright (c) 2025 Nibbana Consulting Private Limited
All rights reserved. No part of this code may be copied or used without express, written permission from Nibbana.
*/

// Entry point for processing the email
function process(email) {
    nlapiLogExecution('DEBUG', 'Email Capture Initiated');
    var processedData = processApproval(email);
    nlapiLogExecution('DEBUG', 'Processed Data', JSON.stringify(processedData));
    //send email to approver
    var emailDetails = extractEmailDetails(email);
    sendEmailToApprover(processedData, emailDetails)
}

// Main approval process
function processApproval(email) {
    var processedData = {};

    try {
        if (!validateEmail(email)) {
            addProcessLog(processedData, 'INVALID_INPUT', 'Email object is not provided');
            return processedData;
        }

        var emailDetails = extractEmailDetails(email);
        nlapiLogExecution('DEBUG', 'emailDetails: ' + JSON.stringify(emailDetails));
        var action = determineAction(emailDetails.subjectTokens[0]);
        nlapiLogExecution('DEBUG', 'action: ' + action);
        if (!action) {
            addProcessLog(processedData, 'INCORRECT_SUBJECT', 'Invalid action in subject.');
            return processedData;
        }

        var transactionId = getTransactionInternalId(emailDetails.tranType, emailDetails.tranId);
        nlapiLogExecution('DEBUG', 'transactionId: ' + transactionId);
        if (!transactionId) {
            addProcessLog(processedData, 'INVALID_TRANSACTION', 'No transaction found with given ID and type.');
            return processedData;
        }

        processedData = handleApprovalStage(processedData, transactionId, emailDetails, action);

    } catch (e) {
        addProcessLog(processedData, 'ERROR', e.toString());
        nlapiLogExecution('ERROR', 'Error', e.toString());
    }

    return processedData;
}

// Validates the provided email
function validateEmail(email) {
    nlapiLogExecution('DEBUG', '!!email: ' + (!!email));
    return !!email;
}

// Extracts and returns details from the email
function extractEmailDetails(email) {
    var emailFrom = email.getFrom();
    var emailSubject = email.getSubject().trim();
    var emailBody = email.getTextBody();
    nlapiLogExecution('DEBUG', 'Received Values', 'emailFrom: ' + emailFrom.getEmail() + ' emailSubject: ' + emailSubject + ' emailBody: ' + emailBody);

    var subjectTokens = emailSubject.split(/\s+/);
    var lowerCaseTokens = [];
    for (var i = 0; i < subjectTokens.length; i++) {
        lowerCaseTokens.push(subjectTokens[i].toLowerCase());
    }
    var tranId = lowerCaseTokens.length > 0 ? lowerCaseTokens[lowerCaseTokens.length - 1] : null;
    var tranType = lowerCaseTokens.length > 1 ? lowerCaseTokens[1] : null;
    return {
        from: emailFrom,
        subjectTokens: lowerCaseTokens,
        body: emailBody,
        reason: getRejectionReason(emailBody),
        tranId: tranId,
        tranType: tranType
    };
}

// Determines the action based on the subject
function determineAction(subjectAction) {
    switch (subjectAction) {
        case 'rejected':
        case 'rejected:':
            return 'REJECT';
        case 'approved':
        case 'approved:':
            return 'APPROVE';
        default:
            return null;
    }
}

// Retrieves rejection reason from email body
function getRejectionReason(emailBody) {
    if (!emailBody) {
        return null;
    }

    var lowerCaseEmailBody = emailBody.toLowerCase();
    var reasonIndex = lowerCaseEmailBody.indexOf('reason');
    if (reasonIndex >= 0) {
        var reason = emailBody.substring(reasonIndex + 'reason'.length).trim();
        return reason.split(/\s+/).join(' ');
    }

    return null;
}

// Retrieves internal transaction ID based on type and ID
function getTransactionInternalId(tranType, tranId) {
    if (!tranType || !tranId) {
        return null;
    }
    nlapiLogExecution('DEBUG', 'tranId: ' + tranId);
    nlapiLogExecution('DEBUG', 'tranType: ' + tranType);
    var searchColumns = [new nlobjSearchColumn('internalid'), new nlobjSearchColumn('status')];
    var searchFilters = [
        new nlobjSearchFilter('tranid', null, 'is', tranId),
        new nlobjSearchFilter('recordtype', null, 'is', tranType)
    ];

    var results = nlapiSearchRecord('transaction', null, searchFilters, searchColumns);
    nlapiLogExecution('DEBUG', 'results-length: ' + results.length);
    return results && results.length > 0 ? results[0].getValue('internalid') : null;
}

// Adds an error to the processed data
function addProcessLog(data, code, details) {
    data.code = code;
    data.details = details;
}

// Handles approval Mechanism
function handleApprovalStage(data, transactionId, emailDetails, action) {
    var record = nlapiLoadRecord(emailDetails.tranType, transactionId);
    var approvalStatus = record.getFieldValue('custbody16');

    if (approvalStatus != 1) {
        addProcessLog(data, 'TRANSACTION_NOT_IN_VALID_STATE', 'Transaction not in pending approval');
        return data;
    }
    var approverDetails = getApproverDetails(emailDetails.from)
    if (!approverDetails.internalId) {
        addProcessLog(data, 'INVALID_APPROVER', 'Employee record not found');
        return data;
    }

    return handleApFinalCheck(data, transactionId, emailDetails, action, record, approverDetails);
}

function handleApFinalCheck(data, tranInternalId, emailDetails, action, record, approverDetails) {

    var arFinalCheckApprover = record.getFieldValue('custbody_zeta_ap_final_check')
    nlapiLogExecution("DEBUG","arFinalCheckApprover", arFinalCheckApprover)
    nlapiLogExecution("DEBUG" ,"approverDetails.internalId ", approverDetails.internalId)
    
    if (approverDetails.internalId != arFinalCheckApprover) {
        addProcessLog(data, 'NOT_ALLOWED_TO_APPROVE', 'You are not a designated approver');
        return data;
    }
    if (action === 'APPROVE') {
        nlapiSubmitField(emailDetails.tranType, tranInternalId, ['custbody16', 'custbody_aprvd_by', 'custbody_zeta_approvalnotes'], ['2', approverDetails.internalId, emailDetails.reason]);
        addProcessLog(data, 'APPROVED', 'Transaction succesfully Approved');
        //send approved email
        var templateId = 153;
        var fromId = 2565;
        var toId = record.getFieldValue('custbody_cretd_by')
        sendEmail(fromId, toId, templateId, tranInternalId)
        
    } else if (action === 'REJECT') {
        nlapiSubmitField(emailDetails.tranType, tranInternalId, ['custbody16', 'custbody_nsts_gaw_rejection_reason'], ['3', emailDetails.reason]);
        addProcessLog(data, 'REJECTED', 'Transaction succesfully Rejected');
        
        // Send email to Creator
        var templateId = 154;
        var fromId = 2565;
        var toId = record.getFieldValue('custbody_cretd_by')
        sendEmail(fromId, toId, templateId, tranInternalId)
    }
    nlapiLogExecution('DEBUG', 'data3: ' + JSON.stringify(data));
    return data;
}

// Fetch attachments
function fetchAttachmentDetails(recId) {
    var attachments = [];
    var filters = new Array();
    var columns = new Array();

    filters[0] = new nlobjSearchFilter('internalid', null, 'anyof', recId);
    filters[1] = new nlobjSearchFilter('mainline', null, 'is', 'T');

    columns[0] = new nlobjSearchColumn('entity');
    columns[1] = new nlobjSearchColumn('internalid', 'file');

    var tranSearchResults = nlapiSearchRecord('transaction', null, filters, columns);

    if (tranSearchResults) {
        for (var i = 0; i < tranSearchResults.length; i++) {
            var attachmentId = tranSearchResults[i].getValue('internalid', 'file');
            if (attachmentId) {
                attachments.push(nlapiLoadFile(attachmentId));
            }
        }
    }

    return attachments;
}

//Send email
function sendEmail(fromId, toId, templateId, recId) {

    var emailMerger = nlapiCreateEmailMerger(templateId);
    emailMerger.setTransaction(recId)
    var mergeResult = emailMerger.merge();
    var subject = mergeResult.getSubject();
    var body = mergeResult.getBody();
    nlapiLogExecution('DEBUG', 'Email body', body);
    var attachments = fetchAttachmentDetails(recId);
    nlapiLogExecution('DEBUG', 'Email SUBJECT', subject + fromId + toId )
    nlapiSendEmail(fromId, toId, subject, body, null, null, { transaction: recId }, attachments);
    nlapiLogExecution('DEBUG', 'Email Sent');
}

function getApproverDetails(email) {

    var employeeDetails = {
        internalId: null,
        roles: []
    };

    // Define search filters
    var filters = [new nlobjSearchFilter('email', null, 'is', email),
    new nlobjSearchFilter('isinactive', null, 'is', 'F')];

    // Define search columns
    var columns = [new nlobjSearchColumn('internalid'),
    new nlobjSearchColumn('role')];

    // Execute the search
    var searchResults = nlapiSearchRecord('employee', null, filters, columns);

    // Check if any results were returned
    if (searchResults && searchResults.length > 0) {
        employeeDetails.internalId = searchResults[0].getValue('internalid');

        for (var i = 0; i < searchResults.length; i++) {
            var role = searchResults[i].getValue('role');
            if (employeeDetails.roles.indexOf(role) === -1) {
                employeeDetails.roles.push(role);
            }
        }
    }
    nlapiLogExecution('DEBUG', 'employeeDetails: ' + JSON.stringify(employeeDetails));
    return employeeDetails;
}

function sendEmailToApprover(processedData, emailDetails) {

    var body = processedData.code + '\n' + processedData.details;
    nlapiLogExecution('DEBUG', 'processedData.code ' + processedData.code);
    try {
        if (processedData.code == "APPROVED" || processedData.code == "REJECTED") {
            var subject = 'Approval Request - ' + (function (str) {
                return str.replace(/\b\w/g, function (match) {
                    return match.toUpperCase();
                }).replace(/\bRa\d{2}\b/g, function (match) {
                    return match.toUpperCase();
                });
            })(emailDetails.subjectTokens.join(' '));
            nlapiLogExecution('DEBUG', 'subject-Approver: ' + subject);
            nlapiSendEmail(2565, emailDetails.from, subject, body);
            nlapiLogExecution('DEBUG', 'Email sent to approver', 'Email sent to: ' + emailDetails.from);
        } else {
            var subject = "Appoval Request Errored : Vendor Return Authorization " + "#" + (emailDetails.tranId).replace(/[a-zA-Z]/g, function (match) {
                return match.toUpperCase();
            });
            nlapiSendEmail(2565, emailDetails.from, subject, body);
            nlapiLogExecution('DEBUG', 'Email sent to approver', 'Email sent to: ' + emailDetails.from);
        }

    } catch (e) {
        nlapiLogExecution('ERROR', 'Error sending email to approver', e.toString());
    }
}
