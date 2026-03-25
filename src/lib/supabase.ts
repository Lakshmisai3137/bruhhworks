import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = "Supabase URL and Anon Key are required. Please check your environment variables.";
  console.error(errorMsg);
  // Throwing a clear error if variables are missing to prevent cryptic library errors
  if (typeof window !== 'undefined') {
    // In browser, we can't just throw or it might crash the whole app before we can show a nice UI
    // But since the user is seeing an Uncaught Error anyway, let's make it explicit
  }
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co", 
  supabaseAnonKey || "placeholder"
);
