# MVP 6 — Patrimônio Líquido

## Objetivo

Transformar o histórico de fluxo, ativos e dívidas em um balanço pessoal.

A identidade central é:

```
patrimônio líquido =
saldo das contas incluídas
+ ativos manuais ativos
- dívidas incluídas
```

## Contas financeiras

O saldo de uma conta é calculado por:

```
saldo inicial + receitas - despesas
```

O usuário controla explicitamente quais contas entram no patrimônio.

Contas que servem apenas como contêiner da importação histórica são excluídas automaticamente, porque possuem despesas históricas sem as receitas correspondentes. Isso evita produzir um patrimônio artificialmente negativo.

## Ativos manuais

Ativos que não estão representados por contas financeiras são registrados separadamente:

- investimentos;
- imóveis;
- veículos;
- previdência;
- participação em negócio;
- bens de valor;
- valores a receber;
- outros ativos.

Cada ativo possui valor atual e histórico append-only de avaliações. Uma avaliação retroativa é preservada, mas só uma avaliação com data igual ou posterior à avaliação corrente altera o valor atual.

O valor corrente não pode ser editado diretamente pelo frontend; ele muda pelo histórico de avaliações.

## Passivos

As dívidas vêm do MVP 5.

O usuário controla explicitamente quais dívidas entram no patrimônio. Dívidas quitadas não afetam o cálculo porque têm saldo zero. Dívidas arquivadas continuam disponíveis para inclusão: arquivar não equivale a quitar.

## O que não é somado novamente

Para evitar dupla contagem:

- reserva de emergência não é um ativo adicional;
- provisões não são ativos adicionais;
- saldo acumulado em metas não é um ativo adicional.

Esses valores representam destinações do dinheiro que deve existir em contas ou ativos.

## Snapshots

O usuário pode salvar uma fotografia patrimonial do dia.

O snapshot é recalculado no servidor e grava:

- contas incluídas;
- ativos manuais;
- passivos;
- patrimônio líquido.

Há um snapshot por usuário por dia; salvar novamente no mesmo dia atualiza a fotografia daquele dia.

## Dados

Migrations:

- `20261001172410_mvp6_net_worth`
- migration complementar de índice de avaliações.

Tabelas:

- `assets`
- `asset_valuations`
- `net_worth_snapshots`

Também são adicionados:

- `accounts.include_in_net_worth`
- `debts.include_in_net_worth`

## Segurança

Novas tabelas usam RLS por `auth.uid()`.

`assets.current_value` e `assets.valuation_date` não possuem grant de update para o frontend. Triggers privados e não executáveis pela API mantêm esses campos sincronizados com o histórico de avaliações.

## Testes

- `tests/net-worth.test.mjs` — saldos e cálculo patrimonial.
- `supabase/tests/net_worth_rls.sql` — isolamento, histórico de avaliações, proteção do valor corrente e snapshots.

## Fora do escopo

- cotação automática de investimentos;
- avaliação automática de imóveis e veículos;
- patrimônio compartilhado;
- impostos patrimoniais;
- consolidação multi-moeda;
- projeção futura do patrimônio.
