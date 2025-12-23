const { createClient } = require('@supabase/supabase-js');

/**
 * AdminProcessEventLogger
 * Sistema de logging para el proceso de extracción y procesamiento de documentos
 */
class AdminProcessEventLogger {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }

    /**
     * Registra un evento del proceso de admin
     */
    async logEvent({ batch_id, user_id, event_type, event_data = {}, status = 'info' }) {
        try {
            const { error } = await this.supabase
                .from('admin_process_events')
                .insert({
                    batch_id,
                    user_id,
                    event_type,
                    event_data,
                    status,
                    created_at: new Date().toISOString()
                });

            if (error) {
                console.error('❌ Error logging admin event:', error);
            }
        } catch (err) {
            console.error('❌ Exception in logEvent:', err);
        }
    }

    // Eventos específicos del proceso
    async logBatchProcessingStarted(batch_id, user_id, documentCount) {
        await this.logEvent({
            batch_id,
            user_id,
            event_type: 'BATCH_PROCESSING_STARTED',
            event_data: { document_count: documentCount },
            status: 'info'
        });
    }

    async logDocumentProcessed(batch_id, user_id, documentId, documentType, fieldsExtracted) {
        await this.logEvent({
            batch_id,
            user_id,
            event_type: 'DOCUMENT_PROCESSED',
            event_data: {
                document_id: documentId,
                document_type: documentType,
                fields_extracted: fieldsExtracted
            },
            status: 'success'
        });
    }

    async logDocumentFailed(batch_id, user_id, documentId, error) {
        await this.logEvent({
            batch_id,
            user_id,
            event_type: 'DOCUMENT_PROCESSING_FAILED',
            event_data: {
                document_id: documentId,
                error_message: error.message || String(error)
            },
            status: 'error'
        });
    }

    async logDataConsolidationStarted(batch_id, user_id, documentCount) {
        await this.logEvent({
            batch_id,
            user_id,
            event_type: 'DATA_CONSOLIDATION_STARTED',
            event_data: { document_count: documentCount },
            status: 'info'
        });
    }

    async logDataConsolidated(batch_id, user_id, totalFields) {
        await this.logEvent({
            batch_id,
            user_id,
            event_type: 'DATA_CONSOLIDATED',
            event_data: { total_fields: totalFields },
            status: 'success'
        });
    }

    async logPropertyCreated(batch_id, user_id, propertyId, address, isPrimary) {
        await this.logEvent({
            batch_id,
            user_id,
            event_type: 'PROPERTY_CREATED',
            event_data: {
                property_id: propertyId,
                address: address,
                is_primary_residence: isPrimary
            },
            status: 'success'
        });
    }

    async logBatchStatusUpdated(batch_id, user_id, newStatus) {
        await this.logEvent({
            batch_id,
            user_id,
            event_type: 'BATCH_STATUS_UPDATED',
            event_data: { new_status: newStatus },
            status: 'success'
        });
    }

    async logBatchProcessingCompleted(batch_id, user_id, documentsProcessed, propertyCreated) {
        await this.logEvent({
            batch_id,
            user_id,
            event_type: 'BATCH_PROCESSING_COMPLETED',
            event_data: {
                documents_processed: documentsProcessed,
                property_created: propertyCreated
            },
            status: 'success'
        });
    }

    async logBatchProcessingFailed(batch_id, user_id, error) {
        await this.logEvent({
            batch_id,
            user_id,
            event_type: 'BATCH_PROCESSING_FAILED',
            event_data: {
                error_message: error.message || String(error),
                error_stack: error.stack
            },
            status: 'error'
        });
    }
}

module.exports = AdminProcessEventLogger;
