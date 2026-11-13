import { createBrowserClient } from '@supabase/ssr'

const createNewBrowserClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

type SupabaseBrowserClient = ReturnType<typeof createNewBrowserClient>

let clientSingleton: SupabaseBrowserClient | undefined

/**
 * Creates or retrieves the singleton Supabase browser client.
 * In browser contexts, a single instance is reused across components and effects
 * to prevent duplicate auth subscriptions, token race conditions, and HTTP 401 errors.
 */
export function createClient(): SupabaseBrowserClient {
  if (typeof window === 'undefined') {
    return createNewBrowserClient()
  }

  if (!clientSingleton) {
    clientSingleton = createNewBrowserClient()
  }

  return clientSingleton
}

