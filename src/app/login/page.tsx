import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

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

        {params.error && <div className="alert error">{params.error === "confirmacao" ? "Não foi possível confirmar o e-mail." : params.error}</div>}
        {params.message && <div className="alert success">{params.message}</div>}

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
            <button className="button secondary" formAction={signup}>Criar conta</button>
          </div>
        </form>
      </section>
    </main>
  );
}
