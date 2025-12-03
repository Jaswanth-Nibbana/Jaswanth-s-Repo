/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/runtime', 'N/search', 'N/url', 'N/email', 'N/record', 'N/file', 'N/compress'],

    (runtime, search, url, email, record, file, compress) => {

        function fetchAttachmentDetails(recId) {
            var attachments = []
            var vendorSearchObj = search.create({
                type: "vendor",
                filters:
                    [
                        ["internalid", "anyof", recId],
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            join: "file"
                        })
                    ]
            });
            vendorSearchObj.run().each(function (result) {

                var attachmentId = result.getValue(search.createColumn({
                    name: "internalid",
                    join: "file"
                }))
                if (attachmentId)
                    attachments.push(file.load({ id: attachmentId }))

                return true;
            });


            return attachments

        }

        function compressFilesToZip(files) {
            var archiver = compress.createArchiver();
            
            // Add each file to the zip archive
            files.forEach(function(f) {
                archiver.add({
                    file: f,
                    name: f.name // Use the original file name
                });
            });
            
            // Archive the files and return the zip file (NetSuite file object)
            var zipFile = archiver.archive({
                name: 'attachments.zip',
                fileType: file.Type.ZIP
            });

            return zipFile;
        }

        function emailBodyPA(userName, entityId, recurl, limitMessage) {
            var emailBody = "<html><body>";
            emailBody += "<p>Hi,</p>";
            emailBody += "<p>The vendor record has been created by " + userName + " and requires your approval. - " + entityId + "</p>";
            emailBody += "<p>Please review and approve.</p>";
            emailBody += '<p>View Created Record: <a href="' + recurl + '">Vendor Record</a></p>';
            if (limitMessage) {
                emailBody += "<br/><p><strong>Note:</strong></p>";
                emailBody += "<p>The files associated with vendor - " + entityId + " exceed the 10MB size limit. Due to system limitations, attachments could not be included.</p>";
                emailBody += "<p>Please review the files directly in the Vendor record.</p>";
            }
            emailBody += "</body></html>";
    
            return emailBody;
        }

        function resubmissionEmailBody(userName, entityId, recurl, includeLimitMessage) {
            var emailBody = "<html><body>";
            emailBody += "<p>Hi,</p>";
            emailBody += "<p>The vendor record has been resubmitted by " + userName + " and requires your approval. - " + entityId + "</p>";
            emailBody += "<p>Please review and approve the changes.</p>";
            emailBody += '<p>View Resubmitted Record: <a href="' + recurl + '">Vendor Record</a></p>';
            if (includeLimitMessage) {
                emailBody += "<br/><p><strong>Note:</strong></p>";
                emailBody += "<p>The files associated with vendor - " + entityId + " exceed the 10MB size limit. Due to system limitations, attachments could not be included.</p>";
                emailBody += "<p>Please review the files directly in the Vendor record.</p>";
            }
            emailBody += "</body></html>";
        
            return emailBody;
        }

        function sendMail(userId, supervisorId, subject, emailBody, attachments, bodyWithoutAttach) {
            var totalSize = 0;
            attachments.forEach(function (attachmentFile) {
                totalSize += attachmentFile.size;
            });

            if (totalSize > 10 * 1024 * 1024) {
                // Compress files into a zip
                var zipFile = compressFilesToZip(attachments);

                // Check if the zip file is still greater than 10MB or if total message size exceeds 15MB
                if (zipFile.size > 10 * 1024 * 1024 || (zipFile.size + emailBody.length) > 15 * 1024 * 1024) {
                    // Send email without attachment, stating file size limitation
                    email.send({
                        author: userId,
                        recipients: supervisorId,
                        subject: subject,
                        body: bodyWithoutAttach
                    });
                    log.debug('Email sent without attachments due to file size limit.');
                } else {
                    // Attach zip file and send email
                    email.send({
                        author: userId, // System user
                        recipients: supervisorId,
                        subject: subject,
                        body: emailBody,
                        attachments: [zipFile]
                    });
                    log.debug('Email sent with zip file attachment.');
                }
            } else {
                // If total size is under 10MB, check if overall message size is within 15MB limit
                if (totalSize + emailBody.length <= 15 * 1024 * 1024) {
                    email.send({
                        author: userId,
                        recipients: supervisorId,
                        subject: subject,
                        body: emailBody,
                        attachments: attachments
                    });
                    log.debug('Email sent with attachments.');
                } else {
                    // Send email without attachments if total message size exceeds 15MB
                    email.send({
                        author: userId,
                        recipients: supervisorId,
                        subject: subject,
                        body: bodyWithoutAttach
                    });
                    log.debug('Email sent without attachments due to total message size limit.');
                }
            }
        }

        const onRequest = (scriptContext) => {
            if (scriptContext.request.method === 'GET') {

                var recId = scriptContext.request.parameters.recordId;
                var action = scriptContext.request.parameters.action;

                var userId = runtime.getCurrentUser().id;
                var userName = runtime.getCurrentUser().name;
                var empLookUp = search.lookupFields({
                    type: search.Type.EMPLOYEE,
                    id: userId,
                    columns: ['supervisor']
                });
                var supervisorId;
                if (empLookUp && empLookUp.supervisor && empLookUp.supervisor.length > 0) {
                    supervisorId = empLookUp.supervisor[0].value;
                    log.debug('supervisorId', supervisorId)
                }
                var venRec = record.load({
                    type: record.Type.VENDOR,
                    id: recId
                });
                var entityId = venRec.getValue({
                    fieldId: 'entityid'
                });
                var attachments = fetchAttachmentDetails(recId);
                log.debug("attachments ", attachments.length);
                var domain = url.resolveDomain({
                    hostType: url.HostType.APPLICATION,
                });

                var recurl = "https://" + domain + "/app/common/entity/vendor.nl?id=" + recId;
                log.debug("url ", recurl)
                if (action == 'submitforapproval') {
                    var subject = 'New Vendor Creation - Approval Required : ' + entityId;
                    var emailBody = emailBodyPA(userName, entityId, recurl, false);
                    var bodyWithoutAttach = emailBodyPA(userName, entityId, recurl, true);
                    if (attachments.length > 0) {
                        sendMail(userId, supervisorId, subject, emailBody, attachments, bodyWithoutAttach)
                        scriptContext.response.write('<html><body><script type="text/javascript">window.onunload = function(e){window.opener.location.reload();}; window.close();</script></body></html>');
                    } else {
                        email.send({
                            author: userId,
                            recipients: supervisorId,
                            subject: subject,
                            body: emailBody,
                        });
                        scriptContext.response.write('<html><body><script type="text/javascript">window.onunload = function(e){window.opener.location.reload();}; window.close();</script></body></html>');
                    }
                } else if (action === 'resubmit') {

                    var subject = 'Vendor resubmitted - Approval Required :' + entityId
                    var emailBody = resubmissionEmailBody(userName, entityId, recurl, false);
                    var bodyWithoutAttachment = resubmissionEmailBody(userName, entityId, recurl, true);

                    if (attachments.length > 0) {
                        sendMail(userId, supervisorId, subject, emailBody, attachments, bodyWithoutAttachment)
                        scriptContext.response.write('<html><body><script type="text/javascript">window.onunload = function(e){window.opener.location.reload();}; window.close();</script></body></html>');
                    } else {
                        email.send({
                            author: userId,
                            recipients: supervisorId,
                            subject: subject,
                            body: emailBody,
                        });
                        scriptContext.response.write('<html><body><script type="text/javascript">window.onunload = function(e){window.opener.location.reload();}; window.close();</script></body></html>');

                    }
                }
            }
        }

        return { onRequest }

    });
