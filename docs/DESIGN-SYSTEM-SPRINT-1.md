# Design System 2.0 — Sprint 1

Implementa o contrato `docs/DESIGN-SYSTEM.md` aprovado no PR #11. Tokens oficiais e aliases de migração, base compartilhada, AppShell/PageHeader em todas as rotas financeiras, sidebar responsiva e Home orientada à situação financeira. Sem nova dependência e sem alterações em `src/lib`, Server Actions, Supabase ou regras financeiras.

## Fontes e períodos

- Fluxo: lançamentos do mês `month=YYYY-MM`, com helpers de calendário existentes. Contagem exata detecta consulta truncada; um total parcial fica indisponível.
- Plano: `monthly_plans` e `category_budgets` do mês. Sem plano não significa previsão zero; erro no orçamento bloqueia o saldo previsto.
- Patrimônio: última fotografia de `net_worth_snapshots`, com data explícita. Não é patrimônio em tempo real ou histórico do mês selecionado.
- Reserva: valor cadastrado em `resilience_profiles`. A Home não calcula cobertura sem consultar o baseline completo do módulo.
- Objetivos: até três objetivos ativos da view existente, usando `goalMetrics` para progresso e prazo.
- Dívidas: `debtPortfolioMetrics` sobre cadastros atuais. Sem dívidas ativas com saldo difere de erro na consulta.
- Atenção: até três verificações factuais do plano, limite de despesas e conciliação. Não há score, diagnóstico ou baseline inventado.
- Últimos lançamentos: cinco itens do mês selecionado, em ordem estável.

Finanças ainda abre o mês atual e seu histórico geral. A Home explicita esse comportamento ao consultar meses históricos, sem enviar um parâmetro que a rota não utiliza. Seleção mensal completa em Finanças permanece para a migração do módulo. Não há controle de ocultação de valores neste sprint.

## Validação

- 43 testes automatizados: 36 testes de domínio existentes e sete integrações da Home com fixtures explicitamente de teste. Cobrem mês selecionado, ausência de plano, mês fechado, erros independentes, orçamento indisponível, saldo negativo e consulta truncada.
- Checagem de tipos e build Next.js de produção concluídos.
- SVGs locais com estilo uniforme; sem biblioteca adicional.
- Drawer usa dialog nativo, com Escape, foco modal e restauração de foco. Tooltips dos links recolhidos aparecem em foco/hover e podem ser dispensados com Escape. Preferência de recolhimento só é aplicada no desktop com espaço.
- Revisão visual interativa, zoom e leitor de tela pendentes: a ferramenta de navegador desta sessão retornou erro de vinculação da aba. Não se afirma certificação de acessibilidade ou revisão por screenshot.

Os módulos recebem shell/header/base compartilhados; a migração integral dos painéis internos ocorre em sprints seguintes. Aliases e seletores legados permanecem por essa razão. O PR da implementação deve permanecer aberto, sem auto-merge, até revisão final.
