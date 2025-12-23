-- Crear tabla onboarding_events para logging del proceso de onboarding
CREATE TABLE IF NOT EXISTS onboarding_events (
    event_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50),
    step_number INTEGER,
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'error', 'warning')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_onboarding_events_user ON onboarding_events(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_events_created ON onboarding_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_onboarding_events_type ON onboarding_events(event_type);

-- Deshabilitar RLS para permitir escritura desde backend
ALTER TABLE onboarding_events DISABLE ROW LEVEL SECURITY;

-- Comentarios
COMMENT ON TABLE onboarding_events IS 'Registro de eventos del proceso de onboarding de usuarios';
COMMENT ON COLUMN onboarding_events.event_type IS 'Tipo de evento: profile_created, step_started, document_uploaded, etc.';
COMMENT ON COLUMN onboarding_events.status IS 'Estado del evento: in_progress, completed, error, warning';
