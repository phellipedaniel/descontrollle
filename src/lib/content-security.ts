export function contentSecurityPolicy(nonce: string, supabaseUrl: string, development: boolean) {
  if (!/^[A-Za-z0-9+/=]+$/.test(nonce)) throw new Error("Invalid nonce");
  const origin = new URL(supabaseUrl);
  if (origin.protocol !== "https:" && !(development && origin.hostname === "localhost")) throw new Error("Invalid Supabase origin");
  const socketOrigin = origin.origin.replace(/^http/, "ws");
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${origin.origin} ${socketOrigin}${development ? " ws://localhost:* ws://127.0.0.1:*" : ""}`,
    "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
  ].join("; ");
}
