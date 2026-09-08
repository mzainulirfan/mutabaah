import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Fallback to mock mode if env missing — UI still works offline/demo
  if (!url || !key) {
    return null;
  }
  return createBrowserClient(url, key);
}
