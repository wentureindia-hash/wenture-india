import { createClient, SupabaseClient } from "@supabase/supabase-js";

let serverClientInstance: SupabaseClient | null = null;

/**
 * Returns a privileged Supabase client initialized with the Service Role Key.
 * STRICT SECURITY REQUIREMENT:
 * This client MUST ONLY be called within Next.js Server Components, Server Actions,
 * or API Route Handlers. It must NEVER be imported or bundled into client code.
 */
export function getSupabaseServerClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error(
      "[Security Violation] Attempted to instantiate Supabase Server Client on the browser. " +
      "The SUPABASE_SERVICE_ROLE_KEY must remain exclusively server-side."
    );
  }

  if (serverClientInstance) {
    return serverClientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      "[Supabase Server Warning] SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is missing. " +
      "Storage API routes will return an authentication configuration error until configured."
    );
  }

  serverClientInstance = createClient(
    supabaseUrl || "https://placeholder.supabase.co",
    serviceRoleKey || "placeholder-service-key",
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

  return serverClientInstance;
}

