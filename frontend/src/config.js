// Centralized frontend configuration
// Values come from environment variables to ease deployment across environments

const rawApiUrl = (process.env.REACT_APP_API_BASE_URL || '').trim();
export const API_BASE_URL = rawApiUrl ? rawApiUrl.replace(/\/$/, '') : '';

export const ENABLE_DEMO_MODE = (process.env.REACT_APP_ENABLE_DEMO_MODE || 'false').toLowerCase() === 'true';
