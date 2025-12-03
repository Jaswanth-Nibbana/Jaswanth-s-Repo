/**
 * @NApiVersion 2.1
 * @description Button action functions for Insertion Order approval workflow
 */

define(['N/currentRecord', 'N/record', 'N/ui/dialog', './zeta_lib_io_utils'], 
function(currentRecord, record, dialog, ioUtils) {

    /**
     * Submit for Review button handler
     */
    function submitForReview() {
        try {
            const currentRec = currentRecord.get();
            const recordId = currentRec.id;
            
            const rec = record.load({
                type: ioUtils.RECORD_TYPE,
                id: recordId
            });

            // Get IO total and SF total
            const ioTotal = rec.getValue('custrecord_zeta_io_ordertotal');
            const sfTotal = rec.getValue('custrecord_zeta_io_sfopportunitytotal');

            // Compare totals
            if (ioTotal !== sfTotal) {
                dialog.alert({
                    title: 'Totals Mismatch',
                    message: 'IO Total and SalesForce Total must be equal to proceed with review.'
                });
            }else{
                rec.setValue(ioUtils.FIELDS.APPROVAL_STATUS, ioUtils.APPROVAL_STATUS.SUBMITTED_FOR_REVIEW);
                rec.save();
                window.location.reload();
            }
            
        } catch (error) {
            console.error('Error in submitForReview:', error);
            dialog.alert({
                title: 'Error',
                message: 'An error occurred while submitting for review: ' + error.message
            });
        }
    }

    /**
     * Mark as Reviewed button handler
     */
    function markAsReviewed() {
        try {
            const currentRec = currentRecord.get();
            const recordId = currentRec.id;
            
            const rec = record.load({
                type: ioUtils.RECORD_TYPE,
                id: recordId
            });

            // Get IO total and SF total
            const ioTotal = rec.getValue(ioUtils.FIELDS.IO_TOTAL);
            const sfTotal = rec.getValue(ioUtils.FIELDS.SALESFORCE_OPPORTUNITY_TOTAL);

            // Compare totals
            if (ioTotal !== sfTotal) {
                dialog.alert({
                    title: 'Totals Mismatch',
                    message: 'IO Total and SalesForce Total must be equal to proceed with review.'
                });
            }else{
                rec.setValue(ioUtils.FIELDS.APPROVAL_STATUS, ioUtils.APPROVAL_STATUS.REVIEWED_PENDING_APPROVAL);
                rec.save();
                window.location.reload();
            }
            
        } catch (error) {
            console.error('Error in markAsReviewed:', error);
            dialog.alert({
                title: 'Error',
                message: 'An error occurred while marking as reviewed: ' + error.message
            });
        }
    }

    /**
     * Approve IO button handler
     */
    function approveIO() {
        try {
            const currentRec = currentRecord.get();
            const recordId = currentRec.id;
            
            const rec = record.load({
                type: ioUtils.RECORD_TYPE,
                id: recordId
            });

            // Get IO total and SF total
            const ioTotal = rec.getValue('custrecord_zeta_io_ordertotal');
            const sfTotal = rec.getValue('custrecord_zeta_io_sfopportunitytotal');

            // Compare totals
            if (ioTotal !== sfTotal) {
                dialog.alert({
                    title: 'Totals Mismatch',
                    message: 'IO Total and SalesForce Total must be equal to proceed with review.'
                });
            }else{
                rec.setValue(ioUtils.FIELDS.APPROVAL_STATUS, ioUtils.APPROVAL_STATUS.APPROVED);
                rec.save();
                window.location.reload();
            }
            
        } catch (error) {
            console.error('Error in approveIO:', error);
            dialog.alert({
                title: 'Error',
                message: 'An error occurred while approving: ' + error.message
            });
        }
    }

    /**
     * Reject IO button handler
     */
    function rejectIO() {
        try {
            const currentRec = currentRecord.get();
            const recordId = currentRec.id;
            
            // Function to prompt for reject reason with validation loop
            function getRejectReason() {
                let rejectReason = null;
                let attempts = 0;
                const maxAttempts = 3;
                
                while (attempts < maxAttempts) {
                    rejectReason = prompt('Please enter the reason for rejection (required):');
                    
                    // User cancelled
                    if (rejectReason === null) {
                        return null;
                    }
                    
                    // Validate the reason
                    if (rejectReason && rejectReason.trim() !== '') {
                        const trimmedReason = rejectReason.trim();
                        // Check minimum length
                        if (trimmedReason.length >= 5) {
                            return trimmedReason;
                        } else {
                            alert('Reject reason must be at least 5 characters long. Please provide a meaningful reason for rejection.');
                            continue; // Continue the loop to ask again
                        }
                    }
                    
                    attempts++;
                    
                    // Show different messages based on attempt
                    if (attempts < maxAttempts) {
                        alert('Reject reason is mandatory. Please provide a valid reason for rejection.');
                    } else {
                        alert('Reject reason is required. Rejection cancelled after ' + maxAttempts + ' attempts.');
                        return null;
                    }
                }
                
                return null;
            }
            
            // Get reject reason with validation
            const rejectReason = getRejectReason();
            
            // If user provided a valid reason, proceed with rejection
            if (rejectReason) {
                const rec = record.load({
                    type: ioUtils.RECORD_TYPE,
                    id: recordId
                });
                
                rec.setValue(ioUtils.FIELDS.REJECT_REASON, rejectReason);
                rec.setValue(ioUtils.FIELDS.APPROVAL_STATUS, ioUtils.APPROVAL_STATUS.REJECTED);
                rec.save();
                window.location.reload();
            }
            // If rejectReason is null, user cancelled or failed validation - do nothing
            
        } catch (error) {
            console.error('Error in rejectIO:', error);
            dialog.alert({
                title: 'Error',
                message: 'An error occurred while rejecting: ' + error.message
            });
        }
    }

    /**
     * Resubmit IO button handler
     */
    function resubmitIO() {
        try {
            const currentRec = currentRecord.get();
            const recordId = currentRec.id;
            
            const rec = record.load({
                type: ioUtils.RECORD_TYPE,
                id: recordId
            });
            
            // Clear reject reason and set status back to submitted for review
            rec.setValue(ioUtils.FIELDS.REJECT_REASON, '');
            rec.setValue(ioUtils.FIELDS.APPROVAL_STATUS, ioUtils.APPROVAL_STATUS.SUBMITTED_FOR_REVIEW);
            rec.save();
            window.location.reload();
            
        } catch (error) {
            console.error('Error in resubmitIO:', error);
            dialog.alert({
                title: 'Error',
                message: 'An error occurred while resubmitting: ' + error.message
            });
        }
    }

    // Make functions globally accessible for button clicks (NetSuite requirement)
    if (typeof window !== 'undefined') {
        window.submitForReview = submitForReview;
        window.markAsReviewed = markAsReviewed;
        window.approveIO = approveIO;
        window.rejectIO = rejectIO;
        window.resubmitIO = resubmitIO;
    }

    return {
        submitForReview: submitForReview,
        markAsReviewed: markAsReviewed,
        approveIO: approveIO,
        rejectIO: rejectIO,
        resubmitIO: resubmitIO
    };
});
