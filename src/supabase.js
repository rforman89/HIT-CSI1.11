import { createClient } from "@supabase/supabase-js";
import { validateBackend } from "./utils/reliability";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const backend = validateBackend({ url: supabaseUrl, key: supabaseAnonKey,
  environment: process.env.REACT_APP_ENVIRONMENT,
  expectedProject: process.env.REACT_APP_TEST_PROJECT_ID });

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
