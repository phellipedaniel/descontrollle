export type NetWorthAccount = {
  id: string;
  name: string;
  account_type: string;
  initial_balance: number | string;
  include_in_net_worth: boolean;
};

export type BalanceTransaction = {
  account_id: string;
  kind: "income" | "expense";
  amount: number | string;
};

export type Asset = {
  id: string;
  name: string;
  asset_type: string;
  current_value: number | string;
  valuation_date: string;
  notes: string | null;
  status: "active" | "archived";
  created_at: string;
};

export type AssetValuation = {
  id: string;
  asset_id: string;
  value: number | string;
  valued_on: string;
  note: string | null;
  created_at: string;
};

export type NetWorthDebt = {
  id: string;
  name: string;
  current_balance: number | string;
  status: "active" | "paid" | "archived";
  include_in_net_worth: boolean;
};

export type NetWorthSnapshot = {
  id: string;
  captured_on: string;
  accounts_value: number | string;
  manual_assets_value: number | string;
  liabilities_value: number | string;
  net_worth: number | string;
  notes: string | null;
};

export function moneyCents(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0 || amount > 9999999999.99) return null;
  return Math.round(amount * 100);
}

export function calculateAccountBalances(
  accounts: NetWorthAccount[],
  transactions: BalanceTransaction[],
) {
  const balances = new Map(accounts.map((account) => [account.id, Number(account.initial_balance)]));
  for (const transaction of transactions) {
    const current = balances.get(transaction.account_id);
    if (current === undefined) continue;
    const amount = Number(transaction.amount);
    balances.set(
      transaction.account_id,
      current + (transaction.kind === "income" ? amount : -amount),
    );
  }
  return balances;
}

export function netWorthMetrics(
  accounts: Array<{ balance: number; include_in_net_worth: boolean }>,
  assets: Array<{ current_value: number | string; status: "active" | "archived" }>,
  debts: Array<{
    current_balance: number | string;
    status: "active" | "paid" | "archived";
    include_in_net_worth: boolean;
  }>,
) {
  const accountsValue = accounts
    .filter((account) => account.include_in_net_worth)
    .reduce((sum, account) => sum + account.balance, 0);

  const manualAssetsValue = assets
    .filter((asset) => asset.status === "active")
    .reduce((sum, asset) => sum + Number(asset.current_value), 0);

  const liabilitiesValue = debts
    .filter(
      (debt) =>
        debt.include_in_net_worth &&
        debt.status !== "paid" &&
        Number(debt.current_balance) > 0,
    )
    .reduce((sum, debt) => sum + Number(debt.current_balance), 0);

  const assetsValue = accountsValue + manualAssetsValue;
  const netWorth = assetsValue - liabilitiesValue;
  const debtToAssets = assetsValue > 0 ? liabilitiesValue / assetsValue : null;

  return {
    accountsValue,
    manualAssetsValue,
    assetsValue,
    liabilitiesValue,
    netWorth,
    debtToAssets,
  };
}

export function assetTypeLabel(type: string) {
  const labels: Record<string, string> = {
    investment: "Investimento",
    real_estate: "Imóvel",
    vehicle: "Veículo",
    retirement: "Previdência",
    business: "Participação em negócio",
    valuable: "Bem de valor",
    receivable: "Valor a receber",
    other: "Outro ativo",
  };
  return labels[type] ?? "Outro ativo";
}
