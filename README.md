# descontrollle

Gerenciador de finanças pessoais orientado a planejamento financeiro.

## MVP 0 — Fundação
- Next.js + Supabase Auth + dashboard

## MVP 1 — Diagnóstico Financeiro
- Contas, categorias, receitas, despesas, saldo e histórico

## MVP 2 — Planejamento Mensal
- Receita planejada, orçamento e planejado × realizado

## MVP 3 — Objetivos financeiros
- Metas, aportes, progresso e prazo
- [Escopo, cálculos e testes](docs/MVP-3.md)

## MVP 4 — Segurança financeira
- Reserva de emergência, categorias essenciais e provisões
- [Escopo, cálculos e testes](docs/MVP-4.md)

## MVP 5 — Gestão de dívidas
- Cadastro de dívidas e saldo atual
- Juros anuais e pagamento mínimo
- Estratégias avalanche e bola de neve
- Histórico de pagamentos com novo saldo informado
- Pagamento de dívida separado das transações para evitar dupla contagem
- [Escopo, cálculos e testes](docs/MVP-5.md)

Rotas principais:
- `/` — visão geral
- `/finance` — diagnóstico financeiro
- `/planning` — planejamento mensal
- `/goals` — objetivos financeiros
- `/resilience` — segurança financeira
- `/debts` — gestão de dívidas

## Segurança
- Nenhuma `service_role`/secret key é exposta ao frontend.
- Tabelas operacionais usam RLS por `auth.uid()`.
- `anon` não recebe acesso às tabelas financeiras.

## Importação histórica
Veja [as regras de importação e isolamento por usuário](docs/HISTORICAL-IMPORT.md).
