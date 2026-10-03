import { ButtonLink } from "@/components/ui/button";
import { SectionHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { formatBRL } from "@/lib/finance";
import { fixedMonthTotals, type FixedItem } from "@/lib/fixed-recurrences";
export function FixedRecurrenceSummary({ month, items }: { month: string; items: FixedItem[] | null }) {
  const totals = items && fixedMonthTotals(items);
  return <section className="ds-panel">
    <SectionHeader title="Salário e custos fixos" description="Previsões mensais independentes dos filtros de lançamentos." action={<ButtonLink href={`/recurrences?month=${month}`}>Gerenciar recorrências</ButtonLink>}/>
    {!items ? <Alert tone="warning">Não foi possível consultar as previsões de receitas e custos fixos.</Alert>
      : !items.some(i => i.confirmation || i.version?.is_active) ? <p>Nenhuma recorrência ativa neste mês. Cadastre o salário e os custos fixos para acompanhar a previsão desde o início do mês.</p>
      : <><dl className="ds-fixed-summary"><div><dt>Receitas fixas do mês</dt><dd>{formatBRL(totals!.income)}</dd></div><div><dt>Custos fixos do mês</dt><dd>{formatBRL(totals!.expense)}</dd></div><div><dt>Aguardando confirmação</dt><dd>{formatBRL(totals!.pendingIncome)} em receitas · {formatBRL(totals!.pendingExpense)} em custos</dd></div></dl><p>Previstos não entram como realizados. Valores confirmados já estão nos lançamentos; estes totais não devem ser somados novamente aos KPIs.</p></>}
  </section>;
}
