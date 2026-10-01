"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  calculateAccountBalances,
  moneyCents,
  netWorthMetrics,
  type BalanceTransaction,
  type NetWorthAccount,
} from "@/lib/net-worth";
import { todayInBrazil } from "@/lib/finance";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const ASSET_TYPES = new Set(["investment","real_estate","vehicle","retirement","business","valuable","receivable","other"]);

function fail(message: string): never {
  redirect("/net-worth?error=" + encodeURIComponent(message));
}

function done(message: string): never {
  revalidatePath("/net-worth");
  revalidatePath("/");
  redirect("/net-worth?message=" + encodeURIComponent(message));
}

async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

export async function createAsset(form: FormData) {
  const { supabase, userId } = await requireUser();
  const name = text(form,"name");
  const assetType = text(form,"asset_type");
  const valueCents = moneyCents(text(form,"current_value"));
  const valuationDate = text(form,"valuation_date");
  const notes = text(form,"notes");

  if (name.length < 2 || name.length > 80) fail("Informe um nome de ativo entre 2 e 80 caracteres.");
  if (!ASSET_TYPES.has(assetType)) fail("Tipo de ativo inválido.");
  if (valueCents === null) fail("Valor do ativo inválido.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valuationDate) || valuationDate > todayInBrazil()) {
    fail("A data da avaliação não pode estar no futuro.");
  }
  if (notes.length > 300) fail("Use até 300 caracteres nas observações.");

  const { error } = await supabase.from("assets").insert({
    user_id: userId,
    name,
    asset_type: assetType,
    current_value: valueCents / 100,
    valuation_date: valuationDate,
    notes: notes || null,
    status: "active",
  });

  if (error) fail("Não foi possível cadastrar o ativo.");
  done("Ativo cadastrado e avaliação inicial registrada.");
}

export async function addAssetValuation(form: FormData) {
  const { supabase, userId } = await requireUser();
  const assetId = text(form,"asset_id");
  const valueCents = moneyCents(text(form,"value"));
  const valuedOn = text(form,"valued_on");
  const note = text(form,"note");

  if (!uuid(assetId)) fail("Ativo inválido.");
  if (valueCents === null) fail("Valor da avaliação inválido.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valuedOn) || valuedOn > todayInBrazil()) {
    fail("A data da avaliação não pode estar no futuro.");
  }
  if (note.length > 160) fail("Use até 160 caracteres na observação.");

  const { error } = await supabase.from("asset_valuations").insert({
    user_id: userId,
    asset_id: assetId,
    value: valueCents / 100,
    valued_on: valuedOn,
    note: note || null,
  });

  if (error) fail("Não foi possível registrar a avaliação.");
  done("Nova avaliação registrada.");
}

export async function updateAsset(form: FormData) {
  const { supabase, userId } = await requireUser();
  const id = text(form,"id");
  const name = text(form,"name");
  const assetType = text(form,"asset_type");
  const notes = text(form,"notes");

  if (!uuid(id)) fail("Ativo inválido.");
  if (name.length < 2 || name.length > 80) fail("Informe um nome de ativo entre 2 e 80 caracteres.");
  if (!ASSET_TYPES.has(assetType)) fail("Tipo de ativo inválido.");
  if (notes.length > 300) fail("Use até 300 caracteres nas observações.");

  const { data, error } = await supabase
    .from("assets")
    .update({ name, asset_type: assetType, notes: notes || null, updated_at: new Date().toISOString() })
    .eq("id",id)
    .eq("user_id",userId)
    .select("id")
    .maybeSingle();

  if (error || !data) fail("Não foi possível atualizar o ativo.");
  done("Ativo atualizado.");
}

export async function changeAssetStatus(form: FormData) {
  const { supabase, userId } = await requireUser();
  const id = text(form,"id");
  const status = text(form,"status");
  if (!uuid(id) || !["active","archived"].includes(status)) fail("Ativo inválido.");

  const { data, error } = await supabase
    .from("assets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id",id)
    .eq("user_id",userId)
    .select("id")
    .maybeSingle();

  if (error || !data) fail("Não foi possível alterar o ativo.");
  done(status === "archived" ? "Ativo arquivado." : "Ativo reativado.");
}

export async function saveNetWorthScope(form: FormData) {
  const { supabase, userId } = await requireUser();
  const selectedAccounts = [...new Set(form.getAll("account_ids").map(String).filter(uuid))];
  const selectedDebts = [...new Set(form.getAll("debt_ids").map(String).filter(uuid))];

  const [
    { data: accounts, error: accountsError },
    { data: debts, error: debtsError },
  ] = await Promise.all([
    supabase.from("accounts").select("id"),
    supabase.from("debts").select("id"),
  ]);

  if (accountsError || debtsError) fail("Não foi possível validar o escopo do patrimônio.");

  const ownAccounts = new Set((accounts ?? []).map((item) => item.id));
  const ownDebts = new Set((debts ?? []).map((item) => item.id));

  if (selectedAccounts.some((id) => !ownAccounts.has(id)) || selectedDebts.some((id) => !ownDebts.has(id))) {
    fail("O escopo contém um item inválido.");
  }

  const { error: clearAccountsError } = await supabase
    .from("accounts")
    .update({ include_in_net_worth: false })
    .eq("user_id",userId);
  if (clearAccountsError) fail("Não foi possível atualizar as contas do patrimônio.");

  if (selectedAccounts.length) {
    const { error } = await supabase
      .from("accounts")
      .update({ include_in_net_worth: true })
      .eq("user_id",userId)
      .in("id",selectedAccounts);
    if (error) fail("Não foi possível incluir as contas selecionadas.");
  }

  const { error: clearDebtsError } = await supabase
    .from("debts")
    .update({ include_in_net_worth: false })
    .eq("user_id",userId);
  if (clearDebtsError) fail("Não foi possível atualizar as dívidas do patrimônio.");

  if (selectedDebts.length) {
    const { error } = await supabase
      .from("debts")
      .update({ include_in_net_worth: true })
      .eq("user_id",userId)
      .in("id",selectedDebts);
    if (error) fail("Não foi possível incluir as dívidas selecionadas.");
  }

  done("Escopo do patrimônio atualizado.");
}

export async function saveNetWorthSnapshot(form: FormData) {
  const { supabase, userId } = await requireUser();
  const note = text(form,"note");
  if (note.length > 160) fail("Use até 160 caracteres na observação.");

  const [
    { data: accountsData, error: accountsError },
    { data: transactionsData, error: transactionsError },
    { data: assetsData, error: assetsError },
    { data: debtsData, error: debtsError },
  ] = await Promise.all([
    supabase.from("accounts").select("id,name,account_type,initial_balance,include_in_net_worth"),
    supabase.from("transactions").select("account_id,kind,amount"),
    supabase.from("assets").select("current_value,status"),
    supabase.from("debts").select("current_balance,status,include_in_net_worth"),
  ]);

  if (accountsError || transactionsError || assetsError || debtsError) {
    fail("Não foi possível calcular o patrimônio para o snapshot.");
  }

  const accounts = (accountsData ?? []) as NetWorthAccount[];
  const transactions = (transactionsData ?? []) as BalanceTransaction[];
  const balances = calculateAccountBalances(accounts,transactions);
  const metrics = netWorthMetrics(
    accounts.map((account) => ({
      balance: balances.get(account.id) ?? Number(account.initial_balance),
      include_in_net_worth: account.include_in_net_worth,
    })),
    (assetsData ?? []) as Array<{ current_value:number|string; status:"active"|"archived" }>,
    (debtsData ?? []) as Array<{ current_balance:number|string; status:"active"|"paid"|"archived"; include_in_net_worth:boolean }>,
  );

  const { error } = await supabase.from("net_worth_snapshots").upsert(
    {
      user_id: userId,
      captured_on: todayInBrazil(),
      accounts_value: Math.round(metrics.accountsValue * 100) / 100,
      manual_assets_value: Math.round(metrics.manualAssetsValue * 100) / 100,
      liabilities_value: Math.round(metrics.liabilitiesValue * 100) / 100,
      net_worth: Math.round(metrics.netWorth * 100) / 100,
      notes: note || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,captured_on" },
  );

  if (error) fail("Não foi possível salvar a fotografia patrimonial.");
  done("Fotografia patrimonial de hoje salva.");
}
