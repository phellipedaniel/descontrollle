"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="ds-error-shell">
      <section className="workspace">
        <article className="panel finance-panel" role="alert">
          <h1>Não foi possível carregar seus dados</h1>
          <p>Tente novamente. Se sua sessão tiver expirado, entre na sua conta.</p>
          <div className="hero-actions">
            <button className="button primary" onClick={reset}>Tentar novamente</button>
            <Link className="button secondary" href="/login">Entrar na minha conta</Link>
          </div>
        </article>
      </section>
    </main>
  );
}
