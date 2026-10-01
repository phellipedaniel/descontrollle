# MVP 4 — Segurança Financeira / Resiliência

## Objetivo

Separar proteção contra imprevistos de gastos previsíveis.

A reserva de emergência representa proteção. Provisões anuais representam despesas conhecidas que devem ser preparadas antes de ocorrer. O MVP não entra em estratégia de dívida ou patrimônio líquido; esses módulos permanecem posteriores.

## Reserva de emergência

O usuário escolhe quantos meses de proteção deseja entre 1 e 24.

A reserva-alvo é:

```
gasto essencial mensal × meses de proteção
```

A cobertura atual é:

```
reserva declarada ÷ gasto essencial mensal
```

O valor da reserva é declaratório: não movimenta dinheiro, não cria transação e não altera saldo bancário.

## Gasto essencial mensal

O usuário escolhe explicitamente quais categorias de despesa são essenciais. O histórico nunca classifica uma categoria como essencial automaticamente.

Há três fontes possíveis para o baseline:

1. **Manual** — valor informado pelo usuário.
2. **Planejamento do mês** — soma dos orçamentos das categorias essenciais no plano atual.
3. **3 meses fechados** — média dos até 3 períodos anteriores mais recentes que estejam simultaneamente `closed` e `reconciled`.

Meses abertos, incompletos ou não reconciliados não entram no baseline histórico.

## Provisões anuais

Gastos previsíveis ficam fora da reserva de emergência.

Cada provisão tem nome, custo anual esperado, valor já provisionado, mês previsto opcional e observação. O valor mensal sugerido é o custo anual dividido por 12, arredondado para cima em centavos.

Provisões podem ser arquivadas e reativadas sem perder histórico. Nesta etapa o valor provisionado é declaratório e não gera movimentação financeira automática.

## Dados

Migrations:

- `20261001150450_mvp4_financial_resilience`
- `20261001150515_mvp4_resilience_indexes`

Tabelas:

- `resilience_profiles`
- `resilience_essential_categories`
- `annual_provisions`

As tabelas usam RLS por `auth.uid()`. A relação de categorias usa referência composta para impedir associação cruzada entre usuários.

## Validação

Cálculos: `tests/resilience.test.mjs`.

RLS: `supabase/tests/resilience_rls.sql`.

Critérios:

- reserva-alvo e cobertura calculados em centavos;
- baseline histórico usa apenas meses fechados e reconciliados;
- categorias essenciais dependem de seleção explícita;
- provisões não são somadas à reserva de emergência;
- usuário não lê nem altera configuração, categorias ou provisões de outro usuário;
- papel anônimo não recebe acesso.

## Fora do escopo

- quitação/estratégia de dívidas;
- patrimônio líquido;
- seguros;
- investimento ou rendimento da reserva;
- movimentação bancária automática;
- provisionamento automático baseado em inferência histórica.
