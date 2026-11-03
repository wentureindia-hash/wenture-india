import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let supabaseClientInstance: SupabaseClient | null = null;

/**
 * Returns a browser-safe Supabase client initialized with the anonymous public key.
 * Never uses or leaks the service role key.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[Supabase Client Warning] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. " +
      "File operations will fall back to server-side authenticated proxy endpoints."
    );
  }

  // Provide fallback mock or minimal client if credentials aren't set during build
  supabaseClientInstance = createClient(
    supabaseUrl || "https://placeholder.supabase.co",
    supabaseAnonKey || "placeholder-key",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        transport: typeof WebSocket !== "undefined" ? WebSocket : (class {} as unknown as typeof WebSocket),
      },
    }
  );

  return supabaseClientInstance;
}

export const supabase = getSupabaseBrowserClient();

