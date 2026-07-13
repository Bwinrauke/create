import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If env isn't set yet, the app renders a setup screen instead of crashing.
export const configured = Boolean(url && key);
export const supabase = configured ? createClient(url, key) : null;
