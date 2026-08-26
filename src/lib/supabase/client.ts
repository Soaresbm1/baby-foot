import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnvironment } from "./config";

export function createClient() {
  const environment = getPublicEnvironment();

  return createBrowserClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

