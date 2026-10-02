import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { paymentMethodLabel, type PaymentMethod } from "@/lib/automation";
import { formatBRL, formatDate, type FinancialTransaction } from "@/lib/finance";

export function TransactionTable({ transactions, accountNames, categoryNames, merchantNames, paymentMethods, canDelete, deleteAction }: {
  transactions: FinancialTransaction[];
  accountNames: Map<string, string>;
  categoryNames: Map<string, string>;
  merchantNames: Map<string, string>;
  paymentMethods: Map<string, PaymentMethod>;
  canDelete: boolean;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  if (!transactions.length) return <EmptyState title="Nenhuma movimentação registrada." description="Registre uma receita ou despesa para começar." />;
  return <div className="ds-table-region ds-transactions" role="region" aria-label="Histórico de movimentações" tabIndex={0}>
    <table className="ds-table">
      <caption>Últimas 20 movimentações · todos os períodos</caption>
      <thead><tr><th scope="col">Data</th><th scope="col">Movimentação</th><th scope="col">Tipo</th><th scope="col" className="number">Valor</th><th scope="col">Ações</th></tr></thead>
      <tbody>{transactions.map(transaction => {
        const category = transaction.category_id ? categoryNames.get(transaction.category_id) : undefined;
        const merchant = transaction.merchant_id ? merchantNames.get(transaction.merchant_id) : undefined;
        const method = transaction.payment_method_id ? paymentMethods.get(transaction.payment_method_id) : undefined;
        const automatic = transaction.source_type === "recurring";
        const label = transaction.description || category || (transaction.kind === "income" ? "Receita" : "Despesa");
        return <tr key={transaction.id}>
          <td><time dateTime={transaction.occurred_on}>{formatDate(transaction.occurred_on)}</time></td>
          <th scope="row"><strong>{label}</strong><small>{accountNames.get(transaction.account_id) ?? "Conta"} · {category ?? "Sem categoria"}{merchant ? ` · ${merchant}` : ""}{method ? ` · ${paymentMethodLabel(method)}` : ""}</small>{automatic && <Badge tone="info">Automática</Badge>}</th>
          <td>{transaction.kind === "income" ? "Receita" : "Despesa"}</td>
          <td className="number ds-number">{transaction.kind === "income" ? "+" : "−"} {formatBRL(transaction.amount)}</td>
          <td>{!automatic && canDelete ? <details className="ds-delete-confirmation">
            <summary>Excluir<span className="sr-only"> {label} de {formatDate(transaction.occurred_on)}</span></summary>
            <p>Excluir {label} de {formatDate(transaction.occurred_on)} no valor de {formatBRL(transaction.amount)}? Esta ação remove o lançamento.</p>
            <form action={deleteAction}><input type="hidden" name="id" value={transaction.id} /><FormSubmitButton variant="danger" pendingLabel="Excluindo…">Confirmar exclusão</FormSubmitButton></form>
          </details> : <span className="ds-table-note">{automatic ? "Gerenciada na Automação" : "Exclusão bloqueada"}</span>}</td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}
