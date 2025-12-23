-- Tabla para eventos del proceso de admin (extracción de datos)
CREATE TABLE IF NOT EXISTS admin_process_events (
    event_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id UUID REFERENCES import_batches(batch_id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'info' CHECK (status IN ('info', 'success', 'warning', 'error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_admin_events_batch ON admin_process_events(batch_id);
CREATE INDEX IF NOT EXISTS idx_admin_events_user ON admin_process_events(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_events_created ON admin_process_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_events_type ON admin_process_events(event_type);

-- Deshabilitar RLS para permitir escritura desde backend
ALTER TABLE admin_process_events DISABLE ROW LEVEL SECURITY;

-- Comentarios
COMMENT ON TABLE admin_process_events IS 'Registro de eventos del proceso de extracción y procesamiento de documentos';
COMMENT ON COLUMN admin_process_events.event_type IS 'Tipo de evento: BATCH_PROCESSING_STARTED, DOCUMENT_PROCESSED, DATA_CONSOLIDATED, etc.';
COMMENT ON COLUMN admin_process_events.status IS 'Estado del evento: info, success, warning, error';
