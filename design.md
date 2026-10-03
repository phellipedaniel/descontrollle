---
version: 1.0
name: descontrollle-editorial
description: "Dashboard financeiro pessoal, claro e editorial. Fundo papel quente (#faf9f5), painéis creme com borda de 1 px e sem sombra, texto quase preto, e coral queimado (#994c34) como único accent, reservado a ação primária, foco, seleção e uma série de dados. Títulos em Poppins 500, corpo e números em Roboto. Painéis de análise podem usar o contexto inverso (--ds-ink). Densidade organizada: listas e divisores em vez de um card por linha. Nenhum dado fictício: ausência, zero, carregando e erro são estados distintos."

colors:
  bg: "#faf9f5"
  surface-1: "#f5f0e8"
  surface-2: "#efe9de"
  surface-hover: "#e8e0d2"
  border-subtle: "#ded7cd"
  border-control: "#82766b"
  text-primary: "#141413"
  text-secondary: "#3d3d3a"
  text-muted: "#625f58"
  accent: "#994c34"
  accent-hover: "#93452e"
  accent-active: "#803c28"
  on-accent: "#faf9f5"
  accent-subtle: "#f2e0d7"
  success: "#27634d"
  success-subtle: "#e0eee7"
  danger: "#a13232"
  danger-subtle: "#fae9e5"
  warning: "#775500"
  warning-subtle: "#f6edce"
  info: "#315e79"
  info-subtle: "#e5eef2"
  focus: "#93452e"
  overlay: "rgb(0 0 0 / 64%)"
  ink: "#181715"
  ink-elevated: "#252320"
  ink-hover: "#35312d"
  on-ink: "#faf9f5"
  on-ink-secondary: "#d7d0c7"
  on-ink-muted: "#b8b0a5"
  ink-border: "#514b44"
  ink-accent: "#e4a48b"
  ink-success: "#91c7a8"
  ink-danger: "#edb0a7"
  ink-warning: "#e4c182"
  ink-info: "#abcbd9"
  chart: ["#b7664c", "#357f70", "#94621e", "#a45576", "#426b83", "#72685f"]
  ink-chart: ["#e4a48b", "#7db9a5"]

typography:
  display: { fontFamily: Poppins, fontSize: 40px, lineHeight: 48px, fontWeight: 500 }
  h1: { fontFamily: Poppins, fontSize: 36px, lineHeight: 44px, fontWeight: 500, letterSpacing: -0.02em }
  h2: { fontFamily: Poppins, fontSize: 20px, lineHeight: 28px, fontWeight: 500 }
  h3: { fontFamily: Poppins, fontSize: 16px, lineHeight: 24px, fontWeight: 500 }
  body: { fontFamily: Roboto, fontSize: 14px, lineHeight: 22px, fontWeight: 400 }
  label: { fontFamily: Roboto, fontSize: 13px, lineHeight: 20px, fontWeight: 500 }
  caption: { fontFamily: Roboto, fontSize: 12px, lineHeight: 18px, fontWeight: 400 }
  metric: { fontFamily: Roboto, fontSize: 32px, lineHeight: 40px, fontWeight: 500, letterSpacing: -0.02em }
  metric-compact: { fontFamily: Roboto, fontSize: 24px, lineHeight: 32px, fontWeight: 500 }

rounded: { badge: 6px, control: 8px, panel: 12px, modal: 16px, pill: 999px }
spacing: { 0: 0, 1: 4px, 2: 8px, 3: 12px, 4: 16px, 5: 20px, 6: 24px, 7: 32px, 8: 40px, 9: 48px, 10: 64px }
layout: { sidebar-expanded: 240px, sidebar-collapsed: 72px, topbar-min: 64px, content-max: 1440px, control-sm: 36px, control-md: 44px, control-lg: 48px, touch-target: 44px, icon-sm: 16px, icon-md: 20px, table-head: 40px, table-row: 48px, progress-height: 8px, chart-min-height: 240px, dialog: 480px, dialog-wide: 640px, drawer: 320px }
elevation: { panel: "none (borda 1px)", popover: "0 8px 24px rgb(0 0 0 / 32%)", modal: "0 24px 64px rgb(0 0 0 / 48%)" }
motion: { hover: 120ms, state: 180ms, layer: 240ms, easing: "cubic-bezier(0.2, 0, 0, 1)" }
---

# descontrollle — design.md

Fonte de verdade visual do app. Este arquivo prevalece sobre `docs/DESIGN-SYSTEM.md` e os estilos existentes. Acima dele prevalecem as regras do domínio financeiro e seus testes. Este documento não altera fórmulas, validações, permissões nem persistência.

## 1. Identidade

Controle, transparência e tranquilidade. O nome é sempre **descontrollle**, em minúsculas. O símbolo é um "d" em círculo coral (32 px), sempre acompanhado de nome acessível. A área autenticada é funcional, sem estética de landing page. O tema oficial é claro; análises podem usar o contexto inverso completo (`ds-inverse`), nunca só o fundo invertido.

## 2. Princípios

1. Clareza antes de decoração: cada bloco responde a uma pergunta.
2. Hierarquia: período e contexto, depois métricas, depois análise, depois histórico.
3. Cor com função: ação, estado ou série. O valor de um KPI é sempre texto primário; a cor semântica fica no estado, ícone ou comparação, com legenda.
4. Densidade organizada: listas, divisores e tabelas. No máximo dois níveis de superfície aninhados.
5. Confiança: toda comparação tem período, base e disponibilidade.
6. Uma ação primária por contexto de tarefa.
7. Responsividade real e acessibilidade desde o componente.
8. Linguagem respeitosa: fatos, sem culpa nem diagnóstico de personalidade.

## 3. Composição

- Fundo e superfícies neutros de matiz quente. Coral nunca preenche sidebar, todos os cards ou áreas extensas.
- Accent: ação primária, foco, seleção, link e uma série de dados. Não usar como indicador genérico de sucesso.
- Painéis: `surface-1`, borda 1 px `border-subtle`, radius 12, padding 24 (16 no mobile), sem sombra. Sombra só em menu, popover e diálogo.
- Proibido sobre dados: gradiente (exceto no símbolo da marca), blur, glassmorphism, brilho, círculos decorativos, sombras coloridas.
- Ícones: SVG de uma só família, traço 1,75–2 px, 20 px em controles e 16 px em metadados. Sem emoji nem glifos Unicode como ícone.

## 4. Tipografia

Poppins 500 em h1/h2/h3; Roboto 400/500/600 em tudo o mais. Carregar via `next/font/google` (latin, latin-ext, `display: swap`), com fallback Arial/system-ui. Pesos 800/900 nunca em conteúdo financeiro. Sem caixa alta em títulos e labels. Números: `font-variant-numeric: tabular-nums lining-nums`; alinhados à direita nas tabelas; sem ellipsis (números longos quebram linha ou usam `metric-compact`).

## 5. Layout e AppShell

`AppShell` = skip link ("Pular para o conteúdo"), sidebar, topbar e um único `main`. Conteúdo até 1440 px, centralizado após a sidebar. Grid desktop de 12 colunas, gap 24; seções separadas por 32; título para conteúdo 16; itens relacionados 8–12.

| Largura | Navegação | Padding / gap | KPIs por linha |
| --- | --- | --- | --- |
| 320–639 | Drawer | 16 / 16 | 1 |
| 640–1023 | Drawer | 24 / 16 | 2 |
| 1024–1279 | Sidebar recolhida (72) | 24 / 24 | 2 |
| ≥1280 | Sidebar expandida (240), recolhível | 32 / 24 | 4 |

Os breakpoints ficam em media queries, nunca em custom properties.

## 6. Navegação

Sidebar `surface-1`, borda direita 1 px. Marca no topo; grupos com rótulo em caption (tracking 0,04em, `text-muted`):

- **Principal:** Visão geral `/`, Finanças `/finance`, Planejamento `/planning`, Objetivos `/goals`
- **Análise:** Segurança financeira `/resilience`, Dívidas `/debts`, Patrimônio `/net-worth`, Projeções `/forecast`, Comportamento `/behavior`
- **Rotinas:** Automação `/automation`

No rodapé: Privacidade e dados, Sair e alternância de tema. Item com mínimo de 44 px. Item ativo: fundo `accent-subtle`, texto `accent` peso 500, marcador lateral de 3 px e `aria-current="page"`. Não existe "Configurações" enquanto não houver rota funcional.

## 7. Componentes

**Button**: `primary` (accent sólido, on-accent), `secondary` (surface-2 + border-control), `ghost` (transparente, hover surface-hover), `danger` (danger-subtle, texto e borda danger). Alturas 36/44/48; padrão 44; label em verbo ("Salvar planejamento"). Hover: accent-hover; active: accent-active; sem mover nem escalar. Loading preserva largura ("Salvando…") e bloqueia envio duplicado. Disabled: superfície neutra, texto muted, motivo explicado.

**Foco**: contorno 2 px, offset 3 px, cor `focus`, sempre visível por teclado.

**Campos** (Input, Select, Textarea): altura 44, radius 8, padding 12, fundo surface-2, borda `border-control`, label visível acima (13/500, secondary), ajuda e erro em 12/18, gap 8. Erro: borda danger, ícone e texto, `aria-invalid` e `aria-describedby`. Checkbox/radio 20 px com alvo de 44; switch de 36×20 só para configuração binária.

**Badge / StatusBadge**: 12/18, padding 4×8, radius 6; texto nunca depende só da cor. Estado vem do domínio, nunca do sinal de um valor.

**MetricCard / faixa de KPIs**: os quatro KPIs compartilham uma superfície com divisores verticais. Label 13/500, valor `metric`, referência em caption `text-muted`. Estados: loading, ready, empty, unavailable, error.

**ProgressBar**: trilha 8 px, pill. Acima de 100% a barra satura e o texto preserva o valor ("125%"); sem limite definido, exibir "Sem limite definido".

**DataTable**: cabeçalho 40, linha 48 (compacta 40 só no desktop), `caption`, números à direita, `aria-sort` quando ordenável.

**Dialog** surface-2, radius 16, 480/640 px; ação irreversível não fecha por clique no overlay. **Dropdown/Tooltip**: surface-2, radius 8, item mínimo 44. **Alert**: fundo subtle, título curto, ação. **Toast**: sucesso some em 5 s com pausa em hover/foco; erro é persistente. **EmptyState**: título factual, uma frase, ação pertinente, sem gráfico ilustrativo. **Skeleton**: estático.

## 8. Home (Visão geral)

Ordem fixa:
1. **PageHeader**: h1 "Visão geral", descrição, período ("Outubro de 2026"), seletor de mês (`month=YYYY-MM`), "Consultar" (secondary) e a ação primária "Registrar lançamento".
2. **Contexto**: StatusBadge "Mês aberto"/"Mês fechado", "Leitura parcial · mês em andamento" quando aplicável, e "Fluxo do período; saldo realizado não é saldo bancário."
3. **Faixa de KPIs**: Saldo realizado, Receitas, Despesas, Saldo previsto.
4. **Análise principal**: Fluxo financeiro (8 col., contexto inverso) e Orçamento do mês (4 col.); abaixo de 1024 px, empilha nessa ordem.
5. **Complementar**: Patrimônio e reserva (6) e Objetivos e dívidas (6).
6. **Atenção e revisão** (máx. 3 itens) e **Últimos lançamentos** (5; "Ver todos").

Saldo previsto sem plano mostra "Sem planejamento", nunca `R$ 0,00`. Patrimônio exibe a data de referência. Nada de score de saúde financeira inventado.

## 9. Visualização de dados

| Pergunta | Visual |
| --- | --- |
| Planejado × realizado | Barras agrupadas, origem zero; planejado em contorno/hachura, realizado sólido |
| Evolução mensal | Linha 2 px com pontos de 4 px; lacunas interrompem a linha; projeção tracejada e rotulada |
| Maiores despesas | Barras horizontais em ordem decrescente |
| Uso de orçamento | Barra limitada + texto com realizado e limite |
| Composição | Barras empilhadas (não para saldos negativos) |

Séries categóricas na ordem: `#b7664c`, `#357f70`, `#94621e`, `#a45576`, `#426b83`, `#72685f`; no contexto inverso, `#e4a48b` e `#7db9a5`. Máximo de seis séries. Receitas = success, despesas = danger, saldo = accent, sempre com legenda, posição e padrão além da cor. Proibidos: 3D, velocímetro, radar, eixo duplo e donut como padrão. Todo gráfico traz título, unidade, período, legenda, fonte/método, tooltip com valor exato e alternativa em tabela. Nada é desenhado em loading, erro ou ausência.

## 10. Formatação de dados

BRL via `formatBRL`: `R$ 1.234,56`; negativo `-R$ 250,00` (o sinal nunca depende da cor). Percentual com uma casa (`12,5%`); diferença entre taxas em `p.p.`. Data `dd/mm/aaaa` sem deslocamento de fuso; mês por extenso ("Outubro de 2026"), chave interna `2026-10`. Ausência, zero, carregando, erro e parcial são estados diferentes e nunca se confundem.

## 11. Movimento

Hover 120 ms, estado 180 ms, camada 240 ms, curva `cubic-bezier(0.2, 0, 0, 1)`. Animar só opacity e transform. Sem animação de números, barras crescendo ou contadores. `prefers-reduced-motion: reduce` remove o movimento não essencial.

## 12. Acessibilidade

Contraste mínimo 4,5:1 (3:1 a partir de 24 px). Pares aprovados: text-primary/secondary/muted sobre bg, surface-1 e surface-2; on-accent sobre accent; texto semântico sobre o respectivo subtle. Não usar `accent-subtle` como cor de texto. Alvos de toque de 44×44. Um `h1` por página, sem saltar níveis. Tabs que só navegam entre rotas são links com `aria-current`. Botões só de ícone têm nome e tooltip em hover e foco.

## 13. Microcopy

Verbos nos botões ("Registrar lançamento", "Planejar mês"). Estados vazios factuais ("Defina o orçamento deste mês"). Erros dizem o que houve e o que fazer. Sem culpabilizar, sem prometer resultado, sem emoji.

## 14. Faça / Não faça

- Faça: tokens `--ds-*`, uma ação primária por contexto, divisores em listas, texto primário nos valores.
- Não faça: hexadecimal solto em componente, coral em áreas extensas, card dentro de card dentro de card, cor como única diferença entre receita e despesa, dados de exemplo no ambiente real.

## 15. Mapa para o código

Valores vivem só no bloco `:root` de `src/app/globals.css` como `--ds-*` (cores, espaçamento, raios, tipografia, layout). Componentes: `src/components/ui/*`, `layout/app-shell`, `layout/page-header`, `dashboard/metric-card`, `dashboard/overview-charts`, `sidebar`. Fontes via `next/font/google` em `src/app/layout.tsx`.
