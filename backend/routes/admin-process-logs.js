const express = require('express');
const router = express.Router();

// GET /api/admin/process-logs/:batch_id - Get all process events for a batch
router.get('/process-logs/:batch_id', async (req, res) => {
    try {
        const { batch_id } = req.params;

        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data: events, error } = await supabase
            .from('admin_process_events')
            .select('*')
            .eq('batch_id', batch_id)
            .order('created_at', { ascending: true });

        if (error) throw error;

        res.json({
            success: true,
            batch_id,
            events: events || []
        });

    } catch (error) {
        console.error('Error fetching process logs:', error);
        res.status(500).json({
            error: 'Failed to fetch process logs',
            details: error.message
        });
    }
});

// GET /api/admin/process-logs - Get all recent process events
router.get('/process-logs', async (req, res) => {
    try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data: events, error } = await supabase
            .from('admin_process_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        res.json({
            success: true,
            events: events || []
        });

    } catch (error) {
        console.error('Error fetching process logs:', error);
        res.status(500).json({
            error: 'Failed to fetch process logs',
            details: error.message
        });
    }
});

module.exports = router;
