-- Event Log para el proceso de Onboarding
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS onboarding_event_log (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificadores
  user_id UUID NOT NULL,
  batch_id UUID,
  upload_id UUID,
  
  -- Información del evento
  event_type VARCHAR(50) NOT NULL, 
  -- Tipos: 'onboarding_started', 'step_completed', 'batch_created', 
  --        'document_uploaded', 'document_processed', 'document_failed',
  --        'onboarding_completed', 'error'
  
  event_category VARCHAR(30) NOT NULL,
  -- Categorías: 'navigation', 'upload', 'processing', 'error', 'completion'
  
  -- Detalles del evento
  step_number INT,
  document_type VARCHAR(50),
  status VARCHAR(30),
  
  -- Metadata adicional (JSON para flexibilidad)
  metadata JSONB,
  
  -- Información de error (si aplica)
  error_message TEXT,
  error_code VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Índices para búsquedas rápidas
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Índices para mejorar performance de consultas
CREATE INDEX idx_event_log_user ON onboarding_event_log(user_id);
CREATE INDEX idx_event_log_batch ON onboarding_event_log(batch_id);
CREATE INDEX idx_event_log_type ON onboarding_event_log(event_type);
CREATE INDEX idx_event_log_category ON onboarding_event_log(event_category);
CREATE INDEX idx_event_log_created ON onboarding_event_log(created_at DESC);

-- RLS Policies para seguridad
ALTER TABLE onboarding_event_log ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver sus propios logs
CREATE POLICY "Users can view their own event logs"
  ON onboarding_event_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- El sistema (service role) puede insertar cualquier log
CREATE POLICY "Service role can insert event logs"
  ON onboarding_event_log
  FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE onboarding_event_log IS 'Event log for tracking onboarding workflow progress and issues';
