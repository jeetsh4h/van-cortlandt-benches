import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

function getPublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Supabase public environment variables are not configured.");
  }

  return { url, publishableKey };
}

export function createPublicSupabaseClient() {
  const { url, publishableKey } = getPublicConfig();

  return createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function getBrowserSupabaseClient() {
  if (!browserClient) {
    browserClient = createPublicSupabaseClient();
  }

  return browserClient;
}
