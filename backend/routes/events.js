const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const OnboardingEventLogger = require('../utils/OnboardingEventLogger');

// POST /api/events/log - Log frontend events
router.post('/log', authenticateToken, async (req, res) => {
    try {
        const { createClient } = require('@supabase/supabase-js');
        const scopedSupabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            {
                global: {
                    headers: {
                        Authorization: req.headers['authorization']
                    }
                }
            }
        );

        const userId = req.user.id;
        const { eventType, eventCategory, stepNumber, status, metadata } = req.body;

        const eventLogger = new OnboardingEventLogger(scopedSupabase);

        await eventLogger.logEvent({
            userId,
            eventType,
            eventCategory,
            stepNumber,
            status,
            metadata
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error logging frontend event:', error);
        res.status(500).json({ error: 'Failed to log event' });
    }
});

// GET /api/events/:user_id - Get onboarding events for a user
router.get('/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;

        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data: events, error } = await supabase
            .from('onboarding_event_log')
            .select('*')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        res.json({
            success: true,
            user_id,
            events: events || []
        });

    } catch (error) {
        console.error('Error fetching onboarding events:', error);
        res.status(500).json({
            error: 'Failed to fetch onboarding events',
            details: error.message
        });
    }
});

module.exports = router;
