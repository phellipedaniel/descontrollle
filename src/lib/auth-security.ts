/** Only relative paths within this application can be used after authentication. */
export function safeAuthRedirect(value: string | null, requestUrl: string): URL {
  const fallback = new URL("/", requestUrl);
  if (!value) return fallback;
  let decoded = value;
  try {
    for (let pass = 0; pass < 4; pass++) {
      if (!decoded.startsWith("/") || decoded.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(decoded)) return fallback;
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    if (/%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(decoded)) return fallback;
    if (!decoded.startsWith("/") || decoded.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(decoded)) return fallback;
    const destination = new URL(value, fallback);
    return destination.origin === fallback.origin ? destination : fallback;
  } catch {
    return fallback;
  }
}

const loginErrors: Record<string, string> = {
  credenciais: "E-mail ou senha inválidos.",
  confirmacao: "Não foi possível confirmar o e-mail. Solicite um novo link.",
  cadastro_desativado: "O acesso é pessoal. Novos cadastros estão desativados nesta aplicação.",
  indisponivel: "Não foi possível entrar agora. Tente novamente.",
};

export function loginErrorMessage(code?: string): string | null {
  return code ? (Object.hasOwn(loginErrors, code) ? loginErrors[code] : "Não foi possível concluir a solicitação.") : null;
}

export function authCookieOptions(production: boolean) {
  return { path: "/", sameSite: "lax" as const, secure: production };
}

export function isPublicPath(path: string): boolean {
  return path === "/login" || path === "/privacy" || path === "/auth/callback";
}
