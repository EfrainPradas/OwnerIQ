// Centralized frontend configuration
// Values come from environment variables to ease deployment across environments

// Detect if we're in production (on the server) or development (localhost)
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// In production, use relative URLs that nginx will proxy
// In development, use localhost:5001
export const API_BASE_URL = isProduction
    ? `${window.location.origin}/ownerIQ-api`
    : 'http://localhost:5001';

export const ENABLE_DEMO_MODE = (process.env.REACT_APP_ENABLE_DEMO_MODE || 'false').toLowerCase() === 'true';

console.log('🔧 Config loaded:', { API_BASE_URL, isProduction, hostname: window.location.hostname });
