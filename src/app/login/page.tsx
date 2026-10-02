import Link from "next/link";
import { login } from "./actions";
import { loginErrorMessage } from "@/lib/auth-security";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = loginErrorMessage(params.error);

  return (
    <main className="auth-shell">
      <section className="auth-brand ds-inverse">
        <div className="brand-mark">d</div>
        <div>
          <span className="eyebrow">PLANEJAMENTO FINANCEIRO</span>
          <h1>descontrollle</h1>
          <p>
            Menos registro por registro. Mais clareza sobre o que seu dinheiro precisa fazer.
          </p>
        </div>
        <div className="auth-proof">
          <span>Diagnosticar</span><b>→</b><span>Planejar</span><b>→</b><span>Acompanhar</span><b>→</b><span>Replanejar</span>
        </div>
      </section>

      <section className="auth-card">
        <span className="eyebrow">SEU ESPAÇO FINANCEIRO</span>
        <h2>Entre na sua conta</h2>
        <p className="muted">Acesse seus lançamentos, planos e objetivos em um só lugar.</p>

        {errorMessage && <div className="alert error" role="alert">{errorMessage}</div>}

        <form>
          <label>
            E-mail
            <input type="email" name="email" required autoComplete="email" placeholder="voce@exemplo.com" />
          </label>
          <label>
            Senha
            <input type="password" name="password" required minLength={8} autoComplete="current-password" placeholder="mínimo de 8 caracteres" />
          </label>
          <div className="auth-actions">
            <button className="button primary" formAction={login}>Entrar</button>
          </div>
        </form>
        <p className="muted">Acesso pessoal. <Link href="/privacy">Privacidade e dados</Link></p>
      </section>
    </main>
  );
}
