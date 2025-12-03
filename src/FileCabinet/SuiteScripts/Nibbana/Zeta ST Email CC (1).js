/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       02 Jul 2018     Monica.Nukala
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function removeDuplicateEmails(emailString) {
	var emails = emailString.split(',').map(function (email) {
		return email.trim();
	});

	var uniqueEmails = [];
	for (var i = 0; i < emails.length; i++) {
		if (uniqueEmails.indexOf(emails[i]) === -1) {
			uniqueEmails.push(emails[i]);
		}
	}

	return uniqueEmails.join(',');
}


function suitelet(request, response) {
	try {

		if (request.getMethod() == 'GET') {
			var recId = request.getParameter('recordId');
			var recType = request.getParameter('recordType')
			var recObject = nlapiLoadRecord(recType, recId);
			var formId = recObject.getFieldValue('custbody_zeta_form_id');
			var customerId = recObject.getFieldValue('entity');
			//	var toEmail = nlapiLookupField('customer',customerId,'email');
			var fields = ['email', 'custentity2']
			var columns = nlapiLookupField('customer', customerId, fields);
			var toEmail = columns.email;
			var customerClass = columns.custentity2;

			var filters = [
				new nlobjSearchFilter('type', null, 'anyof', 'CustInvc'),
				new nlobjSearchFilter("mainline", null, "is", "T"),
				new nlobjSearchFilter('internalid', null, 'anyof', recId),

			];

			var columns = [
				new nlobjSearchColumn('custrecord145', 'billingAddress'), // Email(s)
				new nlobjSearchColumn('custrecord_zeta_billaddremailcc', 'billingAddress'), // Email CC(s)
				new nlobjSearchColumn('email', 'customer'), // Customer Email
				new nlobjSearchColumn('custentity_zeta_to_email', 'customer'), // Main Email
				new nlobjSearchColumn('custentity_zeta_cc_email', 'customer'), // CC Email
				new nlobjSearchColumn('email', 'salesRep'), // Sales Rep Email
				new nlobjSearchColumn('email', 'custbody_zeta_customer_accountmanager') // Customer Account Manager Email
			];

			// Execute the search
			var invoiceSearchObj = nlapiSearchRecord('invoice', null, filters, columns);

			var toEmail = '';
			var ccEmail = '';
			if (invoiceSearchObj && invoiceSearchObj.length > 0) {
				for (var i = 0; i < invoiceSearchObj.length; i++) {
					var invoice = invoiceSearchObj[i];

					var billAddrTo = invoice.getValue('custrecord145', 'billingAddress') || '';
					var billAddrCC = invoice.getValue('custrecord_zeta_billaddremailcc', 'billingAddress') || '';
					var custEmail = invoice.getValue('email', 'customer') || '';
					var custMainEmail = invoice.getValue('custentity_zeta_to_email', 'customer') || '';
					var custCCEmail = invoice.getValue('custentity_zeta_cc_email', 'customer') || '';
					var salesRepEmail = invoice.getValue('email', 'salesRep') || '';
					var accMngrEmail = invoice.getValue('email', 'custbody_zeta_customer_accountmanager') || '';

					// Constructing the toEmail field
					if (billAddrTo) {
						toEmail = billAddrTo;
					} else {
						toEmail = custEmail ? (custMainEmail ? custEmail + ',' + custMainEmail : custEmail) : custMainEmail;
					}

					// Constructing the ccEmail field
					ccEmail = billAddrCC || custCCEmail;

					if (salesRepEmail) {
						ccEmail += ccEmail ? ',' + salesRepEmail : salesRepEmail;
					}

					if (accMngrEmail) {
						ccEmail += ccEmail ? ',' + accMngrEmail : accMngrEmail;
					}

					nlapiLogExecution('DEBUG', 'Email Information From Search', 'To: ' + toEmail + ', CC: ' + ccEmail);
				}
			}

			if (ccEmail != null && ccEmail != '') {
				if (formId == '187' || formId == 187) {
					ccEmail += ccEmail ? ',' + 'ardisqus@zetaglobal.com' : 'ardisqus@zetaglobal.com'
					ccEmail += ccEmail ? ',' + 'billing@zetaglobal.com' : 'billing@zetaglobal.com'
				} else if (formId == '201' || formId == 201) {
					ccEmail += ccEmail ? ',' + 'accountsreceivable@zetaglobal.com' : 'accountsreceivable@zetaglobal.com'
					ccEmail += ccEmail ? ',' + 'ardsp@zetaglobal.com' : 'ardsp@zetaglobal.com'
					ccEmail += ccEmail ? ',' + 'billing@zetaglobal.com' : 'billing@zetaglobal.com'
				} else if (formId == '204' || formId == 204) {
					ccEmail += ccEmail ? ',' + 'ZetaDSP-AR@zetaglobal.com' : 'ZetaDSP-AR@zetaglobal.com' //ignition one billing
				} else if (formId == '206' || formId == 206 || formId == '198' || formId == 198) {
					ccEmail += ccEmail ? ',' + 'ZetaDSP-AR@zetaglobal.com' : 'ZetaDSP-AR@zetaglobal.com'//fuel billing
				} else if (formId == '157' || formId == 157) {
					ccEmail += ccEmail ? ',' + 'arcollections@iconicmediagroup.co' : 'arcollections@iconicmediagroup.co'
				} else if (formId == '192' || formId == 192) {
					ccEmail += ccEmail ? ',' + 'billing@originig.com' : 'billing@originig.com'
				} else if (formId == '189' || formId == 189 || formId == '156' || formId == 156) {//Zeta Corp and Corp Grouping
					if (customerClass == '21' || customerClass == 21) {
						ccEmail += ccEmail ? ',' + 'billing@zetaglobal.com' : 'billing@zetaglobal.com'
						ccEmail += ccEmail ? ',' + 'zetaaacx-ar@zetaglobal.com' : 'zetaaacx-ar@zetaglobal.com'
					} else {
						ccEmail += ccEmail ? ',' + 'billing@zetaglobal.com' : 'billing@zetaglobal.com'
					}
				} else if (formId == '142' || formId == 142) {//Zeta Invoice ZX Platform
					if (customerClass == '35' || customerClass == 35 || customerClass == '37' || customerClass == 37) {//Compass Customer Class
						ccEmail += ccEmail ? ',' + 'zetacompass-ar@zetaglobal.com' : 'zetacompass-ar@zetaglobal.com'
					} else {
						ccEmail += ccEmail ? ',' + 'billing@zetaglobal.com' : 'billing@zetaglobal.com'
					}
				} else {
					ccEmail += ccEmail ? ',' + 'billing@zetaglobal.com' : 'billing@zetaglobal.com'
				}
			}

			if (ccEmail == null || ccEmail == '') {
				if (formId == '204' || formId == 204 || formId == '206' || formId == 206 || formId == '198' || formId == 198) {
					ccEmail += ccEmail ? ',' + 'ZetaDSP-AR@zetaglobal.com' : 'ZetaDSP-AR@zetaglobal.com'
				} else {
					ccEmail += ccEmail ? ',' + 'billing@zetaglobal.com' : 'billing@zetaglobal.com'
				}
			}


			var records = new Object();
			records['transaction'] = recId;
			var EmailTemplate;
			if (formId == '142' || formId == 142) {
				if (customerClass == '35' || customerClass == 35 || customerClass == '37' || customerClass == 37) {//Compass Customer Class
					EmailTemplate = nlapiCreateEmailMerger(17);//Zeta compass email template
				} else {
					EmailTemplate = nlapiCreateEmailMerger(11);//Zeta Invoice ZX
				}
			} else if (formId == '157' || formId == 157) {
				EmailTemplate = nlapiCreateEmailMerger(12);//Zeta Invoice Iconic
			} else if (formId == '187' || formId == 187) {
				EmailTemplate = nlapiCreateEmailMerger(14);//Zeta Invoice Disqus
			} else if (formId == '189' || formId == 189 || formId == '156' || formId == 156) {
				EmailTemplate = nlapiCreateEmailMerger(15);//Zeta Invoice Corp & Zeta Invoice Corp Grouping
			} else if (formId == '154' || formId == 154 || formId == '190' || formId == 190) {
				EmailTemplate = nlapiCreateEmailMerger(18);//Zeta Invoice LLC & Zeta Invoice LLC Grouping
			} else if (formId == '159' || formId == 159) {
				EmailTemplate = nlapiCreateEmailMerger(19);//Zeta Invoice Grisaille
			} else if (formId == '192' || formId == 192) {
				EmailTemplate = nlapiCreateEmailMerger(20);//Zeta Invoice Origin
			} else if (formId == '201' || formId == 201) {
				EmailTemplate = nlapiCreateEmailMerger(34);//Zeta Invoice PlaceIQ
			} else if (formId == '204' || formId == 204) {
				EmailTemplate = nlapiCreateEmailMerger(35);//Zeta Ignition One
			} else if (formId == '206' || formId == 206 || formId == '198' || formId == 198) {
				EmailTemplate = nlapiCreateEmailMerger(27);//Fuel Billing
			} else {
				EmailTemplate = nlapiCreateEmailMerger(8);//set email template
			}

			EmailTemplate.setTransaction(recId); // Set the ID of the transaction where you are going to fetch the values to populate the variables on the template
			var mergeResult = EmailTemplate.merge(); // Merge the template with the email
			var emailSubject = mergeResult.getSubject(); // Get the subject for the email
			var emailBody = mergeResult.getBody(); // Get the body for the email

			var file = new Array();
			file[file.length] = nlapiPrintRecord('TRANSACTION', recId, 'DEFAULT', null);
			toEmail.replace(/\s+/g, '')
			ccEmail.replace(/\s+/g, '')
			toEmail = removeDuplicateEmails(toEmail)
			ccEmail = removeDuplicateEmails(ccEmail)
			var toEmailsArray = toEmail.split(',');
			var ccEmailsArray = ccEmail.split(',');
			nlapiLogExecution('DEBUG', 'TO Emails', toEmail);
			nlapiLogExecution('DEBUG', 'CC Emails', ccEmail);

			if (formId == '187' || formId == 187) {
				nlapiSendEmail(27275, toEmailsArray, emailSubject, emailBody, ccEmailsArray, null, records, file);
			} else if (formId == '201' || formId == 201) {
				nlapiSendEmail(45426, toEmailsArray, emailSubject, emailBody, ccEmailsArray, null, records, file);//Place IQ
			} else if (formId == '204' || formId == 204) {
				nlapiSendEmail(39818, toEmailsArray, emailSubject, emailBody, ccEmailsArray, 'billing@zetaglobal.com', records, file);//Ignition One
			} else if (formId == '206' || formId == 206 || formId == '198' || formId == 198) {
				nlapiSendEmail(39818, toEmailsArray, emailSubject, emailBody, ccEmailsArray, 'billing@zetaglobal.com', records, file);//Fuel Billing
			} else if (formId == '157' || formId == 157) {
				nlapiSendEmail(27273, 'arcollections@iconicmediagroup.co', emailSubject, emailBody, null, null, records, file);
			} else if (formId == '192' || formId == 192) {
				nlapiSendEmail(27274, 'billing@originig.com', emailSubject, emailBody, null, null, records, file);
			} else if (formId == '142' || formId == 142) {
				if (customerClass == '35' || customerClass == 35 || customerClass == '37' || customerClass == 37) {//Compass Customer Class
					nlapiSendEmail(27310, toEmailsArray, emailSubject, emailBody, ccEmailsArray, 'billing@zetaglobal.com', records, file);
				} else {
					nlapiSendEmail(2565, toEmailsArray, emailSubject, emailBody, ccEmailsArray, null, records, file);
				}
			} else {
				nlapiSendEmail(2565, toEmailsArray, emailSubject, emailBody, ccEmailsArray, null, records, file);
			}

			nlapiLogExecution('DEBUG', '***Email Sent***');
		}
	} catch (ERR) {
		nlapiLogExecution('ERROR', 'Error Occurred Is: ', ERR);
	}
}

