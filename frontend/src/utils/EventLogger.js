import { supabase } from './supabaseClient';
import { API_BASE_URL } from '../config';

/**
 * Helper para registrar eventos desde el frontend
 */
class EventLogger {
    /**
     * Registra un evento de navegación en el onboarding
     */
    static async logStepCompleted(stepNumber, data = {}) {
        try {
            const session = await supabase.auth.getSession();
            if (!session?.data?.session) return;

            const token = session.data.session.access_token;

            await fetch(`${API_BASE_URL}/api/events/log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    eventType: 'step_completed',
                    eventCategory: 'navigation',
                    stepNumber,
                    status: 'completed',
                    metadata: data
                })
            });
        } catch (error) {
            console.warn('Failed to log event:', error);
        }
    }

    /**
     * Registra cuando el usuario comienza el onboarding
     */
    static async logOnboardingStarted() {
        try {
            const session = await supabase.auth.getSession();
            if (!session?.data?.session) return;

            const token = session.data.session.access_token;

            await fetch(`${API_BASE_URL}/api/events/log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    eventType: 'onboarding_started',
                    eventCategory: 'navigation',
                    stepNumber: 1,
                    status: 'started',
                    metadata: {}
                })
            });
        } catch (error) {
            console.warn('Failed to log event:', error);
        }
    }

    /**
     * Registra cuando se completa el onboarding
     */
    static async logOnboardingCompleted() {
        try {
            const session = await supabase.auth.getSession();
            if (!session?.data?.session) return;

            const token = session.data.session.access_token;

            await fetch(`${API_BASE_URL}/api/events/log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    eventType: 'onboarding_completed',
                    eventCategory: 'completion',
                    status: 'completed',
                    metadata: {}
                })
            });
        } catch (error) {
            console.warn('Failed to log event:', error);
        }
    }

    /**
     * Registra un login exitoso
     */
    static async logLogin(email) {
        try {
            const session = await supabase.auth.getSession();
            if (!session?.data?.session) return;

            const token = session.data.session.access_token;

            await fetch(`${API_BASE_URL}/api/events/log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    eventType: 'user_login',
                    eventCategory: 'authentication',
                    status: 'authenticated',
                    metadata: { email, login_time: new Date().toISOString() }
                })
            });
        } catch (error) {
            console.warn('Failed to log event:', error);
        }
    }

    /**
     * Registra un logout
     */
    static async logLogout() {
        try {
            const session = await supabase.auth.getSession();
            if (!session?.data?.session) return;

            const token = session.data.session.access_token;

            await fetch(`${API_BASE_URL}/api/events/log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    eventType: 'user_logout',
                    eventCategory: 'authentication',
                    status: 'logged_out',
                    metadata: {}
                })
            });
        } catch (error) {
            console.warn('Failed to log event:', error);
        }
    }

    /**
     * Registra cuando se crea una cuenta
     * NOTA: Esto se registra automáticamente en el backend cuando se crea el profile
     */
    static async logSignup(email) {
        try {
            const session = await supabase.auth.getSession();
            if (!session?.data?.session) return;

            const token = session.data.session.access_token;

            await fetch(`${API_BASE_URL}/api/events/log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    eventType: 'user_signup',
                    eventCategory: 'authentication',
                    status: 'created',
                    metadata: { email, signup_time: new Date().toISOString() }
                })
            });
        } catch (error) {
            console.warn('Failed to log event:', error);
        }
    }
}

export default EventLogger;
