# MVP 5 — Gestão de Dívidas

## Objetivo

Dar visibilidade ao estoque de dívidas e às possíveis ordens de quitação sem transformar uma heurística em recomendação automática.

## Dados por dívida

- nome e credor;
- tipo;
- saldo atual;
- taxa anual opcional;
- pagamento mínimo mensal;
- dia de vencimento opcional;
- observações;
- status ativo, quitado ou arquivado.

O saldo é declarado pelo usuário.

## Estratégias

### Avalanche

Ordena dívidas ativas pela maior taxa anual informada. Em empate, usa o menor saldo. Dívidas sem taxa informada aparecem depois das que têm taxa.

### Bola de neve

Ordena pelo menor saldo. Em empate, usa a maior taxa informada.

O usuário escolhe qual estratégia acompanhar. O aplicativo não declara uma estratégia como universalmente melhor.

## Pagamentos

O usuário informa:

- valor pago;
- data;
- novo saldo após o pagamento;
- observação opcional.

O novo saldo é obrigatório porque juros e encargos podem fazer o saldo real divergir de uma simples subtração do pagamento.

`record_debt_payment` registra pagamento e atualiza saldo na mesma transação do banco. A função valida proprietário, status ativo, data até hoje e período financeiro aberto.

Pagamentos de dívida **não geram uma nova transação financeira automaticamente**. Isso evita dupla contagem caso o usuário já tenha registrado a saída em seu fluxo mensal.

## Indicadores

- saldo total ativo;
- soma dos pagamentos mínimos;
- taxa média anual ponderada pelas dívidas com taxa informada;
- juros mensais estimados por aproximação simples.

A estimativa mensal de juros não é cronograma de amortização nem previsão contratual.

## Segurança

Tabelas:

- `debt_strategy_profiles`
- `debts`
- `debt_payments`

Todas usam isolamento por usuário. Pagamentos são gravados pela função controlada `record_debt_payment`.

## Testes

- `tests/debts.test.mjs` — cálculos e ordenação.
- `supabase/tests/debts_rls.sql` — isolamento, função de pagamento, período fechado e bloqueio anônimo.

## Fora do escopo

- amortização contratual precisa;
- CET, IOF ou composição detalhada de encargos;
- renegociação automática;
- integração bancária;
- patrimônio líquido;
- recomendação financeira personalizada.
