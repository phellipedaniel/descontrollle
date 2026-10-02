import { createBrowserClient } from "@supabase/ssr";
import { authCookieOptions } from "@/lib/auth-security";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookieOptions: authCookieOptions(process.env.NODE_ENV === "production") }
  );
}
