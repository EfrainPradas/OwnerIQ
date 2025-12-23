// Centralized frontend configuration
// Values come from environment variables to ease deployment across environments

export const API_BASE_URL = 'http://localhost:5001';

export const ENABLE_DEMO_MODE = (process.env.REACT_APP_ENABLE_DEMO_MODE || 'false').toLowerCase() === 'true';
