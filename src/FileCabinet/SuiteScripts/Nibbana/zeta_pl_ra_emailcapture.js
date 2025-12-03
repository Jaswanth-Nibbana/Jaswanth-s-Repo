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
        rejectionReason: getRejectionReason(emailBody),
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

// Handles approval stages
function handleApprovalStage(data, transactionId, emailDetails, action) {
    var record = nlapiLoadRecord(emailDetails.tranType, transactionId);
    var approvalStage = record.getFieldValue('custbody_zeta_ra_approvalstage');
    var approvalStatus = record.getFieldValue('custbody16');
    nlapiLogExecution('DEBUG', 'approvalStage: ' + approvalStage);
    if (approvalStatus != 1) {
        addProcessLog(data, 'TRANSACTION_NOT_IN_VALID_STATE', 'Transaction not in pending approval');
        return data;
    }
    var approverDetails = getApproverDetails(emailDetails.from)
    if (!approverDetails.internalId) {
        addProcessLog(data, 'INVALID_APPROVER', 'Employee record not found');
        return data;
    }

    switch (approvalStage) {
        case '2':
            return handleArManagerStage(data, transactionId, emailDetails, action, record, approverDetails);
        case '3':
            return handleBusinessApproverStage(data, transactionId, emailDetails, action, record, approverDetails);
        case '4':
            return handleArFinalCheckStage(data, transactionId, emailDetails, action, record, approverDetails);
        default:
            addProcessLog(data, 'NOT_ALLOWED_TO_APPROVE', 'Invalid Approver or Approval Stage');
            return data;
    }
}

function handleArManagerStage(data, tranInternalId, emailDetails, action, record, approverDetails) {

    var exception = record.getFieldValue('custbody_zeta_knock_off_entry');
    var arManager = record.getFieldValue('custbody_zeta_ar_manager');

    if (approverDetails.internalId != arManager) {
        addProcessLog(data, 'NOT_ALLOWED_TO_APPROVE', 'You are not a designated approver');
        return data;
    }

    //check if approver has AR manager role
    /*if (approverDetails.roles.indexOf('1048') == -1) {
        addProcessLog(data, 'NOT_ALLOWED_TO_APPROVE', 'Do not have AR Manager role');
        return data;
    }*/

    if (action === 'APPROVE') {
        if (exception == 'T') {
            nlapiSubmitField(emailDetails.tranType, tranInternalId, ['custbody_zeta_ra_approvalstage', 'custbody16', 'orderstatus', 'custbody_aprvd_by'], ['5', '2', 'B', approverDetails.internalId]);
            addProcessLog(data, 'APPROVED', 'Transaction succesfully Approved');

            //send approved email
            var templateId = 49;
            var fromId = 2565;
            var toId = record.getFieldValue('custbody_nsts_gaw_tran_requestor')
            nlapiLogExecution('DEBUG', 'toId: ' + toId);
            sendEmail(fromId, toId, templateId, tranInternalId)
        } else {
            nlapiSubmitField(emailDetails.tranType, tranInternalId, 'custbody_zeta_ra_approvalstage', '3');
            addProcessLog(data, 'APPROVED', 'Transaction succesfully Approved');
            // Send email to next approver
            var templateId = 48;
            var fromId = 2565;
            var toId = record.getFieldValue('custbody_zeta_business_cm_app')
            sendEmail(fromId, toId, templateId, tranInternalId)
            nlapiLogExecution('DEBUG', 'Email Sent Armanager to bussiness Appr');

        }
    } else if (action === 'REJECT') {
        nlapiSubmitField(emailDetails.tranType, tranInternalId, ['custbody_zeta_ra_approvalstage', 'custbody16', 'custbody_nsts_gaw_rejection_reason'], ['6', '3', emailDetails.rejectionReason]);
        addProcessLog(data, 'REJECTED', 'Transaction succesfully Rejected');

        // Send email to Creator
        var templateId = 50;
        var fromId = 2565;
        var toId = record.getFieldValue('custbody_nsts_gaw_tran_requestor')
        sendEmail(fromId, toId, templateId, tranInternalId)
        nlapiLogExecution('DEBUG', 'Email Sent Ar manager rejected');

    }
    nlapiLogExecution('DEBUG', 'data1: ' + JSON.stringify(data));
    return data;
}

function handleBusinessApproverStage(data, tranInternalId, emailDetails, action, record, approverDetails) {

    var businessApprover = record.getFieldValue('custbody_zeta_business_cm_app')
    if (approverDetails.internalId != businessApprover) {
        addProcessLog(data, 'NOT_ALLOWED_TO_APPROVE', 'You are not a designated approver');
        return data;
    }

    if (action === 'APPROVE') {
        nlapiSubmitField(emailDetails.tranType, tranInternalId, 'custbody_zeta_ra_approvalstage', '4');
        addProcessLog(data, 'APPROVED', 'Transaction succesfully Approved');

        // Send email to next approver
        var templateId = 48;
        var fromId = 2565;
        var toId = record.getFieldValue('custbody_zeta_final_check_approver')
        sendEmail(fromId, toId, templateId, tranInternalId)
        nlapiLogExecution('DEBUG', 'Email Sent bussiness Appr to Ap final');

    } else if (action === 'REJECT') {
        nlapiSubmitField(emailDetails.tranType, tranInternalId, ['custbody_zeta_ra_approvalstage', 'custbody16', 'custbody_nsts_gaw_rejection_reason'], ['7', '3', emailDetails.rejectionReason]);
        addProcessLog(data, 'REJECTED', 'Transaction succesfully Rejected');

        // Send email to Creator
        var templateId = 50;
        var fromId = 2565;
        var toId = record.getFieldValue('custbody_nsts_gaw_tran_requestor')
        sendEmail(fromId, toId, templateId, tranInternalId)
        nlapiLogExecution('DEBUG', 'Email Sent bussiness Appr rejected');
    }
    nlapiLogExecution('DEBUG', 'data2: ' + JSON.stringify(data));
    return data;
}

function handleArFinalCheckStage(data, tranInternalId, emailDetails, action, record, approverDetails) {

    var arFinalCheckApprover = record.getFieldValue('custbody_zeta_final_check_approver')
    if (approverDetails.internalId != arFinalCheckApprover) {
        addProcessLog(data, 'NOT_ALLOWED_TO_APPROVE', 'You are not a designated approver');
        return data;
    }
    if (action === 'APPROVE') {
        nlapiSubmitField(emailDetails.tranType, tranInternalId, ['custbody_zeta_ra_approvalstage', 'custbody16', 'orderstatus', 'custbody_aprvd_by'], ['5', '2', 'B', approverDetails.internalId]);
        addProcessLog(data, 'APPROVED', 'Transaction succesfully Approved');

        //send approed email
        var templateId = 49;
        var fromId = 2565;
        var toId = record.getFieldValue('custbody_nsts_gaw_tran_requestor')
        sendEmail(fromId, toId, templateId, tranInternalId)

    } else if (action === 'REJECT') {
        nlapiSubmitField(emailDetails.tranType, tranInternalId, ['custbody_zeta_ra_approvalstage', 'custbody16', 'custbody_nsts_gaw_rejection_reason'], ['8', '3', emailDetails.rejectionReason]);
        addProcessLog(data, 'REJECTED', 'Transaction succesfully Rejected');

        // Send email to Creator
        var templateId = 50;
        var fromId = 2565;
        var toId = record.getFieldValue('custbody_nsts_gaw_tran_requestor')
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
                attachments.push(nlapiLoadRecord('file', attachmentId));
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
            var subject = "Appoval Request Errored : Return Authorization " + "#" + (emailDetails.tranId).replace(/[a-zA-Z]/g, function (match) {
                return match.toUpperCase();
            });
            nlapiSendEmail(2565, emailDetails.from, subject, body);
            nlapiLogExecution('DEBUG', 'Email sent to approver', 'Email sent to: ' + emailDetails.from);
        }

    } catch (e) {
        nlapiLogExecution('ERROR', 'Error sending email to approver', e.toString());
    }
}