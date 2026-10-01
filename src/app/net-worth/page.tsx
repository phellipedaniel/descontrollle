import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import { accountTypeLabel, formatBRL, formatDate, todayInBrazil } from "@/lib/finance";
import {
  assetTypeLabel,
  calculateAccountBalances,
  netWorthMetrics,
  type Asset,
  type AssetValuation,
  type BalanceTransaction,
  type NetWorthAccount,
  type NetWorthDebt,
  type NetWorthSnapshot,
} from "@/lib/net-worth";
import {
  addAssetValuation,
  changeAssetStatus,
  createAsset,
  saveNetWorthScope,
  saveNetWorthSnapshot,
  updateAsset,
} from "./actions";

export default async function NetWorthPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; view?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) redirect("/login");

  const [
    { data: accountsData, error: accountsError },
    { data: transactionsData, error: transactionsError },
    { data: assetsData, error: assetsError },
    { data: valuationsData, error: valuationsError },
    { data: debtsData, error: debtsError },
    { data: snapshotsData, error: snapshotsError },
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("id,name,account_type,initial_balance,include_in_net_worth")
      .order("created_at"),
    supabase
      .from("transactions")
      .select("account_id,kind,amount"),
    supabase
      .from("assets")
      .select("id,name,asset_type,current_value,valuation_date,notes,status,created_at")
      .order("status")
      .order("created_at"),
    supabase
      .from("asset_valuations")
      .select("id,asset_id,value,valued_on,note,created_at")
      .order("valued_on",{ascending:false})
      .order("created_at",{ascending:false})
      .limit(80),
    supabase
      .from("debts")
      .select("id,name,current_balance,status,include_in_net_worth")
      .order("status")
      .order("created_at"),
    supabase
      .from("net_worth_snapshots")
      .select("id,captured_on,accounts_value,manual_assets_value,liabilities_value,net_worth,notes")
      .order("captured_on",{ascending:false})
      .limit(12),
  ]);

  if (accountsError || transactionsError || assetsError || valuationsError || debtsError || snapshotsError) {
    throw new Error("Não foi possível carregar o patrimônio líquido.");
  }

  const accounts = (accountsData ?? []) as NetWorthAccount[];
  const transactions = (transactionsData ?? []) as BalanceTransaction[];
  const assets = (assetsData ?? []) as Asset[];
  const valuations = (valuationsData ?? []) as AssetValuation[];
  const debts = (debtsData ?? []) as NetWorthDebt[];
  const snapshots = (snapshotsData ?? []) as NetWorthSnapshot[];

  const balances = calculateAccountBalances(accounts,transactions);
  const accountRows = accounts.map((account) => ({
    ...account,
    balance: balances.get(account.id) ?? Number(account.initial_balance),
  }));

  const metrics = netWorthMetrics(accountRows,assets,debts);
  const showArchived = params.view === "archived";
  const visibleAssets = assets.filter((asset) => asset.status === (showArchived ? "archived" : "active"));
  const valuationsByAsset = new Map<string,AssetValuation[]>();
  for (const valuation of valuations) {
    const list = valuationsByAsset.get(valuation.asset_id) ?? [];
    if (list.length < 4) list.push(valuation);
    valuationsByAsset.set(valuation.asset_id,list);
  }

  const latestSnapshot = snapshots[0];
  const previousSnapshot = snapshots[1];
  const snapshotDelta =
    latestSnapshot && previousSnapshot
      ? Number(latestSnapshot.net_worth) - Number(previousSnapshot.net_worth)
      : null;

  const scopeDebtRows = debts.filter((debt) => debt.status !== "paid" || Number(debt.current_balance) > 0);

  return (
    <AppShell active="net-worth">
        <PageHeader title="Patrimônio líquido" actions={<div className="profile-chip"><span className="status-dot" />{auth.user.email}</div>} />

        <section className="hero-card">
          <div>
            <span className="eyebrow">BALANÇO PESSOAL</span>
            <h2>Patrimônio é o que sobra depois de colocar ativos e dívidas na mesma fotografia.</h2>
            <p>Contas reais e ativos manuais formam o lado dos ativos. Dívidas incluídas formam os passivos. Metas, reserva de emergência e provisões não são somadas de novo para evitar dupla contagem.</p>
            <div className="hero-actions">
              <form action={saveNetWorthSnapshot} className="snapshot-inline-form">
                <input name="note" maxLength={160} placeholder="Observação do snapshot (opcional)" />
                <SubmitButton>Salvar fotografia de hoje</SubmitButton>
              </form>
            </div>
          </div>
          <div className="hero-status">
            <span>Contas incluídas</span><strong>{accountRows.filter((item) => item.include_in_net_worth).length}</strong>
            <span>Ativos manuais</span><strong>{assets.filter((item) => item.status === "active").length}</strong>
            <span>Dívidas incluídas</span><strong>{scopeDebtRows.filter((item) => item.include_in_net_worth).length}</strong>
            <span>Snapshots</span><strong>{snapshots.length}</strong>
          </div>
        </section>

        {params.error && <div className="alert error" role="alert">{params.error}</div>}
        {params.message && <div className="alert success">{params.message}</div>}

        <section className="metric-grid">
          <article className="metric-card purple">
            <span>Patrimônio líquido</span>
            <strong>{formatBRL(metrics.netWorth)}</strong>
            <small>ativos − passivos</small>
          </article>
          <article className="metric-card blue">
            <span>Contas incluídas</span>
            <strong>{formatBRL(metrics.accountsValue)}</strong>
            <small>saldo calculado das contas selecionadas</small>
          </article>
          <article className="metric-card green">
            <span>Ativos manuais</span>
            <strong>{formatBRL(metrics.manualAssetsValue)}</strong>
            <small>imóveis, veículos, investimentos e outros</small>
          </article>
          <article className="metric-card red">
            <span>Dívidas incluídas</span>
            <strong>{formatBRL(metrics.liabilitiesValue)}</strong>
            <small>{metrics.debtToAssets === null ? "sem base positiva de ativos" : (metrics.debtToAssets * 100).toFixed(1) + "% dos ativos"}</small>
          </article>
        </section>

        <section className="net-worth-grid">
          <article className="panel finance-panel">
            <div className="panel-title">
              <div><span className="eyebrow">ESCOPO</span><h3>O que entra no patrimônio?</h3></div>
              <span className="pill">controle explícito</span>
            </div>
            <p className="net-worth-help">Contas sintéticas de importação ficam fora por padrão. Dívidas arquivadas continuam disponíveis para inclusão porque arquivar não significa quitar.</p>
            <form className="scope-form" action={saveNetWorthScope}>
              <div>
                <span className="eyebrow">CONTAS</span>
                <div className="scope-list">
                  {accountRows.length === 0 && <div className="empty-state">Nenhuma conta cadastrada.</div>}
                  {accountRows.map((account) => (
                    <label className="scope-option" key={account.id}>
                      <input type="checkbox" name="account_ids" value={account.id} defaultChecked={account.include_in_net_worth} />
                      <span><strong>{account.name}</strong><small>{accountTypeLabel(account.account_type)} · {formatBRL(account.balance)}</small></span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <span className="eyebrow">DÍVIDAS / PASSIVOS</span>
                <div className="scope-list">
                  {scopeDebtRows.length === 0 && <div className="empty-state">Nenhuma dívida cadastrada.</div>}
                  {scopeDebtRows.map((debt) => (
                    <label className="scope-option" key={debt.id}>
                      <input type="checkbox" name="debt_ids" value={debt.id} defaultChecked={debt.include_in_net_worth} />
                      <span><strong>{debt.name}</strong><small>{debt.status === "archived" ? "arquivada · " : ""}{formatBRL(debt.current_balance)}</small></span>
                    </label>
                  ))}
                </div>
              </div>
              <SubmitButton className="button secondary">Salvar escopo</SubmitButton>
            </form>
          </article>

          <article className="panel finance-panel">
            <div className="panel-title">
              <div><span className="eyebrow">COMPOSIÇÃO</span><h3>Fotografia atual</h3></div>
              <span className="pill">{todayInBrazil()}</span>
            </div>
            <div className="balance-sheet">
              <div className="balance-sheet-row positive"><span>Contas incluídas</span><strong>{formatBRL(metrics.accountsValue)}</strong></div>
              <div className="balance-sheet-row positive"><span>Ativos manuais</span><strong>{formatBRL(metrics.manualAssetsValue)}</strong></div>
              <div className="balance-sheet-row negative"><span>Dívidas incluídas</span><strong>− {formatBRL(metrics.liabilitiesValue)}</strong></div>
              <div className="balance-sheet-total"><span>Patrimônio líquido</span><strong>{formatBRL(metrics.netWorth)}</strong></div>
            </div>
          </article>
        </section>

        <section className="goals-section">
          <div className="section-heading-row">
            <div><span className="eyebrow">ATIVOS MANUAIS</span><h2>Bens e valores fora das contas</h2></div>
            <div className="view-switch">
              <a className={!showArchived ? "active" : ""} href="/net-worth">Ativos</a>
              <a className={showArchived ? "active" : ""} href="/net-worth?view=archived">Arquivados</a>
            </div>
          </div>

          {!showArchived && (
            <article className="panel finance-panel asset-create-panel">
              <div className="panel-title"><div><span className="eyebrow">NOVO ATIVO</span><h3>Registrar avaliação inicial</h3></div></div>
              <form className="finance-form" action={createAsset}>
                <div className="form-row">
                  <label className="field"><span>Nome</span><input name="name" required minLength={2} maxLength={80} placeholder="Ex.: Apartamento, carro, previdência" /></label>
                  <label className="field">
                    <span>Tipo</span>
                    <select name="asset_type" defaultValue="investment">
                      <option value="investment">Investimento</option>
                      <option value="real_estate">Imóvel</option>
                      <option value="vehicle">Veículo</option>
                      <option value="retirement">Previdência</option>
                      <option value="business">Participação em negócio</option>
                      <option value="valuable">Bem de valor</option>
                      <option value="receivable">Valor a receber</option>
                      <option value="other">Outro ativo</option>
                    </select>
                  </label>
                </div>
                <div className="form-row">
                  <label className="field"><span>Valor atual</span><input name="current_value" type="number" min="0" max="9999999999.99" step="0.01" required placeholder="0,00" /></label>
                  <label className="field"><span>Data da avaliação</span><input name="valuation_date" type="date" max={todayInBrazil()} defaultValue={todayInBrazil()} required /></label>
                </div>
                <label className="field"><span>Observações</span><textarea name="notes" maxLength={300} placeholder="Ex.: valor aproximado de mercado." /></label>
                <SubmitButton>Cadastrar ativo</SubmitButton>
              </form>
            </article>
          )}

          <div className="asset-grid">
            {visibleAssets.length === 0 && <div className="panel empty-state">Nenhum ativo {showArchived ? "arquivado" : "ativo"}.</div>}
            {visibleAssets.map((asset) => {
              const history = valuationsByAsset.get(asset.id) ?? [];
              return (
                <article className="panel asset-card" key={asset.id}>
                  <div className="panel-title">
                    <div><span className="eyebrow">{assetTypeLabel(asset.asset_type)}</span><h3>{asset.name}</h3></div>
                    <span className="pill">{asset.status === "active" ? "ativo" : "arquivado"}</span>
                  </div>
                  <div className="asset-value"><strong>{formatBRL(asset.current_value)}</strong><span>avaliado em {formatDate(asset.valuation_date)}</span></div>
                  {asset.notes && <p className="goal-note">{asset.notes}</p>}

                  {asset.status === "active" && (
                    <details className="goal-details">
                      <summary>Nova avaliação</summary>
                      <form className="finance-form" action={addAssetValuation}>
                        <input type="hidden" name="asset_id" value={asset.id} />
                        <div className="form-row">
                          <label className="field"><span>Novo valor</span><input name="value" type="number" min="0" max="9999999999.99" step="0.01" required /></label>
                          <label className="field"><span>Data</span><input name="valued_on" type="date" max={todayInBrazil()} defaultValue={todayInBrazil()} required /></label>
                        </div>
                        <label className="field"><span>Observação</span><input name="note" maxLength={160} placeholder="Ex.: atualização pelo valor de mercado" /></label>
                        <SubmitButton>Registrar avaliação</SubmitButton>
                      </form>
                    </details>
                  )}

                  <details className="goal-details">
                    <summary>Editar cadastro</summary>
                    <form className="finance-form" action={updateAsset}>
                      <input type="hidden" name="id" value={asset.id} />
                      <label className="field"><span>Nome</span><input name="name" defaultValue={asset.name} required minLength={2} maxLength={80} /></label>
                      <label className="field">
                        <span>Tipo</span>
                        <select name="asset_type" defaultValue={asset.asset_type}>
                          <option value="investment">Investimento</option><option value="real_estate">Imóvel</option><option value="vehicle">Veículo</option><option value="retirement">Previdência</option><option value="business">Participação em negócio</option><option value="valuable">Bem de valor</option><option value="receivable">Valor a receber</option><option value="other">Outro ativo</option>
                        </select>
                      </label>
                      <label className="field"><span>Observações</span><textarea name="notes" maxLength={300} defaultValue={asset.notes ?? ""} /></label>
                      <SubmitButton className="button secondary">Salvar cadastro</SubmitButton>
                    </form>
                  </details>

                  <div className="valuation-history">
                    <span className="eyebrow">ÚLTIMAS AVALIAÇÕES</span>
                    {history.map((valuation) => (
                      <div className="valuation-row" key={valuation.id}>
                        <span>{formatDate(valuation.valued_on)}{valuation.note ? " · " + valuation.note : ""}</span>
                        <strong>{formatBRL(valuation.value)}</strong>
                      </div>
                    ))}
                  </div>

                  <form className="goal-status-form" action={changeAssetStatus}>
                    <input type="hidden" name="id" value={asset.id} />
                    <input type="hidden" name="status" value={asset.status === "active" ? "archived" : "active"} />
                    <SubmitButton className="button secondary">{asset.status === "active" ? "Arquivar ativo" : "Reativar ativo"}</SubmitButton>
                  </form>
                </article>
              );
            })}
          </div>
        </section>

        <section className="goals-section">
          <div className="section-heading-row">
            <div><span className="eyebrow">HISTÓRICO PATRIMONIAL</span><h2>Fotografias salvas</h2></div>
            {latestSnapshot && <span className="pill">{snapshotDelta === null ? "primeiro snapshot" : (snapshotDelta >= 0 ? "+" : "−") + formatBRL(Math.abs(snapshotDelta)) + " vs anterior"}</span>}
          </div>
          <article className="panel">
            <div className="snapshot-list">
              {snapshots.length === 0 && <div className="empty-state">Salve a primeira fotografia patrimonial para começar a acompanhar a evolução.</div>}
              {snapshots.map((snapshot,index) => {
                const older = snapshots[index + 1];
                const delta = older ? Number(snapshot.net_worth) - Number(older.net_worth) : null;
                return (
                  <div className="snapshot-row" key={snapshot.id}>
                    <div><strong>{formatDate(snapshot.captured_on)}</strong><span>{snapshot.notes || "Sem observação"}</span></div>
                    <div className="snapshot-components">
                      <span>contas {formatBRL(snapshot.accounts_value)}</span>
                      <span>ativos {formatBRL(snapshot.manual_assets_value)}</span>
                      <span>dívidas {formatBRL(snapshot.liabilities_value)}</span>
                    </div>
                    <div className="snapshot-total">
                      <strong>{formatBRL(snapshot.net_worth)}</strong>
                      {delta !== null && <span className={delta >= 0 ? "text-positive" : "text-danger"}>{delta >= 0 ? "+" : "−"}{formatBRL(Math.abs(delta))}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </section>
      </AppShell>
  );
}
