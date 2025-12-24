import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://zapanqzqloibnbsvkbob.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphcGFucXpxbG9pYm5ic3ZrYm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTgzNTIsImV4cCI6MjA3NDU3NDM1Mn0.mwspXsW5xDu9CmWruosq3d0w_mPX5g-zGhZkFgCxHqM';

const envUrl = (process.env.REACT_APP_SUPABASE_URL || '').trim();
const envAnonKey = (process.env.REACT_APP_SUPABASE_ANON_KEY || '').trim();

const supabaseUrl = envUrl || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = envAnonKey || DEFAULT_SUPABASE_ANON_KEY;

if ((!envUrl || !envAnonKey) && typeof window !== 'undefined' && !window.__OW_SUPABASE_WARNED) {
  window.__OW_SUPABASE_WARNED = true;
  // eslint-disable-next-line no-console
  console.warn('Missing Supabase environment variables. Falling back to default credentials embedded in the bundle. Please configure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
