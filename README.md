# descontrollle

Gerenciador de finanças pessoais orientado a planejamento financeiro.

## MVP 0 — Fundação

- Next.js 16 + React 19 + TypeScript
- Supabase Auth com SSR
- Dashboard responsivo
- Variáveis de ambiente sem segredos versionados

## MVP 1 — Diagnóstico Financeiro

- Contas, categorias, receitas e despesas
- Saldo mensal e histórico
- RLS por usuário

## MVP 2 — Planejamento Mensal

- Receita planejada e orçamento por categoria
- Planejado × realizado
- Navegação entre meses

## MVP 3 — Objetivos financeiros

- Metas com valor, prazo e reserva inicial
- Aportes e progresso
- Comparação com a sobra do planejamento
- [Escopo, cálculos e testes](docs/MVP-3.md)

## MVP 4 — Segurança financeira

- Despesas essenciais escolhidas pelo usuário
- Reserva de emergência e meses de cobertura
- Baseline manual, pelo plano atual ou pela média dos últimos 3 meses fechados e reconciliados
- Provisões anuais separadas da reserva de emergência
- [Escopo, cálculos e testes](docs/MVP-4.md)

Rotas principais:

- `/` — visão geral
- `/finance` — diagnóstico financeiro
- `/planning` — planejamento mensal
- `/goals` — objetivos financeiros
- `/resilience` — segurança financeira

## Segurança

- Nenhuma `service_role`/secret key é exposta ao frontend.
- Autorização server-side usa Supabase Auth.
- Tabelas operacionais usam RLS por `auth.uid()`.
- O papel `anon` não recebe acesso às tabelas financeiras.

## Importação histórica

Revisão privada de fontes, deduplicação e vinculação ao proprietário antes da promoção. Veja [as regras de importação e isolamento por usuário](docs/HISTORICAL-IMPORT.md).
