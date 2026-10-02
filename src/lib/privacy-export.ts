export const exportSources = [
  ["accounts", ["id"]], ["annual_provisions", ["id"]], ["asset_valuations", ["id"]],
  ["assets", ["id"]], ["behavior_checkins", ["id"]], ["behavior_profiles", ["user_id"]],
  ["categories", ["id"]], ["category_budgets", ["id"]], ["debt_payments", ["id"]],
  ["debt_strategy_profiles", ["user_id"]], ["debts", ["id"]], ["financial_goals", ["id"]],
  ["financial_periods", ["id"]], ["goal_contributions", ["id"]], ["merchant_aliases", ["id"]],
  ["merchants", ["id"]], ["monthly_plans", ["id"]], ["net_worth_snapshots", ["id"]],
  ["payment_methods", ["id"]], ["planning_engine_profiles", ["user_id"]],
  ["recurring_expense_versions", ["id"]], ["recurring_expenses", ["id"]],
  ["resilience_essential_categories", ["user_id", "category_id"]],
  ["resilience_profiles", ["user_id"]], ["transactions", ["id"]],
] as const;

type Row = Record<string, unknown>;
type QueryResult = { data: Row[] | null; error: unknown; count: number | null };
type Query = PromiseLike<QueryResult> & {
  eq(column: string, value: string): Query;
  order(column: string, options: { ascending: boolean }): Query;
  range(from: number, to: number): Query;
};
export type ExportClient = { from(table: string): { select(columns: string, options: { count: "exact" }): Query } };

export async function exportAccountData(client: ExportClient, userId: string) {
  if (!userId) throw new Error("Authenticated user required");
  const startedAt = new Date().toISOString();
  const tables: Record<string, Row[]> = {};
  const counts: Record<string, number> = {};
  const pageSize = 500;
  for (const [table, keys] of exportSources) {
    const rows: Row[] = [];
    const seen = new Set<string>();
    let expectedCount: number | null = null;
    for (let offset = 0; ; offset += pageSize) {
      let query = client.from(table).select("*", { count: "exact" }).eq("user_id", userId);
      for (const key of keys) query = query.order(key, { ascending: true });
      const result = await query.range(offset, offset + pageSize - 1);
      if (result.error || !result.data || result.count === null || result.count < 0) throw new Error("Incomplete export");
      if (result.count > 50000) throw new Error("Export requires operator assistance");
      if (expectedCount !== null && result.count !== expectedCount) throw new Error("Data changed during export");
      expectedCount = result.count;
      for (const row of result.data) {
        if (row.user_id !== userId || keys.some(key => row[key] === null || row[key] === undefined)) throw new Error("Invalid export ownership or key");
        const id = JSON.stringify(keys.map(key => row[key]));
        if (seen.has(id)) throw new Error("Data changed during export");
        seen.add(id);
        rows.push(row);
      }
      if (rows.length === expectedCount) break;
      if (rows.length > expectedCount || result.data.length === 0) throw new Error("Incomplete export");
    }
    tables[table] = rows;
    counts[table] = rows.length;
  }
  return {
    formatVersion: 1,
    startedAt,
    completedAt: new Date().toISOString(),
    scope: "Dados da conta nas tabelas públicas da aplicação",
    consistency: "Leitura paginada; não representa um snapshot transacional entre tabelas.",
    excluded: ["Fontes privadas da importação e arquivos locais", "Logs e backups dos fornecedores", "Senhas, tokens e sessões"],
    tables,
    counts,
  };
}
