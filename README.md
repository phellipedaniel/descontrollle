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
- Dívidas, pagamentos, avalanche e bola de neve
- [Escopo, cálculos e testes](docs/MVP-5.md)

## MVP 6 — Patrimônio líquido
- Contas, ativos manuais, dívidas e snapshots patrimoniais
- [Escopo, cálculos e testes](docs/MVP-6.md)

## MVP 7 — Motor de planejamento
- Futuro planejado × cenário histórico provável
- Integração de compromissos e margem futura
- [Escopo, cálculos e testes](docs/MVP-7.md)

## MVP 8 — Comportamento financeiro
- Baseline com períodos fechados e reconciliados
- Tendência mensal e frequência de dias com gasto
- Movimento por categoria
- Concentração por estabelecimento condicionada à cobertura dos dados
- Regras de atenção configuráveis
- Check-in mensal escrito pelo usuário
- [Escopo, cálculos e testes](docs/MVP-8.md)

Rotas principais:
- `/` — visão geral
- `/finance` — diagnóstico financeiro
- `/planning` — planejamento mensal
- `/goals` — objetivos financeiros
- `/resilience` — segurança financeira
- `/debts` — gestão de dívidas
- `/net-worth` — patrimônio líquido
- `/forecast` — motor de planejamento e projeções
- `/behavior` — revisão de comportamento financeiro

## Segurança
- Nenhuma `service_role`/secret key é exposta ao frontend.
- Tabelas operacionais usam RLS por `auth.uid()`.
- `anon` não recebe acesso às tabelas financeiras.

## Importação histórica
Veja [as regras de importação e isolamento por usuário](docs/HISTORICAL-IMPORT.md).
