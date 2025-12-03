/**
* @NApiVersion 2.1
* @NScriptType Suitelet
* @NModuleScope Public
*/
define(["N/plugin", "N/ui/serverWidget"], function (plugin, serverWidget) {
    function onRequest(context) {
        try {

            var epPlugin = plugin.loadImplementation({
                type: "customscript_17239_ep_api_plugin",//this is same ID which noted
                implementation: "default",
            });

            var epPaymentSelectionForm = epPlugin.getEPForm();
            epPaymentSelectionForm.setPaymentType('EFT');
            // epPaymentSelectionForm.setGlobalPayment(false);
            // epPaymentSelectionForm.AddFilter(true, 'custcol_companyname', 'select', 'Custom Subsidiary', '', '', 'Custom Subsidiary', 'subsidiary', '');
            // epPaymentSelectionForm.AddColumn('text', 'Custom Name', 'custbody_custom_name'); 
            // epPaymentSelectionForm.RemoveFilter('custpage_2663_vendor');
            // epPaymentSelectionForm.RemoveField('custpage_2663_payment_ref');
            epPaymentSelectionForm.BuildUI(context);
            var form = epPaymentSelectionForm.GetForm();

            // Add File Upload Field for CSV with Internal IDs
            var csvUploadField = form.addField({
                id: 'custpage_zeta_csv_upload',
                type: serverWidget.FieldType.FILE,
                label: 'Upload CSV File with Internal IDs',
            });

            csvUploadField.setHelpText({
                help: 'Upload a CSV file with internal IDs. First column should contain internal IDs with "internalid" as the header. The file will be processed to select matching rows in the sublist.'
            });

            // Add Hidden Field for Selected Filename
            var hiddenFileNameField = form.addField({
                id: 'custpage_zeta_selected_filename',
                type: serverWidget.FieldType.TEXT,
                label: 'Selected Filename'
            });
            hiddenFileNameField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            // Add File Display Field (shows active filename when processing)
            var fileDisplayField = form.addField({
                id: 'custpage_zeta_file_display',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Active CSV File'
            });

            // Add Process CSV Button Field
            var processButton = form.addField({
                id: 'custpage_zeta_process_btn',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'CSV Processing'
            });

            processButton.defaultValue = '<button type="button" id="zetaProcessBtn" onclick="processCsvData()" style="background-color: #2196F3; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; margin: 10px 5px;">Process CSV</button>';

            // Add Reset Button Field
            var resetButton = form.addField({
                id: 'custpage_zeta_reset_btn',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Reset Session'
            });

            resetButton.defaultValue = '<button type="button" id="zetaResetBtn" onclick="resetCsvSession()" style="background-color: #f44336; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; margin: 10px 5px; display: none;">Reset & Clear Cache</button>';

            // Add Summary Button Field
            var summaryButton = form.addField({
                id: 'custpage_zeta_summary_btn',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Selection Summary'
            });

            summaryButton.defaultValue = '<button type="button" id="zetaSummaryBtn" onclick="showFinalSummary()" style="background-color: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; margin: 10px 5px;">Show Final Summary</button>';

            // Add Inline HTML field to inject JavaScript
            var inlineHtml = form.addField({
                id: 'custpage_zeta_inlinehtml',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Inline HTML',
            });

            inlineHtml.defaultValue = `
            <script>
            // Global Selection Tracker - Single source of truth
            window.zetaGlobalTracker = {
            csvIds: [],           // All IDs from CSV file
            selectedIds: new Set(), // IDs that have been successfully selected
            fileName: '',
            uploadTime: null,
            isProcessing: false
            };
            
            // Storage keys
            var GLOBAL_TRACKER_KEY = 'zeta_global_tracker';
            var SELECTED_FILE_KEY = 'zeta_selected_file';
            
            // Store selected file info for persistence
            function storeSelectedFile(fileName, fileSize, fileLastModified) {
                var fileInfo = {
                    fileName: fileName,
                    fileSize: fileSize,
                    fileLastModified: fileLastModified,
                    timestamp: Date.now()
                };
                sessionStorage.setItem(SELECTED_FILE_KEY, JSON.stringify(fileInfo));
                console.log('File info stored:', fileName);
            }
            
            // Get stored file info
            function getStoredFileInfo() {
                try {
                    var stored = sessionStorage.getItem(SELECTED_FILE_KEY);
                    return stored ? JSON.parse(stored) : null;
                } catch (e) {
                    console.error('Error loading stored file info:', e);
                    return null;
                }
            }
            
            // Initialize global tracker with CSV data
            function initializeGlobalTracker(fileName, allInternalIds) {
                window.zetaGlobalTracker = {
                    csvIds: allInternalIds,
                    selectedIds: new Set(),
                    fileName: fileName,
                    uploadTime: Date.now(),
                    isProcessing: false
                };
                
                // Save to storage
                saveGlobalTracker();
                console.log('Global tracker initialized:', fileName, 'with', allInternalIds.length, 'IDs');
                return window.zetaGlobalTracker;
            }
            
            // Load global tracker from storage
            function loadGlobalTracker() {
                try {
                    var stored = sessionStorage.getItem(GLOBAL_TRACKER_KEY);
                    if (!stored) return null;
                    
                    var tracker = JSON.parse(stored);
                    
                    // Convert selectedIds array back to Set
                    if (tracker.selectedIds) {
                    if (Array.isArray(tracker.selectedIds)) {
                        tracker.selectedIds = new Set(tracker.selectedIds);
                    } else if (!(tracker.selectedIds instanceof Set)) {
                        tracker.selectedIds = new Set();
                    }
                    } else {
                    tracker.selectedIds = new Set();
                    }
                    
                    // Update global reference
                    window.zetaGlobalTracker = tracker;
                    console.log('Global tracker loaded:', tracker.fileName, 'with', tracker.csvIds.length, 'CSV IDs and', tracker.selectedIds.size, 'selected IDs');
                    return tracker;
                } catch (e) {
                    console.error('Error loading global tracker:', e);
                    return null;
                }
            }
            
            // Save global tracker to storage
            function saveGlobalTracker() {
                try {
                    if (!window.zetaGlobalTracker) return;
                    
                    // Convert Set to array for JSON serialization
                    var trackerToSave = Object.assign({}, window.zetaGlobalTracker);
                    if (window.zetaGlobalTracker.selectedIds instanceof Set) {
                    trackerToSave.selectedIds = Array.from(window.zetaGlobalTracker.selectedIds);
                    }
                    
                    sessionStorage.setItem(GLOBAL_TRACKER_KEY, JSON.stringify(trackerToSave));
                    console.log('Global tracker saved - Selected:', window.zetaGlobalTracker.selectedIds.size, 'of', window.zetaGlobalTracker.csvIds.length);
                } catch (e) {
                    console.error('Error saving global tracker:', e);
                }
            }
            
            // Reset global tracker
            function resetGlobalTracker() {
                window.zetaGlobalTracker = {
                    csvIds: [],
                    selectedIds: new Set(),
                    fileName: '',
                    uploadTime: null,
                    isProcessing: false
                };
                sessionStorage.removeItem(GLOBAL_TRACKER_KEY);
                console.log('Global tracker reset');
            }
            
            // Clean up old sessions
            function cleanupOldSessions() {
                try {
                    var keysToRemove = [];
                    for (var i = 0; i < sessionStorage.length; i++) {
                    var key = sessionStorage.key(i);
                    if (key && (key.startsWith('zeta_csv_stats_') || key.startsWith('zeta_session_'))) {
                        keysToRemove.push(key);
                    }
                    }
                    keysToRemove.forEach(function(key) {
                    sessionStorage.removeItem(key);
                    });
                    console.log('Cleaned up', keysToRemove.length, 'old session keys');
                } catch (e) {
                    console.error('Error cleaning old sessions:', e);
                }
            }
            
            // Function to parse CSV content and extract internal IDs
            function parseCSVFile(csvContent) {
                try {
                    var lines = csvContent.split('\\n');
                    var internalIds = [];
                    
                    // Check if file has content
                    if (lines.length < 2) {
                    throw new Error('CSV file must have at least a header row and one data row');
                    }
                    
                    // Check header row (first row should contain "internalid")
                    var headerRow = lines[0].trim().toLowerCase();
                    if (!headerRow.includes('internalid')) {
                    throw new Error('First column header must be "internalid"');
                    }
                    
                    // Process data rows (skip header row)
                    for (var i = 1; i < lines.length; i++) {
                    var line = lines[i].trim();
                    if (line) {
                        // Split by comma and get first column (internal ID)
                        var columns = line.split(',');
                        var internalId = columns[0].trim().replace(/"/g, ''); // Remove quotes if present
                        if (internalId) {
                        internalIds.push(internalId);
                        }
                    }
                    }
                    
                    if (internalIds.length === 0) {
                    throw new Error('No internal IDs found in the CSV file');
                    }
                    
                    console.log('Parsed internal IDs from CSV:', internalIds);
                    return internalIds;
                    
                } catch (error) {
                    console.error('Error parsing CSV:', error);
                    alert('Error parsing CSV file: ' + error.message);
                    return null;
                }
            }
            
            // Function to get current page number using NetSuite's pagination parameter
            function getCurrentPageNumber() {
                try {
                    // First, try to get page from URL parameter custpage_2663_sublist_page
                    var url = window.location.href;
                    var pageMatch = url.match(/[&?]custpage_2663_sublist_page=([0-9]+)/);
                    if (pageMatch) {
                    var pageIndex = parseInt(pageMatch[1]);
                    var pageNumber = pageIndex + 1; // Convert 0-based to 1-based
                    console.log('Detected page from URL parameter:', pageNumber, '(index:', pageIndex + ')');
                    return pageNumber;
                    }
                    
                    // Fallback: Look for pagination text like "51 to 100 of 451"
                    var pageSelectors = [
                    'select[id*="custpage_2663_sublist"] option[selected]',
                    'div.uir-machine-table-container .uir-machine-table-pagination',
                    '.uir-machine-table-pagination',
                    'div[class*="pagination"]'
                    ];
                    
                    for (var i = 0; i < pageSelectors.length; i++) {
                    var element = document.querySelector(pageSelectors[i]);
                    if (element) {
                        var text = element.textContent || element.innerText || '';
                        var match = text.match(/(\\d+)\\s+to\\s+(\\d+)\\s+of\\s+(\\d+)/);
                        if (match) {
                        var startRecord = parseInt(match[1]);
                        var endRecord = parseInt(match[2]);
                        var totalRecords = parseInt(match[3]);
                        var pageSize = endRecord - startRecord + 1;
                        var pageNumber = Math.ceil(startRecord / pageSize);
                        console.log('Detected page from pagination text:', pageNumber, 'Records:', startRecord, 'to', endRecord);
                        return pageNumber;
                        }
                    }
                    }
                    
                    // Try to find pagination text in any element containing "to" and "of"
                    var allElements = document.querySelectorAll('*');
                    for (var j = 0; j < allElements.length; j++) {
                    var elem = allElements[j];
                    var text = elem.textContent || elem.innerText || '';
                    if (text.includes(' to ') && text.includes(' of ')) {
                        var match = text.match(/(\\d+)\\s+to\\s+(\\d+)\\s+of\\s+(\\d+)/);
                        if (match) {
                        var startRecord = parseInt(match[1]);
                        var endRecord = parseInt(match[2]);
                        var totalRecords = parseInt(match[3]);
                        var pageSize = endRecord - startRecord + 1;
                        var pageNumber = Math.ceil(startRecord / pageSize);
                        console.log('Detected page from text search:', pageNumber, 'Records:', startRecord, 'to', endRecord);
                        return pageNumber;
                        }
                    }
                    }
                    
                    // Final fallback: try generic page parameter
                    var genericPageMatch = url.match(/[&?]page=(\\d+)/);
                    if (genericPageMatch) {
                    return parseInt(genericPageMatch[1]);
                    }
                    
                    console.log('No page parameter found, defaulting to page 1');
                    return 1; // Default to page 1
                } catch (e) {
                    console.error('Error detecting page number:', e);
                    return 1;
                }
            }
            
            // These functions have been removed as they referenced non-existent window.zetaGlobalStats
            // All functionality is now handled by the session-based approach with updateGlobalStats()
            
            // Simplified single selection function - applies selections to current page
            function applySelections() {
                // Prevent multiple processing
                if (window.zetaGlobalTracker.isProcessing) {
                    console.log('Already processing selections, skipping');
                    return;
                }
                
                // Load global tracker
                var tracker = loadGlobalTracker();
                if (!tracker || !tracker.csvIds || tracker.csvIds.length === 0) {
                    console.log('No global tracker or CSV IDs found');
                    return;
                }
                
                window.zetaGlobalTracker.isProcessing = true;
                console.log('Applying selections to current page with', tracker.csvIds.length, 'CSV IDs');
            
                try {
                    // Find the sublist table
                    var sublistTable = null;
                    var possibleSelectors = [
                    'table[id*="custpage_2663_sublist"]',
                    'div[id*="custpage_2663_sublist"] table',
                    'table.uir-machine-table-container table',
                    'div.uir-machine-table-container table'
                    ];
                    
                    for (var s = 0; s < possibleSelectors.length; s++) {
                        sublistTable = document.querySelector(possibleSelectors[s]);
                        if (sublistTable) {
                            console.log('Found sublist table using selector:', possibleSelectors[s]);
                            break;
                        }
                    }
                    
                    if (!sublistTable) {
                        console.error('Could not find sublist table');
                        return;
                    }
                    
                    // Process rows and find matching IDs
                    var rows = sublistTable.getElementsByTagName('tr');
                    var currentPageSelected = 0;
                    
                    for (var i = 0; i < rows.length; i++) {
                    var row = rows[i];
                    var internalIdValue = '';
                    
                    // Try different approaches to find the internal ID
                    var possibleSelectors = [
                        'td[data-ns-tooltip="custpage_internalid"]',
                        'span[data-ns-tooltip="custpage_internalid"]',
                        'input[name*="custpage_internalid"]',
                        'span[id*="custpage_internalid"]'
                    ];
                    
                    for (var sel = 0; sel < possibleSelectors.length; sel++) {
                        var internalIdCell = row.querySelector(possibleSelectors[sel]);
                        if (internalIdCell) {
                            if (internalIdCell.tagName === 'INPUT') {
                                internalIdValue = internalIdCell.value;
                            } else {
                                internalIdValue = internalIdCell.textContent || internalIdCell.innerText;
                            }
                            internalIdValue = internalIdValue.trim();
                            if (internalIdValue) break;
                        }
                    }
                    
                    // Find checkbox in the row
                    var checkbox = row.querySelector('input[type="checkbox"]');
                    
                    if (internalIdValue && checkbox && tracker.csvIds.includes(internalIdValue)) {
                        // Select if not already selected
                        if (!checkbox.checked) {
                            setTimeout(function(cb, id) {
                                return function() {
                                cb.click();
                                // Track this ID as selected
                                window.zetaGlobalTracker.selectedIds.add(id);
                                saveGlobalTracker();
                                console.log('Selected ID:', id);
                                };
                            }(checkbox, internalIdValue), i * 50);
                            currentPageSelected++;
                        } else {
                            // Already selected, just track it
                            window.zetaGlobalTracker.selectedIds.add(internalIdValue);
                        }
                    }
                    }
                    
                    console.log('Applied selections to current page - Selected:', currentPageSelected, 'new IDs');
                    
                } catch (e) {
                    console.error('Error applying selections:', e);
                } finally {
                    setTimeout(function() {
                    window.zetaGlobalTracker.isProcessing = false;
                    saveGlobalTracker();
                    }, 2000);
                }
            }
            
            // New simplified summary function with textarea display
            function showFinalSummary() {
                var tracker = loadGlobalTracker();
                if (!tracker || !tracker.csvIds || tracker.csvIds.length === 0) {
                    alert('No CSV file has been processed yet. Please upload a CSV file and click "Process CSV" first.');
                    return;
                }
                
                var totalInFile = tracker.csvIds.length;
                var totalSelected = tracker.selectedIds.size;
                var notSelected = totalInFile - totalSelected;
                
                // Find not selected IDs
                var notSelectedIds = [];
                for (var i = 0; i < tracker.csvIds.length; i++) {
                    var id = tracker.csvIds[i];
                    if (!tracker.selectedIds.has(id)) {
                    notSelectedIds.push(id);
                    }
                }
            
                // Create summary text
                var summaryText = 'CSV File: ' + tracker.fileName + '\\n' +
                                'Total Records in File: ' + totalInFile + '\\n' +
                                'Selected: ' + totalSelected + '\\n' +
                                'Not Selected: ' + notSelected + '\\n\\n';

                if (notSelectedIds.length > 0) {
                    summaryText += 'Not Selected IDs:\\n' + notSelectedIds.join(', ');
                } else {
                    summaryText += 'All IDs have been selected successfully!';
                }
                
                // Create or update summary textarea
                showSummaryInTextarea(summaryText);
            
                console.log('Summary generated:', {
                    fileName: tracker.fileName,
                    totalInFile: totalInFile,
                    totalSelected: totalSelected,
                    notSelected: notSelected,
                    notSelectedIds: notSelectedIds
                });
            }
            
            // Function to display summary in a copyable textarea
            function showSummaryInTextarea(summaryText) {
                // Remove existing summary if present
                var existingSummary = document.getElementById('zetaSummaryTextarea');
                if (existingSummary) {
                    existingSummary.remove();
                }
                
                // Create summary container
                var summaryContainer = document.createElement('div');
                summaryContainer.id = 'zetaSummaryContainer';
                summaryContainer.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); ' +
                                                'background: white; border: 2px solid #4CAF50; border-radius: 8px; ' +
                                                'padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 10000; ' +
                                                'max-width: 600px; max-height: 500px;';
                
                // Create title
                var title = document.createElement('h3');
                title.textContent = 'Selection Summary';
                title.style.cssText = 'margin: 0 0 15px 0; color: #4CAF50; text-align: center;';
                summaryContainer.appendChild(title);
            
                // Create textarea
                var textarea = document.createElement('textarea');
                textarea.id = 'zetaSummaryTextarea';
                textarea.value = summaryText;
                textarea.style.cssText = 'width: 100%; height: 300px; font-family: monospace; font-size: 12px; ' +
                                        'border: 1px solid #ddd; border-radius: 4px; padding: 10px; ' +
                                        'resize: vertical; box-sizing: border-box;';
                textarea.readOnly = true;
                summaryContainer.appendChild(textarea);
                
                // Create buttons container
                var buttonsContainer = document.createElement('div');
                buttonsContainer.style.cssText = 'text-align: center; margin-top: 15px;';
                
                // Create copy button
                var copyButton = document.createElement('button');
                copyButton.textContent = 'Copy to Clipboard';
                copyButton.style.cssText = 'background-color: #4CAF50; color: white; padding: 10px 20px; ' +
                                            'border: none; border-radius: 4px; cursor: pointer; font-size: 14px; margin: 0 10px;';
                copyButton.onclick = function() {
                    textarea.select();
                    document.execCommand('copy');
                    copyButton.textContent = 'Copied!';
                    setTimeout(function() {
                    copyButton.textContent = 'Copy to Clipboard';
                    }, 2000);
                };
                buttonsContainer.appendChild(copyButton);
            
                // Create close button
                var closeButton = document.createElement('button');
                closeButton.textContent = 'Close';
                closeButton.style.cssText = 'background-color: #f44336; color: white; padding: 10px 20px; ' +
                                            'border: none; border-radius: 4px; cursor: pointer; font-size: 14px; margin: 0 10px;';
                closeButton.onclick = function() {
                    summaryContainer.remove();
                };
                buttonsContainer.appendChild(closeButton);
                
                summaryContainer.appendChild(buttonsContainer);
                
                // Add to page
                document.body.appendChild(summaryContainer);
                
                // Auto-select text for easy copying
                textarea.select();
                }
            
                // File upload handler - now stores file info and validates
                function handleFileUpload(event) {
                    var file = event.target.files[0];
                    if (!file) {
                        console.log('No file selected');
                        // Clear stored file info if no file selected
                        sessionStorage.removeItem(SELECTED_FILE_KEY);
                        return;
                    }
                    
                    // Validate file type
                    if (!file.name.toLowerCase().endsWith('.csv')) {
                        alert('Please upload a CSV file only');
                        event.target.value = '';
                        sessionStorage.removeItem(SELECTED_FILE_KEY);
                        return;
                    }
                    
                    // Validate file size (limit to 5MB)
                    if (file.size > 5 * 1024 * 1024) {
                        alert('File size must be less than 5MB');
                        event.target.value = '';
                        sessionStorage.removeItem(SELECTED_FILE_KEY);
                        return;
                    }
                
                    // Store file info for persistence across pages
                    storeSelectedFile(file.name, file.size, file.lastModified);
                        console.log('CSV file selected:', file.name, '- Click "Process CSV" button to begin processing');
                    }
            
                    // New simplified function called by "Process CSV" button
                    function processCsvData() {
                        console.log('Process CSV button clicked');
                        
                        // Find the file upload field
                        var csvUploadField = document.getElementById('custpage_zeta_csv_upload') ||
                                            document.querySelector('input[name="custpage_zeta_csv_upload"]') ||
                                            document.querySelector('input[type="file"]');
                        
                        if (!csvUploadField || !csvUploadField.files || csvUploadField.files.length === 0) {
                            alert('Please select a CSV file first');
                            return;
                        }
                
                        var file = csvUploadField.files[0];
                        console.log('Processing CSV file:', file.name);
                    
                        // Read the file content
                        var reader = new FileReader();
                        reader.onload = function(e) {
                            var csvContent = e.target.result;
                            var allInternalIds = parseCSVFile(csvContent);
                            
                            if (allInternalIds && allInternalIds.length > 0) {
                            // Check if this is a new file or existing file
                            var existingTracker = loadGlobalTracker();
                            var isNewFile = !existingTracker || existingTracker.fileName !== file.name;
                            
                            if (isNewFile) {
                                // New file - reset everything and start fresh
                                console.log('New file detected - initializing global tracker');
                                resetGlobalTracker();
                                cleanupOldSessions();
                                
                                // Initialize new global tracker with all CSV data
                                initializeGlobalTracker(file.name, allInternalIds);
                                alert('CSV processed: ' + file.name + ' with ' + allInternalIds.length + ' IDs. Applying selections to current page...');
                            } else {
                                // Same file - continue existing tracker
                                console.log('Same file - using existing global tracker');
                                alert('Using existing data for: ' + file.name + ' (' + existingTracker.selectedIds.size + ' IDs already selected)');
                            }
                            
                            // Update UI to processed state
                            updateUIToProcessedState(file.name);
                            
                            // Apply selections to current page
                            applySelections();
                            }
                        };
                
                        reader.onerror = function() {
                            alert('Error reading the CSV file');
                        };
                
                        reader.readAsText(file);
                    }
            
                    // Reset CSV session function (called by Reset button)
                    function resetCsvSession() {
                        if (confirm('This will clear all processed data and reset the session. Continue?')) {
                            console.log('Resetting CSV session...');
                            
                            // Clear all session storage
                            resetGlobalTracker();
                            sessionStorage.removeItem(SELECTED_FILE_KEY);
                            cleanupOldSessions();
                            
                            // Update hidden field
                            updateHiddenFileName('');
                            
                            // Reset UI to initial state
                            updateUIToInitialState();
                            
                            // Clear file upload field
                            var csvUploadField = document.getElementById('custpage_zeta_csv_upload') || 
                                                document.querySelector('input[name="custpage_zeta_csv_upload"]') ||
                                                document.querySelector('input[type="file"]');
                            if (csvUploadField) {
                            csvUploadField.value = '';
                            }
                            
                            alert('Session reset successfully. You can now upload a new CSV file.');
                        }
                    }
            
                    // Update UI to show processed state
                    function updateUIToProcessedState(fileName) {
                        console.log('Updating UI to processed state for:', fileName);
                        
                        // Hide file upload field
                        var csvUploadField = document.getElementById('custpage_zeta_csv_upload');
                        if (csvUploadField) {
                            var uploadContainer = csvUploadField.closest('tr') || csvUploadField.closest('.uir-field-wrapper');
                            if (uploadContainer) {
                            uploadContainer.style.display = 'none';
                            }
                        }
                
                        // Update file display
                        updateFileDisplay(fileName);
                        
                        // Hide Process CSV button
                        var processBtn = document.getElementById('zetaProcessBtn');
                        if (processBtn) {
                            processBtn.style.display = 'none';
                        }
                        
                        // Show Reset button
                        var resetBtn = document.getElementById('zetaResetBtn');
                        if (resetBtn) {
                            resetBtn.style.display = 'inline-block';
                        }
                        
                        // Update hidden field
                        updateHiddenFileName(fileName);
                    }
            
                    // Update UI to show initial state
                    function updateUIToInitialState() {
                        console.log('Updating UI to initial state');
                        
                        // Show file upload field
                        var csvUploadField = document.getElementById('custpage_zeta_csv_upload');
                        if (csvUploadField) {
                            var uploadContainer = csvUploadField.closest('tr') || csvUploadField.closest('.uir-field-wrapper');
                            if (uploadContainer) {
                            uploadContainer.style.display = '';
                            }
                        }
                        
                        // Clear file display
                        updateFileDisplay('');
                        
                        // Show Process CSV button
                        var processBtn = document.getElementById('zetaProcessBtn');
                        if (processBtn) {
                            processBtn.style.display = 'inline-block';
                        }
                        
                        // Hide Reset button
                        var resetBtn = document.getElementById('zetaResetBtn');
                        if (resetBtn) {
                            resetBtn.style.display = 'none';
                        }
                    }
            
                    // Update file display area
                    function updateFileDisplay(fileName) {
                        var fileDisplayField = document.querySelector('[id*="custpage_zeta_file_display"]');
                        if (fileDisplayField) {
                            if (fileName) {
                            fileDisplayField.innerHTML = '<div style="padding: 10px; background-color: #e8f5e8; border: 1px solid #4CAF50; border-radius: 4px; margin: 5px 0;">' +
                                                        '<strong>Active CSV File:</strong> ' + fileName + 
                                                        ' <span style="color: #4CAF50; font-weight: bold;">✓ Processed</span></div>';
                            } else {
                            fileDisplayField.innerHTML = '';
                            }
                        }
                    }
            
                    // Update hidden filename field
                    function updateHiddenFileName(fileName) {
                        var hiddenField = document.getElementById('custpage_zeta_selected_filename') ||
                                        document.querySelector('input[name="custpage_zeta_selected_filename"]');
                        if (hiddenField) {
                            hiddenField.value = fileName || '';
                            console.log('Updated hidden filename field:', fileName);
                        }
                    }
            
                    // Legacy functions removed - all functionality now handled by applySelections()
                    
                    // Set up MutationObserver to detect sublist changes (pagination)
                    function setupSublistObserver() {
                        var sublistContainer = document.querySelector('div[id*="custpage_2663_sublist"], table[id*="custpage_2663_sublist"]');
                        if (!sublistContainer) {
                            console.log('Sublist container not found, will retry observer setup');
                            setTimeout(setupSublistObserver, 2000);
                            return;
                        }
                
                        var config = { childList: true, subtree: true };
                
                        var observer = new MutationObserver(function(mutationsList) {
                            // Skip if we're currently processing selections to avoid loops
                            if (window.zetaGlobalTracker.isProcessing) {
                            return;
                            }
                            
                            // Check if the sublist structure has actually changed (not just checkbox states)
                            var hasStructuralChange = false;
                            
                            for (var mutation of mutationsList) {
                            if (mutation.type === 'childList') {
                                // Look for actual row additions/removals, not just attribute changes
                                if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
                                for (var i = 0; i < mutation.addedNodes.length; i++) {
                                    var node = mutation.addedNodes[i];
                                    if (node.nodeType === 1 && (node.tagName === 'TR' || node.tagName === 'TBODY' || node.querySelector('tr'))) {
                                    hasStructuralChange = true;
                                    break;
                                    }
                                }
                                for (var j = 0; j < mutation.removedNodes.length; j++) {
                                    var removedNode = mutation.removedNodes[j];
                                    if (removedNode.nodeType === 1 && (removedNode.tagName === 'TR' || removedNode.tagName === 'TBODY' || removedNode.querySelector('tr'))) {
                                    hasStructuralChange = true;
                                    break;
                                    }
                                }
                            }
                        }
                    }
                
                    // Check if we have a global tracker with CSV IDs
                    var tracker = loadGlobalTracker();
                    if (hasStructuralChange && tracker && tracker.csvIds && tracker.csvIds.length > 0) {
                        console.log('Detected pagination/structural change, reapplying selections');
                        // Delay to ensure DOM is fully updated
                        setTimeout(applySelections, 1000);
                    }
                });
            
                observer.observe(sublistContainer, config);
                console.log('Sublist observer set up for pagination persistence on:', sublistContainer);
            }
            
            // Function to setup file upload listener
            function setupFileUploadListener() {
                console.log('Setting up file upload listener...');
                
                // Try multiple ways to find the file upload field
                var csvUploadField = document.getElementById('custpage_zeta_csv_upload');
                
                // If not found by ID, try by name attribute
                if (!csvUploadField) {
                    csvUploadField = document.querySelector('input[name="custpage_zeta_csv_upload"]');
                    console.log('Found by name attribute:', csvUploadField);
                }
                
                // If still not found, try finding any file input
                if (!csvUploadField) {
                    var fileInputs = document.querySelectorAll('input[type="file"]');
                    console.log('Found file inputs:', fileInputs.length);
                    for (var i = 0; i < fileInputs.length; i++) {
                    console.log('File input', i, ':', fileInputs[i].id, fileInputs[i].name);
                    if (fileInputs[i].id && fileInputs[i].id.includes('custpage_zeta_csv_upload')) {
                        csvUploadField = fileInputs[i];
                        break;
                    }
                    }
                }
            
                if (csvUploadField) {
                    console.log('Found CSV upload field:', csvUploadField.id || csvUploadField.name);
                    
                    // Remove any existing listeners to avoid duplicates
                    csvUploadField.removeEventListener('change', handleFileUpload);
                    csvUploadField.removeEventListener('input', handleFileUpload);
                    
                    // Listen for file upload change event
                    csvUploadField.addEventListener('change', function(event) {
                    console.log('File upload change event triggered');
                    handleFileUpload(event);
                    });
                    
                    // Also listen for input event as backup
                    csvUploadField.addEventListener('input', function(event) {
                    console.log('File upload input event triggered');
                    handleFileUpload(event);
                    });
                    
                    return true; // Found and set up
                } else {
                    console.error('Could not find CSV upload field');
                    // Log all form elements for debugging
                    var allInputs = document.querySelectorAll('input');
                    console.log('All input elements found:');
                    for (var j = 0; j < allInputs.length; j++) {
                    console.log('Input', j, '- Type:', allInputs[j].type, 'ID:', allInputs[j].id, 'Name:', allInputs[j].name);
                    }
                    return false; // Not found
                }
            }
            
            // Function to check and load any existing session on page load
            function checkForExistingSession() {
                console.log('Checking for existing session data...');
            
                // Look for any existing session data in sessionStorage
                try {
                    var latestSession = null;
                    var latestTimestamp = 0;
                    
                    for (var i = 0; i < sessionStorage.length; i++) {
                    var key = sessionStorage.key(i);
                    var sessionData = null;
                    
                    // Check both old and new session key formats
                    if (key && key.startsWith('zeta_csv_stats_')) {
                        // Legacy format
                        sessionData = loadSessionData(key.replace('zeta_csv_stats_', ''));
                    } else if (key && key.startsWith('zeta_session_')) {
                        // New filename-based format
                        var fileName = key.replace('zeta_session_', '').replace(/_/g, '.');
                        sessionData = loadSessionByFileName(fileName);
                    }
                    
                    if (sessionData && sessionData.lastUpdated > latestTimestamp) {
                        latestSession = sessionData;
                        latestTimestamp = sessionData.lastUpdated;
                    }
                    }
                    
                    if (latestSession) {
                    console.log('Found existing session:', latestSession);
                    
                    // Load the session data into global stats
                    window.zetaGlobalStats.totalInFile = latestSession.totalInFile;
                    window.zetaGlobalStats.fileName = latestSession.fileName;
                    window.zetaGlobalStats.fileIdentifier = latestSession.fileIdentifier;
                    window.zetaGlobalStats.processedPages = latestSession.processedPages;
                    window.zetaGlobalStats.sessionStats = latestSession.sessionStats;
                    
                    // Restore the internal IDs array - CRITICAL for session continuity
                    if (latestSession.internalIds && latestSession.internalIds.length > 0) {
                        window.zetaSelectedInternalIds = latestSession.internalIds;
                        console.log('Restored internal IDs from session:', window.zetaSelectedInternalIds.length, 'IDs');
                    }
                    
                    // Rebuild processedIds Set from all pages
                    window.zetaGlobalStats.processedIds = new Set();
                    latestSession.processedPages.forEach(function(pageData) {
                        pageData.ids.forEach(function(id) {
                        window.zetaGlobalStats.processedIds.add(id);
                        });
                    });
                    
                    console.log('Loaded existing session into global stats:', window.zetaGlobalStats);
                    
                    // Show session continuation message
                    var currentPage = getCurrentPageNumber();
                    console.log('Session loaded on page', currentPage, '- Previous pages processed:', window.zetaGlobalStats.sessionStats.pagesProcessed);
                    
                    // Auto-apply selections if we have restored IDs and we're on a new page
                    if (window.zetaSelectedInternalIds && window.zetaSelectedInternalIds.length > 0) {
                        console.log('Auto-applying restored selections after page load');
                        setTimeout(function() {
                        selectSublistRowsByInternalIds();
                        }, 2000); // Delay to ensure DOM is ready
                    }
                    
                    return true;
                    } else {
                    console.log('No existing session found');
                    return false;
                    }
                } catch (e) {
                    console.error('Error checking for existing session:', e);
                    return false;
                }
            }
            
            // Restore file selection from stored info
            function restoreFileSelection() {
                var storedFileInfo = getStoredFileInfo();
                if (!storedFileInfo) {
                    console.log('No stored file info found');
                    return false;
                }
            
                console.log('Attempting to restore file selection:', storedFileInfo.fileName);
            
                // Find the file upload field
                var csvUploadField = document.getElementById('custpage_zeta_csv_upload') || 
                                    document.querySelector('input[name="custpage_zeta_csv_upload"]') ||
                                    document.querySelector('input[type="file"]');
                
                if (!csvUploadField) {
                    console.log('File upload field not found for restoration');
                    return false;
                }
                
                // Check if there's already a file selected
                if (csvUploadField.files && csvUploadField.files.length > 0) {
                    var currentFile = csvUploadField.files[0];
                    if (currentFile.name === storedFileInfo.fileName && 
                        currentFile.size === storedFileInfo.fileSize &&
                        currentFile.lastModified === storedFileInfo.fileLastModified) {
                    console.log('File already matches stored info - no restoration needed');
                    return true;
                    }
                }
            
                // Note: We cannot programmatically set file input values for security reasons
                // But we can show a message to the user about the expected file
                console.log('File selection cannot be automatically restored due to browser security restrictions');
                console.log('Expected file:', storedFileInfo.fileName);
                
                return false;
            }
            
            // Check file consistency and clear cache if file is missing
            function validateFileConsistency() {
                var session = loadActiveSession();
                var storedFileInfo = getStoredFileInfo();
                
                // If we have a session but no stored file info, clear the session
                if (session && !storedFileInfo) {
                    console.log('Session exists but no file info - clearing cache to prevent accidental processing');
                    resetSession();
                    sessionStorage.removeItem(SELECTED_FILE_KEY);
                    cleanupOldSessions();
                    return false;
                }
                
                // If we have stored file info but no session, that's okay (file selected but not processed yet)
                if (!session && storedFileInfo) {
                    console.log('File info exists but no session - waiting for Process CSV button');
                    return true;
                }
                
                // If we have both, check if they match
                if (session && storedFileInfo) {
                    if (session.fileName !== storedFileInfo.fileName) {
                    console.log('Session and file info mismatch - clearing cache');
                    resetSession();
                    sessionStorage.removeItem(SELECTED_FILE_KEY);
                    cleanupOldSessions();
                    return false;
                    }
                }
            
                return true;
            }
            
            // Simplified page load handler using global tracker
            function handlePageLoad() {
                console.log('Page loaded - checking for global tracker');
            
                // Load global tracker from storage
                var tracker = loadGlobalTracker();
                if (tracker && tracker.csvIds && tracker.csvIds.length > 0) {
                    console.log('Global tracker found:', tracker.fileName, 'with', tracker.csvIds.length, 'CSV IDs and', tracker.selectedIds.size, 'selected IDs');
                    
                    // Update UI to show processed state
                    setTimeout(function() {
                    updateUIToProcessedState(tracker.fileName);
                    console.log('Auto-applying selections from global tracker');
                    applySelections();
                    }, 1000); // Delay to ensure DOM is ready
                } else {
                    console.log('No global tracker found - waiting for file upload and Process CSV button click');
                    updateUIToInitialState();
                }
            }
            
            // Wait for DOM to be ready
            document.addEventListener('DOMContentLoaded', function() {
                console.log('DOM loaded, setting up storage-first architecture');
                
                // Handle page load with storage-first approach
                handlePageLoad();
                
                // Use event delegation for file upload detection
                document.addEventListener('change', function(event) {
                    if (event.target && event.target.type === 'file' &&
                        (event.target.id === 'custpage_zeta_csv_upload' ||
                        event.target.name === 'custpage_zeta_csv_upload' ||
                        (event.target.id && event.target.id.includes('custpage_zeta_csv_upload')))) {
                    console.log('File upload detected via event delegation');
                    handleFileUpload(event);
                    }
                });
                
                // Try to set up direct listeners with multiple attempts
                var attempts = 0;
                var maxAttempts = 5;
            
                function trySetupListener() {
                    attempts++;
                    console.log('Attempt', attempts, 'to find CSV upload field...');
                    
                    if (setupFileUploadListener()) {
                    console.log('Successfully set up file upload listener');
                    setupSublistObserver();
                    } else if (attempts < maxAttempts) {
                    console.log('Retrying in 2 seconds...');
                    setTimeout(trySetupListener, 2000);
                    } else {
                    console.log('Max attempts reached. Relying on event delegation.');
                    setupSublistObserver();
                    }
                }
                
                // Start trying after initial delay
                setTimeout(trySetupListener, 1000);
            });
            </script>`;

            //   form.clientScriptModulePath = './zeta_cl_custombillprocessor.js'; // Add client script path
            //  form.clientScriptFileId = '2873232';
            context.response.writePage(form);

        } catch (e) {
            log.error("error in loading", e)
        }
    }
    return {
        onRequest: onRequest,
    };
});
