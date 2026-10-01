# MVP 9 — Automação

## Objetivo

Reduzir trabalho manual sem abrir mão da auditabilidade construída nos MVPs anteriores.

O MVP 9 usa três princípios:

1. automações são idempotentes;
2. mudanças em recorrências valem somente para períodos ainda editáveis;
3. fechamento de mês é definitivo.

## Formas de pagamento

A estrutura `payment_methods` já existia desde a fundação da importação histórica e agora recebe interface própria.

Tipos suportados:

- Pix;
- cartão de crédito;
- cartão de débito;
- dinheiro;
- transferência;
- outro.

Cartões possuem nome e bandeira opcional.

Uma forma de pagamento pode ser inativada sem apagar o histórico.

## Recorrências

As tabelas `recurring_expenses` e `recurring_expense_versions` também já existiam.

O MVP 9 adiciona `account_id` à versão porque cada lançamento automático precisa saber de qual conta sai o dinheiro.

Cada configuração possui:

- mês de vigência;
- descrição;
- valor;
- dia do mês;
- conta;
- categoria opcional;
- estabelecimento opcional;
- forma de pagamento opcional;
- estado ativo/inativo.

## Regra temporal

Versões cuja vigência está em ou antes do último período fechado não podem ser inseridas ou alteradas.

Uma configuração no mesmo mês ainda aberto pode ser corrigida. Depois do fechamento ela se torna imutável.

Encerrar uma recorrência significa criar uma versão futura/aberta com `is_active=false`.

## Sincronização

`sync_recurring_month(month)` resolve a versão mais recente de cada recorrência cuja vigência seja anterior ou igual ao mês.

Para cada recorrência ativa, mantém exatamente um lançamento automático no período.

A chave lógica é:

```
user_id + recurring_expense_id + recurring_period
```

Por isso executar a sincronização repetidamente não duplica transações.

Se o dia configurado não existe no mês, ele é ajustado para o último dia disponível. Exemplo: dia 31 em fevereiro.

Se uma versão de um mês aberto muda, a próxima sincronização atualiza apenas o lançamento automático daquele período.

Lançamentos manuais nunca são alterados pela rotina.

## Integração com Finanças

Ao abrir `/finance`, o app tenta sincronizar o mês atual quando ele ainda está aberto.

A tela manual de despesas também passa a aceitar:

- estabelecimento;
- forma de pagamento.

Lançamentos recorrentes aparecem como automáticos no histórico e não oferecem botão de exclusão individual, porque seriam recriados pela próxima sincronização.

## Fechamento

`close_financial_period`:

1. sincroniza recorrências;
2. cria o período aberto caso ele ainda não exista;
3. grava o estado de conciliação;
4. fecha o período.

Depois do fechamento, as políticas já existentes bloqueiam alteração de:

- transações;
- planejamento mensal;
- orçamento por categoria;
- versões recorrentes com efeito histórico.

O MVP 9 não implementa reabertura.

## Banco

Migration:

- `20261001181351_mvp9_automation_core.sql`

Campos adicionados:

- `recurring_expense_versions.account_id`;
- `transactions.recurring_expense_id`;
- `transactions.recurring_period`.

Funções:

- `create_recurring_expense`;
- `version_recurring_expense`;
- `sync_recurring_month`;
- `close_financial_period`.

Todas as funções públicas são `SECURITY INVOKER` e executam sob RLS do usuário autenticado.

## Agendamento em background

O projeto não tinha `pg_cron` habilitado no momento da implementação.

Por isso o MVP 9 usa sincronização idempotente disparada pelo uso normal do app e um controle manual na Central de Automação. O banco ficou preparado para receber um agendador futuro sem alterar o modelo de dados.

Nenhuma chave privilegiada foi adicionada ao frontend.

## Testes

- `tests/automation.test.mjs` — seleção de versões, datas, labels e dinheiro.
- `supabase/tests/automation_rls.sql` — idempotência, alteração em mês aberto, bloqueio após fechamento, isolamento entre usuários e bloqueio anônimo.
