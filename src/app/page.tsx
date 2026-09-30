import { createClient } from "@/lib/supabase/server";
import { logout } from "./login/actions";

const cards = [
  { label: "Saldo planejado", value: "R$ 0,00", note: "Aguardando MVP 1", tone: "purple" },
  { label: "Receitas", value: "R$ 0,00", note: "Nenhum lançamento", tone: "green" },
  { label: "Despesas", value: "R$ 0,00", note: "Nenhum lançamento", tone: "red" },
  { label: "Patrimônio líquido", value: "R$ 0,00", note: "Será ativado no MVP 6", tone: "blue" },
];

export default async function Dashboard() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims?.email === "string" ? data.claims.email : "usuário";

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark small">d</div>
        <nav aria-label="Navegação principal">
          <a className="nav-item active" href="#" aria-label="Início">⌂</a>
          <span className="nav-item disabled" aria-label="Planejamento">◫</span>
          <span className="nav-item disabled" aria-label="Metas">◎</span>
          <span className="nav-item disabled" aria-label="Configurações">⚙</span>
        </nav>
        <form action={logout}><button className="nav-item logout" title="Sair">↪</button></form>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">DESCONTROLLLE · MVP 0</span>
            <h1>Visão geral</h1>
          </div>
          <div className="profile-chip"><span className="status-dot" />{email}</div>
        </header>

        <section className="hero-card">
          <div>
            <span className="eyebrow">FUNDAÇÃO CONCLUÍDA</span>
            <h2>Seu planejamento começa antes do primeiro lançamento.</h2>
            <p>A base já está preparada para evoluir de controle financeiro para planejamento orientado a objetivos.</p>
          </div>
          <div className="hero-status">
            <span>Supabase Auth</span><strong>ativo</strong>
            <span>Dashboard</span><strong>ativo</strong>
            <span>Dados financeiros</span><strong>próximo MVP</strong>
          </div>
        </section>

        <section className="metric-grid">
          {cards.map((card) => (
            <article className={`metric-card ${card.tone}`} key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.note}</small>
            </article>
          ))}
        </section>

        <section className="dashboard-grid">
          <article className="panel chart-panel">
            <div className="panel-title"><div><span className="eyebrow">PLANEJADO × REALIZADO</span><h3>Fluxo financeiro</h3></div><span className="pill">12 meses</span></div>
            <div className="empty-chart" aria-label="Gráfico vazio do MVP 0">
              <div className="grid-lines" />
              <div className="chart-message"><strong>Sem dados ainda</strong><span>O gráfico será alimentado no MVP 1.</span></div>
            </div>
          </article>

          <article className="panel roadmap-panel">
            <span className="eyebrow">PRÓXIMO PASSO</span>
            <h3>MVP 1 · Diagnóstico Financeiro</h3>
            <p>Contas, receitas, despesas, categorias e saldo mensal.</p>
            <div className="progress"><span style={{ width: "10%" }} /></div>
            <small>Fundação pronta para receber o modelo financeiro.</small>
          </article>
        </section>
      </section>
    </main>
  );
}
