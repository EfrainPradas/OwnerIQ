/**
 * Event Logger para el proceso de Onboarding
 * Centraliza el logging de eventos para auditoría y analytics
 */

class OnboardingEventLogger {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Registra un evento en el log
     * @param {Object} eventData - Datos del evento
     * @returns {Promise<Object>} - Resultado de la inserción
     */
    async logEvent({
        userId,
        batchId = null,
        uploadId = null,
        eventType,
        eventCategory,
        stepNumber = null,
        documentType = null,
        status = null,
        metadata = {},
        errorMessage = null,
        errorCode = null
    }) {
        try {
            const { data, error } = await this.supabase
                .from('onboarding_event_log')
                .insert({
                    user_id: userId,
                    batch_id: batchId,
                    upload_id: uploadId,
                    event_type: eventType,
                    event_category: eventCategory,
                    step_number: stepNumber,
                    document_type: documentType,
                    status: status,
                    metadata: metadata,
                    error_message: errorMessage,
                    error_code: errorCode,
                    created_at: new Date().toISOString()
                });

            if (error) {
                console.error('❌ Failed to log event:', error);
                return { success: false, error };
            }

            console.log(`📝 Event logged: ${eventType} | User: ${userId.substring(0, 8)}`);
            return { success: true, data };
        } catch (err) {
            console.error('❌ Event logging exception:', err);
            return { success: false, error: err };
        }
    }

    // ========== Eventos de Navegación ==========

    async logOnboardingStarted(userId, metadata = {}) {
        return this.logEvent({
            userId,
            eventType: 'onboarding_started',
            eventCategory: 'navigation',
            stepNumber: 1,
            status: 'started',
            metadata
        });
    }

    async logStepCompleted(userId, stepNumber, metadata = {}) {
        return this.logEvent({
            userId,
            eventType: 'step_completed',
            eventCategory: 'navigation',
            stepNumber,
            status: 'completed',
            metadata
        });
    }

    async logOnboardingCompleted(userId, batchId, metadata = {}) {
        return this.logEvent({
            userId,
            batchId,
            eventType: 'onboarding_completed',
            eventCategory: 'completion',
            status: 'completed',
            metadata
        });
    }

    // ========== Eventos de Autenticación ==========

    async logUserSignup(userId, email, metadata = {}) {
        return this.logEvent({
            userId,
            eventType: 'user_signup',
            eventCategory: 'authentication',
            status: 'created',
            metadata: { email, ...metadata }
        });
    }

    async logEmailConfirmed(userId, email) {
        return this.logEvent({
            userId,
            eventType: 'email_confirmed',
            eventCategory: 'authentication',
            status: 'confirmed',
            metadata: { email }
        });
    }

    async logUserLogin(userId, email, metadata = {}) {
        return this.logEvent({
            userId,
            eventType: 'user_login',
            eventCategory: 'authentication',
            status: 'authenticated',
            metadata: { email, ...metadata }
        });
    }

    async logUserLogout(userId) {
        return this.logEvent({
            userId,
            eventType: 'user_logout',
            eventCategory: 'authentication',
            status: 'logged_out'
        });
    }

    // ========== Eventos de Profile ==========

    async logProfileCreated(userId, profileData) {
        return this.logEvent({
            userId,
            eventType: 'profile_created',
            eventCategory: 'profile',
            status: 'created',
            metadata: {
                owner_name: profileData.owner_name,
                user_type: profileData.user_type
            }
        });
    }

    async logProfileUpdated(userId, updatedFields) {
        return this.logEvent({
            userId,
            eventType: 'profile_updated',
            eventCategory: 'profile',
            status: 'updated',
            metadata: {
                fields_updated: Object.keys(updatedFields),
                values: updatedFields
            }
        });
    }

    // ========== Eventos de Upload ==========

    async logBatchCreated(userId, batchId, propertyType) {
        return this.logEvent({
            userId,
            batchId,
            eventType: 'batch_created',
            eventCategory: 'upload',
            status: 'created',
            metadata: { property_type: propertyType }
        });
    }

    async logDocumentUploaded(userId, batchId, uploadId, documentType, fileInfo) {
        return this.logEvent({
            userId,
            batchId,
            uploadId,
            eventType: 'document_uploaded',
            eventCategory: 'upload',
            documentType,
            status: 'uploaded',
            metadata: fileInfo
        });
    }

    async logStorageUploadSuccess(userId, batchId, documentType, storagePath) {
        return this.logEvent({
            userId,
            batchId,
            eventType: 'storage_upload_success',
            eventCategory: 'upload',
            documentType,
            status: 'stored',
            metadata: { storage_path: storagePath }
        });
    }

    // ========== Eventos de Procesamiento ==========

    async logDocumentProcessingStarted(userId, batchId, uploadId, documentType) {
        return this.logEvent({
            userId,
            batchId,
            uploadId,
            eventType: 'document_processing_started',
            eventCategory: 'processing',
            documentType,
            status: 'processing'
        });
    }

    async logDocumentProcessed(userId, batchId, uploadId, documentType, extractedData) {
        return this.logEvent({
            userId,
            batchId,
            uploadId,
            eventType: 'document_processed',
            eventCategory: 'processing',
            documentType,
            status: 'processed',
            metadata: { extracted_fields: Object.keys(extractedData || {}).length }
        });
    }

    async logDocumentProcessingFailed(userId, batchId, uploadId, documentType, error) {
        return this.logEvent({
            userId,
            batchId,
            uploadId,
            eventType: 'document_processing_failed',
            eventCategory: 'error',
            documentType,
            status: 'failed',
            errorMessage: error.message,
            errorCode: error.code,
            metadata: { error_stack: error.stack }
        });
    }

    // ========== Eventos de Error ==========

    async logError(userId, errorType, errorMessage, metadata = {}) {
        return this.logEvent({
            userId,
            eventType: errorType,
            eventCategory: 'error',
            status: 'error',
            errorMessage,
            metadata
        });
    }

    async logUploadError(userId, batchId, documentType, error) {
        return this.logEvent({
            userId,
            batchId,
            eventType: 'upload_error',
            eventCategory: 'error',
            documentType,
            status: 'failed',
            errorMessage: error.message,
            errorCode: error.code
        });
    }

    // ========== Consultas de Analytics ==========

    /**
     * Obtiene el historial de eventos de un usuario
     */
    async getUserEventHistory(userId, limit = 100) {
        const { data, error } = await this.supabase
            .from('onboarding_event_log')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        return { data, error };
    }

    /**
     * Obtiene estadísticas de un batch específico
     */
    async getBatchStatistics(batchId) {
        const { data, error } = await this.supabase
            .from('onboarding_event_log')
            .select('event_type, status, created_at')
            .eq('batch_id', batchId)
            .order('created_at', { ascending: true });

        if (error) return { error };

        const stats = {
            total_events: data.length,
            uploads: data.filter(e => e.event_type.includes('upload')).length,
            processed: data.filter(e => e.status === 'processed').length,
            errors: data.filter(e => e.event_category === 'error').length,
            timeline: data.map(e => ({ event: e.event_type, time: e.created_at }))
        };

        return { data: stats };
    }
}

module.exports = OnboardingEventLogger;
