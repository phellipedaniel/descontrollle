# Sprint 3 — Finanças, Planejamento e tipografia

O Sprint 2 foi mergeado no PR #13. Esta etapa aplica os componentes compartilhados aos dois módulos de uso diário e atende à troca de fontes solicitada pelo usuário.

## Resultado

- Poppins nos títulos, Roboto no texto, nos controles e nos números; pesos 400/500/600, latin/latin-ext e swap. O Next obtém as fontes no build e as serve pela própria aplicação. Os três binários Trial anteriores foram removidos.
- Finanças prioriza lançamentos e histórico; configuração de contas/categorias fica em seção expansível, aberta quando não há conta. O mês atual e a abrangência histórica são explícitos.
- Tabela semântica das últimas 20 movimentações com data, origem, tipo e valor exato; exclusão exige expandir a confirmação específica antes de enviar a ação existente. Recorrências continuam gerenciadas na Automação.
- Planejamento usa cabeçalho com navegação mensal, KPIs e painéis compartilhados. Plano ausente e orçamento indefinido não viram previsão zero nem percentual de uso inventado.
- Panel e FormSubmitButton reutilizáveis; o envio mostra estado pendente e bloqueia repetição enquanto a ação está em andamento. Alert recebe tom de sucesso.
- Consultas mensais recebem contagem exata para detectar truncamento do retorno. Quando parcial, totais realizados e comparações são indisponíveis; registros individuais e dados independentes continuam acessíveis.
- Barras são decorativas, com números disponíveis em texto; excedentes mantêm o percentual real e limitam somente a largura da barra.

## Limites preservados

Finanças continua operando sobre o mês atual. A sincronização de recorrências, a trava do mês fechado, as funções financeiras e todas as Server Actions permanecem intactas. Não há migração de banco, mudança de cálculo ou nova dependência. A revisão de outros módulos e a seleção histórica em Finanças são etapas futuras.

## Validação

53 testes aprovados, incluindo oito integrações novas de Finanças/Planejamento: fechamento, recorrências, confirmação, ausência de plano, excedentes, consultas parciais e falhas. TypeScript e build de produção aprovados com as novas fontes. Contraste claro/inverso permanece coberto.

O preview Vercel exige autenticação. A inspeção visual autenticada, teclado, zoom e leitor de tela permanece pendente e deve anteceder a aprovação final. Nenhuma captura autenticada ou certificação de acessibilidade é afirmada.

Manter o PR para revisão, sem merge automático.
