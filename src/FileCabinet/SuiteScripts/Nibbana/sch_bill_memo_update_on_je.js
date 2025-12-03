// BEGIN SCRIPT DESCRIPTION BLOCK  ==================================
{
	/*
		Script Name: sch_bill_memo_update_on_je.js 
		Author: Ganesh Reddy
		Company: INSPIRRIA Cloudtech Pvt. Ltd.
		Date: 06/10/2021
		Description:


		Script Modification Log:

		-- Date --			-- Modified By --				--Requested By--				-- Description --



	Below is a summary of the process controls enforced by this script file.  The control logic is described
	more fully.




	*/
}
// END SCRIPT DESCRIPTION BLOCK  ====================================




function sch_bill_memo_update_on_je() {

	try {
		var context = nlapiGetContext();
		var i_role = nlapiGetRole();
		nlapiLogExecution('debug', 'i_role', i_role);
		// var i_Inv_id = context.getSetting('SCRIPT', 'custscript_error_csv_file_id');
		//======== start JE search ==========
		var je_id_arry = [];
		// var je_amort_sch_no = nlapiSearchRecord("journalentry", null,
		// [
		// ["type", "anyof", "Journal"],
		// "AND",
		// //["internalid", "anyof", "15241404"],
		// //"AND",
		// ["mainline", "is", "T"]
		// ],
		// [

		// new nlobjSearchColumn("tranid", null, "GROUP"),
		// new nlobjSearchColumn("internalid", null, "GROUP")
		// ]
		// );

		//==========================
		//var list_of_je = ['17151927','17151926','17151925','17151924','17151930','17151929','17151928','17151921','17155446','17157701','17156267']
		// var list_of_je =  ['17334356','17334358','17334359','17334360','17334361','17334362','17334363','17334364','17356538','17356539','17348277','17334039','17333516'];
		var list_of_je = ['17513025', '17513024', '17513023', '17513022', '17513021', '17513020', '17513019', '17513018', '17513017'];

		//['16943806','16943807','16943809','16943810','16943811','16866168']
		//if(i_role == 1029)
		{
			var filters = [
				new nlobjSearchFilter("type", null, "anyof", "Journal"),
				new nlobjSearchFilter("mainline", null, "is", "T"),
				new nlobjSearchFilter("custbody_je_memo_update", null, "is", "F"),
				new nlobjSearchFilter("trandate", null, "onorafter", "01/01/2023")
			];

			var columns = [
				new nlobjSearchColumn("trandate", null, "GROUP"),
				new nlobjSearchColumn("internalid", null, "GROUP"),
				new nlobjSearchColumn("recordtype", null, "GROUP")
			];
			var results = nlapiCreateSearch("journalentry", filters, columns);
			var searchResults = results.runSearch();
			var je_amort_sch_no = [];

			var startIndex = 0;
			var pageSize = 1000;
			var resultSet;

			do {
				resultSet = searchResults.getResults(startIndex, startIndex + pageSize);
				je_amort_sch_no = je_amort_sch_no.concat(resultSet);
				startIndex += pageSize;
			} while (resultSet.length == pageSize);
			
			if (_logValidation(je_amort_sch_no)) {
				nlapiLogExecution('debug', 'length of search',  je_amort_sch_no.length);
				for (var i = 0; i < je_amort_sch_no.length; i++) {
					try {
						var je_id = je_amort_sch_no[i].getValue(new nlobjSearchColumn("internalid", null, "GROUP"));
						nlapiLogExecution('debug', 'je_id', je_id);
						if (_logValidation(je_id)) {
							var je_rec = nlapiLoadRecord('journalentry', je_id);
							var count = je_rec.getLineItemCount('line');
							var memo_get_updated = false;
							nlapiLogExecution('debug', 'count', count);
							if (count > 0) {
								for (j = 1; j <= count; j++) {
									if (parseInt(context.getRemainingUsage()) <= parseInt(400)) {
										nlapiYieldScript();
										nlapiLogExecution('DEBUG', 'sch_Recipe_Automation | remaining new usage', context.getRemainingUsage());
									}
									var je_account = je_rec.getLineItemValue('line', 'account', j);
									nlapiLogExecution('debug', 'je_account', je_account);
									var je_debit = je_rec.getLineItemValue('line', 'debit', j);
									//  nlapiLogExecution('debug','je_debit',je_debit);
									var je_amort_sch = je_rec.getLineItemText('line', 'schedulenum', j);
									var je_amort_sch_id = je_rec.getLineItemValue('line', 'schedulenum', j);
									nlapiLogExecution('debug', 'je_amort_sch_id', je_amort_sch_id);
									if (_logValidation(je_amort_sch_id) && _logValidation(je_debit)) {
										var amort_record = nlapiLoadRecord('revRecSchedule', je_amort_sch_id);
										nlapiLogExecution('debug', 'amort_record', amort_record);
										var bill_rec_load = amort_record.getFieldValue('sourcetran');

										nlapiLogExecution('debug', 'bill_rec_load', bill_rec_load);
										var rec_type_value = amort_record.getFieldValue('trantype');
										nlapiLogExecution('debug', 'rec_type_value', rec_type_value)
										if (_logValidation(rec_type_value)) {
											// rec_type_value = rec_type_value.split(' ');
											// rec_type_value = rec_type_value[0];
											// nlapiLogExecution('debug','rec_type_value[0]',rec_type_value)
											if (rec_type_value == 'VendBill') {
												if (_logValidation(bill_rec_load)) {
													nlapiLogExecution('debug', 'billrecord', bill_rec_load);

													//========Bill record search========== customsearch3304

													var vendorbillSearch = nlapiSearchRecord("vendorbill", null,
														[
															["type", "anyof", "VendBill"],
															"AND",
															["internalid", "anyof", bill_rec_load],
															"AND",
															["mainline", "is", "F"],
															"AND",
															["taxline", "is", "F"],
															"AND",
															["shipping", "is", "F"]
														],
														[
															new nlobjSearchColumn("memo", null, "GROUP"),
															new nlobjSearchColumn("custcol3", null, "GROUP"),
															new nlobjSearchColumn("destacct", "amortizationSchedule", "GROUP"),
															new nlobjSearchColumn("internalid", "amortizationSchedule", "GROUP").setSort(true),
															new nlobjSearchColumn("custcol_data_center", null, "GROUP")
														]
													);

													if (_logValidation(vendorbillSearch)) {
														for (k = 0; k < vendorbillSearch.length; k++) {
															var bill_account = vendorbillSearch[k].getValue(new nlobjSearchColumn("destacct", "amortizationSchedule", "GROUP"));
															nlapiLogExecution('debug', 'bill_account', bill_account);
															var bill_memo = vendorbillSearch[k].getValue(new nlobjSearchColumn("memo", null, "GROUP"));
															//nlapiLogExecution('debug', 'bill_memo', bill_memo);
															var bill_amort_sch = vendorbillSearch[k].getValue(new nlobjSearchColumn("internalid", "amortizationSchedule", "GROUP").setSort(true));
															nlapiLogExecution('debug', 'bill_amort_sch', bill_amort_sch);
															var customer_name = vendorbillSearch[k].getValue(new nlobjSearchColumn("custcol3", null, "GROUP"));
															//nlapiLogExecution('debug', 'customer_name', customer_name);

															var i_supply_id = vendorbillSearch[k].getValue(new nlobjSearchColumn("custcol_data_center", null, "GROUP"));
															nlapiLogExecution('debug', 'i_supply_id', i_supply_id);
															if (i_supply_id == '- None -') {
																i_supply_id = '';
															}
															if (bill_account == je_account && bill_amort_sch == je_amort_sch_id) {
																if (_logValidation(bill_memo) || _logValidation(i_supply_id) || _logValidation(customer_name)) {
																	je_rec.selectLineItem('line', j);
																	je_rec.setCurrentLineItemValue('line', 'memo', bill_memo);
																	je_rec.setCurrentLineItemValue('line', 'custcol_data_center', i_supply_id);
																	je_rec.setCurrentLineItemValue('line', 'custcol_zeta_client_name', customer_name);

																	je_rec.commitLineItem('line');
																	memo_get_updated = true;
																}
															}
														}
													}


												}

											} else {

												nlapiLogExecution('debug', 'jerecord', bill_rec_load);

												//===========Journal Search	memo update ========
												var journalentrySearch = nlapiSearchRecord("journalentry", null,
													[
														["type", "anyof", "Journal"],
														"AND",
														["internalid", "anyof", bill_rec_load]
													],
													[
														new nlobjSearchColumn("memo", null, "GROUP"),
														new nlobjSearchColumn("name", "amortizationSchedule", "GROUP"),
														new nlobjSearchColumn("internalid", "amortizationSchedule", "GROUP"),
														new nlobjSearchColumn("sourceacct", "amortizationSchedule", "GROUP"),
														new nlobjSearchColumn("destacct", "amortizationSchedule", "GROUP"),
														new nlobjSearchColumn("custcol_data_center", null, "GROUP"),
														new nlobjSearchColumn("custcol_zeta_client_name", null, "GROUP")

													]
												);

												if (_logValidation(journalentrySearch)) {
													for (k = 0; k < journalentrySearch.length; k++) {
														var i_je_memo_account = journalentrySearch[k].getValue("destacct", "amortizationSchedule", "GROUP");
														nlapiLogExecution('debug', 'i_je_memo_account', i_je_memo_account);
														var i_je_memo = journalentrySearch[k].getValue(new nlobjSearchColumn("memo", null, "GROUP"));
														nlapiLogExecution('debug', 'i_je_memo', i_je_memo);
														var i_je_amort_sch = journalentrySearch[k].getValue(new nlobjSearchColumn("internalid", "amortizationSchedule", "GROUP"));
														nlapiLogExecution('debug', 'i_je_amort_sch', i_je_amort_sch);
														var i_supply_id = journalentrySearch[k].getValue(new nlobjSearchColumn("custcol_data_center", null, "GROUP"));
														nlapiLogExecution('debug', 'je_i_supply_id', i_supply_id);
														if (i_supply_id == '- None -') {
															i_supply_id = '';
														}
														var i_customer_name = journalentrySearch[k].getValue(new nlobjSearchColumn("custcol_zeta_client_name", null, "GROUP"));
														nlapiLogExecution('debug', 'i_customer_name', i_customer_name);


														if (i_je_memo_account == je_account && i_je_amort_sch == je_amort_sch_id) {
															if (_logValidation(i_je_memo) || _logValidation(i_supply_id) || _logValidation(i_customer_name)) {
																//nlapiLogExecution('debug', 'enter_value');

																je_rec.selectLineItem('line', j);
																je_rec.setCurrentLineItemValue('line', 'memo', i_je_memo);
																je_rec.setCurrentLineItemValue('line', 'custcol_data_center', i_supply_id);
																je_rec.setCurrentLineItemValue('line', 'custcol_zeta_client_name', i_customer_name);

																je_rec.commitLineItem('line');
																memo_get_updated = true;
															}
														}
													}
												}

												//==========END ============


											}


										}
									}
									if (parseInt(context.getRemainingUsage()) <= parseInt(400)) {
										nlapiYieldScript();
										nlapiLogExecution('DEBUG', 'sch_Recipe_Automation | remaining new usage', context.getRemainingUsage());
									}
								}
							}
							if (memo_get_updated == true) {

								je_rec.setFieldValue('custbody_je_memo_update', 'T');
								var je_submit_id = nlapiSubmitRecord(je_rec, true, true);
								nlapiLogExecution('debug', 'je_submit_id', je_submit_id);
							}
						}
					} catch (ex) {
						var strVar = "";
						strVar += "<html>";
						strVar += "<body>";
						strVar += "Dear User,";
						strVar += "";
						strVar += "<br><\/br>";
						strVar += "<br><\/br>";
						strVar += "The Journal Entry not updated facing the following error ";
						strVar += "";
						strVar += "<br><\/br>";
						strVar += "";
						strVar += "" + JSON.stringify(ex) + "";
						strVar += "<br><\/br>";
						strVar += "<br><\/br>";
						strVar += "System Generated Email, Please Do Not Respond";
						strVar += "<br><\/br>";
						strVar += "<br><\/br>";
						strVar += "Thank you,";
						strVar += "<br><\/br>";
						strVar += "Zeta Team";
						strVar += "<br><\/br>";
						strVar += "<\/html>";
						strVar += "<\/body>";
						nlapiSendEmail(-5, "ganesh.r@inspirria.com", "Journal Entry" + je_id, strVar, null, null, null, null, null, null, null);
					}
				}
			}
		}
	} catch (exception) {

		if (exception instanceof nlobjError)
			nlapiLogExecution('DEBUG', 'In Catch IF===', exception.getCode() + '\n' + exception.getDetails())
		else
			nlapiLogExecution('DEBUG', 'In Catch IF===', exception.toString())
	}

}

function _logValidation(value) {
	if (value != null && value != '' && value != undefined && value.toString() != 'NaN' && value != NaN) {
		return true;
	} else {
		return false;
	}
}

function _nullValidation(val) {
	if (val == null || val == undefined || val == '') {
		return true;
	} else {
		return false;
	}

}