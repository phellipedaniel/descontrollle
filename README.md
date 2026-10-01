# descontrollle

Gerenciador de finanças pessoais orientado a planejamento financeiro.

## Roadmap implementado

- MVP 0 — Fundação
- MVP 1 — Diagnóstico financeiro
- MVP 2 — Planejamento mensal
- MVP 3 — Objetivos financeiros
- MVP 4 — Segurança financeira
- MVP 5 — Gestão de dívidas
- MVP 6 — Patrimônio líquido
- MVP 7 — Motor de planejamento
- MVP 8 — Comportamento financeiro
- MVP 9 — Automação

## MVP 9 — Automação

- Formas de pagamento: cartões, Pix, débito, dinheiro, transferência e outros
- Gastos recorrentes versionados somente para frente
- Conta de origem por recorrência
- Sincronização idempotente de lançamentos automáticos
- Integração das formas de pagamento à tela de Finanças
- Fechamento definitivo do mês
- Reuso das travas de meses fechados em transações e planejamento
- [Escopo, regras e testes](docs/MVP-9.md)

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
- `/automation` — formas de pagamento, recorrências e fechamento

## Segurança
- Nenhuma `service_role`/secret key é exposta ao frontend.
- Tabelas operacionais usam RLS por `auth.uid()`.
- Funções de automação públicas usam `SECURITY INVOKER`.
- `anon` não recebe acesso aos dados financeiros.

## Importação histórica
Veja [as regras de importação e isolamento por usuário](docs/HISTORICAL-IMPORT.md).
