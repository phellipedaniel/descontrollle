# descontrollle — Design System 3.1 — Editorial

**Contrato visual oficial do produto · versão 3.1.0 · 01/10/2026**

Status: contrato atualizado para o Sprint 3, sujeito à revisão do PR. Preserva a arquitetura e as regras financeiras da versão 2.0.

## 1. Escopo e autoridade

A fonte visual principal é o [`design.md`](../design.md) da raiz. Em divergências visuais, ele prevalece sobre este documento e os estilos existentes; o domínio financeiro e seus testes permanecem acima de ambos. O tema padrão é claro, e o tema escuro reutiliza a paleta editorial de tinta, sem a referência cromática do Linear.

Este documento determina como o descontrollle deve apresentar informação, organizar navegação e responder às ações do usuário. Aplica-se à Home, aos módulos financeiros, à autenticação e aos estados de sistema. **DEVE** indica obrigação; **NÃO DEVE**, proibição; **PODE**, alternativa permitida dentro das condições descritas.

O produto deve parecer um dashboard financeiro moderno: identidade editorial clara, títulos Poppins, pouca decoração, superfícies creme e coral como accent controlado. O objetivo é ajudar a responder: “Qual é minha situação?”, “O que mudou?” e “Qual ação posso tomar?”.

Este contrato não cria nem altera fórmulas, validações, limites de risco, baselines, regras temporais, critérios de conciliação, permissões ou persistência. Em caso de conflito, o domínio financeiro e seus testes prevalecem sobre um exemplo visual. Uma necessidade de mudança de domínio exige proposta separada.

### 1.1 Base verificada e referências internas

- Aplicação: Next.js App Router, React e TypeScript, conforme [package.json](../package.json).
- Estilos existentes: [src/app/globals.css](../src/app/globals.css), sem framework CSS declarado no pacote.
- Componentes existentes: [Sidebar](../src/components/sidebar.tsx) e [SubmitButton](../src/components/submit-button.tsx).
- Home existente: [src/app/page.tsx](../src/app/page.tsx), com saldo previsto, saldo realizado, receitas, despesas e comparação mensal.
- Formatação e calendário: [src/lib/finance.ts](../src/lib/finance.ts).
- Regras: [planejamento](MVP-2.md), [objetivos](MVP-3.md), [segurança financeira](MVP-4.md), [dívidas](MVP-5.md), [patrimônio](MVP-6.md), [projeções](MVP-7.md), [comportamento](MVP-8.md), [automação](MVP-9.md) e [importação histórica](HISTORICAL-IMPORT.md).

As APIs, caminhos e tokens descritos adiante como alvo são propostas de implementação. Não devem ser tratados como componentes ou arquivos já disponíveis.

## 2. Princípios de produto

1. **Clareza antes de decoração.** Cada bloco deve ter uma pergunta, um título e um resultado legível. Remover elementos que não ajudam a interpretar ou agir.
2. **Dashboard como ponto de partida.** A Home deve mostrar situação e prioridades; detalhes e edição pertencem aos módulos. Não apresentar catálogo de funcionalidades ou sequência de MVPs.
3. **Hierarquia explícita.** Período e contexto precedem métricas; métricas precedem análises; análises precedem histórico detalhado.
4. **Cor com função.** Cor identifica ação, estado ou série. Números não recebem cor apenas por serem receitas ou despesas; a legenda deve explicar o significado.
5. **Densidade organizada.** Preferir listas, divisores e tabelas a um card para cada linha. Espaçamento agrupa informação relacionada.
6. **Confiança na informação.** Toda comparação deve ter período, base e disponibilidade. Ausência, zero, carregamento e erro são estados diferentes.
7. **Ação proporcional.** No máximo uma ação primária por contexto de tarefa. Ações irreversíveis exigem consequência e confirmação específicas.
8. **Responsividade real.** Desktop organiza múltiplos blocos; mobile mantém o mesmo significado, com prioridade e leitura sequencial.
9. **Acessibilidade desde o componente.** Teclado, nome acessível e foco fazem parte do contrato, inclusive em gráficos e menus.
10. **Linguagem respeitosa.** Descrever fatos financeiros sem diagnosticar personalidade, culpabilizar ou prometer resultados.

## 3. Identidade visual

### 3.1 Personalidade e marca

O descontrollle deve transmitir controle, transparência e tranquilidade. Usar o nome em minúsculas: **descontrollle**. O símbolo “d” pode identificar a marca, mas não substitui o nome acessível. A experiência autenticada deve ser funcional, sem estética de landing page.

O tema oficial é claro: papel quente e texto escuro. Áreas de análise podem usar o contexto completo `.ds-inverse`, com cores próprias para texto, controles, estados e gráficos. Não inverter apenas o fundo. A referência estética é DESIGN-claude.md, sem copiar a marca ou transformar o dashboard em landing page.

### 3.2 Regras de composição

- O fundo da página e as superfícies devem ser neutros, com matiz quente. Coral não deve preencher a sidebar, todos os cards ou áreas extensas de conteúdo.
- Accent é reservado à ação primária, foco, seleção e uma série de dados quando apropriado. Não usar coral como indicador genérico de sucesso.
- O valor de um KPI deve usar texto primário. Cor semântica fica no estado, ícone ou comparação, com legenda textual.
- Gradientes são permitidos somente no símbolo da marca ou em uma peça de apresentação externa ao dashboard. Botões, gráficos e painéis financeiros devem ter preenchimento sólido.
- Blur, glassmorphism, brilho, círculos decorativos e sombras coloridas não devem aparecer sobre dados.
- Painéis comuns têm borda discreta e nenhuma sombra. Sombra é reservada a menus, popovers e diálogos.
- No máximo dois níveis de superfície aninhados. Uma lista dentro de painel usa divisores; não criar cards dentro de cards dentro de cards.

### 3.3 Ícones

Usar SVGs de uma mesma família, traço de 1,75–2 px, tamanho 20 px em controles e 16 px em metadados. A escolha da biblioteca exige revisão de dependência; este contrato não instala uma. Não misturar emojis, glifos Unicode e ícones SVG como navegação. Ícones decorativos devem ser ignorados por leitores de tela; botões apenas com ícone têm nome de ação e tooltip em hover e foco.

## 4. Tokens: fonte única de valores

Nomes semânticos descrevem função, não aparência. Componentes devem consumir `--ds-*`; hexadecimais e valores estruturais ficam centralizados no bloco de tokens. Valores calculados de geometria de gráfico e dados não são tokens de estilo.

### 4.1 Cores

| Token | Valor | Uso obrigatório |
| --- | --- | --- |
| `bg` | `#faf9f5` | Fundo geral |
| `surface-1` | `#f5f0e8` | Sidebar e painéis |
| `surface-2` | `#efe9de` | Campos e superfície elevada |
| `surface-hover` | `#e8e0d2` | Hover neutro |
| `border-subtle` | `#ded7cd` | Divisores decorativos |
| `border-control` | `#82766b` | Contornos necessários para identificar controles |
| `text-primary` | `#141413` | Valores e títulos |
| `text-secondary` | `#3d3d3a` | Descrições e labels |
| `text-muted` | `#625f58` | Metadados; nunca esconder informação essencial |
| `accent` | `#994c34` | Seleção, link e destaque de marca |
| `accent-hover` | `#93452e` | Hover da ação primária |
| `accent-active` | `#803c28` | Ação pressionada |
| `on-accent` | `#faf9f5` | Texto/ícone claro sobre accent |
| `accent-subtle` | `#f2e0d7` | Fundo de item selecionado |
| `success` / `success-subtle` | `#27634d` / `#e0eee7` | Confirmação e condição positiva explicitamente definida |
| `danger` / `danger-subtle` | `#a13232` / `#fae9e5` | Erro, consequência destrutiva ou condição negativa definida |
| `warning` / `warning-subtle` | `#775500` / `#f6edce` | Atenção e informação parcial |
| `info` / `info-subtle` | `#315e79` / `#e5eef2` | Informação contextual |
| `focus` | `#93452e` | Contorno de foco |
| `overlay` | `rgb(0 0 0 / 64%)` | Fundo de modal |

Pares aprovados para texto: primary, secondary e muted sobre bg/surface-1/surface-2; on-accent sobre accent/hover/active; texto semântico sobre seu fundo subtle. Não usar accent-subtle como cor de texto. Bordas decorativas não identificam campos sozinhas. Novas combinações, opacidades e estados devem ter contraste verificado antes de uso.

### 4.2 Espaçamento, forma e elevação

| Família | Valores | Aplicação |
| --- | --- | --- |
| Espaçamento | 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 px | Base de 4 px; tokens `space-0` a `space-10` |
| Radius | 6, 8, 12, 16 px e 999 px | Badge; controle; painel; modal; pill/avatar |
| Borda | 1 px | Painéis, campos, divisores |
| Foco | 2 px, offset 3 px | Contorno externo visível |
| Sombra popover | `0 8px 24px rgb(0 0 0 / 32%)` | Menu e popover |
| Sombra modal | `0 24px 64px rgb(0 0 0 / 48%)` | Diálogo |
| Z-index | 0 / 10 / 20 / 30 / 40 / 50 | Base / sticky / dropdown / overlay / modal / toast |

Não usar radius de 20–28 px em todos os blocos. A forma deve ajudar a distinguir um controle, um agrupamento e uma camada temporária.

### 4.3 Movimento

Feedback de hover: 120 ms; mudança de estado: 180 ms; entrada de camada: 240 ms. Curva padrão: `cubic-bezier(0.2, 0, 0, 1)`. Animar somente opacity e transform quando necessário; evitar animação de números financeiros, barras crescendo, contadores e transições que atrasam a leitura. Skeleton deve ser estático. `prefers-reduced-motion: reduce` remove movimento não essencial.

## 5. Tipografia

Títulos h1/h2/h3 usam Poppins (500); textos, controles e números usam Roboto (400/500/600). Ambas as famílias usam `next/font/google`, subsets latin/latin-ext e `display: swap`: os arquivos são obtidos no build e servidos pelo próprio aplicativo, sem chamada ao Google durante a navegação. Fallback: Arial/system-ui. As fontes Trial anteriores foram removidas a pedido do usuário.

| Estilo/token | Tamanho / entrelinha | Peso | Uso |
| --- | --- | --- | --- |
| `display` | 40 / 48 px | 500 | Apresentação excepcional; não usar na Home |
| `h1` | 36 / 44 px | 500 | Um título principal por página |
| `h2` | 20 / 28 px | 500 | Seção de conteúdo |
| `h3` | 16 / 24 px | 500 | Subgrupo ou painel |
| `body` | 14 / 22 px | 400 | Descrição, tabelas e formulários |
| `label` | 13 / 20 px | 500 | Label e botão |
| `caption` | 12 / 18 px | 400 | Metadados e eixos |
| `metric` | 32 / 40 px | 500 | KPI financeiro |
| `metric-compact` | 24 / 32 px | 500 | KPI em viewport estreito |

Pesos permitidos: 400, 500 e 600. Não usar 800/900 em conteúdo financeiro. Títulos e métricas podem usar tracking `-0.02em`; corpo usa 0. Não usar caixa alta em parágrafos, títulos de painéis ou labels de formulário. Uma pequena identificação de seção pode usar caption, tracking `0.04em`.

Valores financeiros usam `font-variant-numeric: tabular-nums lining-nums`. Tabelas alinham números à direita e descrições à esquerda. Não usar fonte monoespaçada por padrão. Valores não devem ter ellipsis; para números extensos, permitir linha própria e fallback de tamanho metric-compact. Labels podem quebrar linha; textos essenciais não dependem de tooltip.

## 6. Grid e AppShell

### 6.1 Estrutura

`AppShell` organiza sidebar, topbar e um único landmark `main`. Navegação fica fora de `main`. Incluir link “Pular para o conteúdo”. O conteúdo deve ocupar a largura disponível, limitado a 1440 px, centralizado dentro da área após a sidebar.

Sidebar expandida: 240 px; recolhida: 72 px. Topbar: mínimo de 64 px, altura flexível para quebra de texto. Sidebar pode ser sticky e ter rolagem própria sem impedir acesso a “Sair”. Não fixar a altura de conteúdo da página. PageHeader contém h1, descrição opcional, período e ações.

Grid desktop: 12 colunas `minmax(0, 1fr)`, gap de 24 px. Padding do conteúdo: 32 px. Seções: 32 px entre si; heading para conteúdo: 16 px; elementos relacionados: 8–12 px. Em tabelas, usar densidade própria em vez de aumentar o número de painéis.

### 6.2 Breakpoints normativos

| Largura CSS | Navegação | Grid / padding / gap | KPIs |
| --- | --- | --- | --- |
| 320–639 px | Drawer acionado por “Abrir navegação” | 1 coluna / 16 / 16 px | 1 por linha |
| 640–1023 px | Drawer | 6 colunas / 24 / 16 px | 2 por linha |
| 1024–1279 px | Sidebar recolhida | 12 colunas / 24 / 24 px | 2 por linha |
| ≥1280 px | Sidebar expandida; opção de recolher | 12 colunas / 32 / 24 px | 4 por linha |

Os limites pertencem a media queries; custom properties não podem substituir diretamente os valores nas condições. A preferência de sidebar só vale onde há espaço; no mobile o drawer prevalece.

### 6.3 Navegação oficial

| Nome visível | Rota existente | Grupo |
| --- | --- | --- |
| Visão geral | `/` | Principal |
| Finanças | `/finance` | Principal |
| Planejamento | `/planning` | Principal |
| Objetivos | `/goals` | Principal |
| Segurança financeira | `/resilience` | Análise |
| Dívidas | `/debts` | Análise |
| Patrimônio | `/net-worth` | Análise |
| Projeções | `/forecast` | Análise |
| Comportamento | `/behavior` | Análise |
| Automação | `/automation` | Rotinas |

Usar ícone + texto quando expandida; recolhida mantém nome acessível e tooltip. Item ativo tem fundo accent-subtle, texto accent e marcador lateral; `aria-current="page"`. Não oferecer “Configurações” como destino até existir rota funcional. Ações futuras ficam fora da navegação operacional.

## 7. Home dashboard: contrato de arquitetura

### 7.1 Ordem e hierarquia

1. **PageHeader:** “Visão geral”, período explícito, seletor de mês e ação “Registrar lançamento” para o fluxo existente de Finanças. Saudação é opcional e secundária. Perfil e ocultação de valores ficam em ações utilitárias; não criar sino sem notificações reais.
2. **Contexto:** indicador de mês aberto/fechado e leitura parcial quando aplicável. Exibir apenas estado conhecido pelo domínio.
3. **Faixa de KPIs:** Saldo realizado, Receitas, Despesas e Saldo previsto. Esta ordem prioriza o que aconteceu; não somar patrimônio com fluxo mensal. Quatro métricas podem compartilhar uma única superfície com divisores internos, sem quatro cards decorados.
4. **Análise principal:** fluxo financeiro (8 colunas) e orçamento do mês (4 colunas); abaixo de 1024 px, empilhar nessa ordem.
5. **Visão complementar:** patrimônio, objetivos, reserva e dívidas em seções compactas ou listas agrupadas. No desktop podem ocupar 6 + 6 colunas; não transformar cada indicador em painel separado.
6. **Atenção e revisão:** pendências acionáveis, revisão do comportamento e últimos lançamentos. Na Home limitar a três itens de atenção e cinco lançamentos; “Ver todos” abre o módulo correspondente.

```text
Sidebar | Visão geral             [Outubro de 2026] [Registrar lançamento]
        | Mês aberto · leitura parcial                [Ocultar valores]
        | Saldo realizado | Receitas | Despesas | Saldo previsto
        | Fluxo financeiro (8 col.)        | Orçamento do mês (4 col.)
        | Patrimônio e reserva (6 col.)    | Objetivos e dívidas (6 col.)
        | Atenção e revisão               | Últimos lançamentos
```

Esse desenho define agrupamento, não autoriza preencher lacunas com dados fictícios. Não existe exigência de caber tudo acima da dobra. Priorizar header, contexto, KPIs e início da análise na primeira tela.

### 7.2 Contratos dos blocos

| Bloco | Informação mínima | Ação / estado sem dados |
| --- | --- | --- |
| Saldo realizado | Valor, mês, significado de fluxo do período | Abrir Finanças; não rotular como saldo bancário |
| Receitas / Despesas | Valor realizado e referência planejada, se existente | Registrar lançamento; indicar cobertura conhecida |
| Saldo previsto | Valor do plano, mês e identificação “Previsto” | Sem plano: “Sem planejamento”, nunca `R$ 0,00` como previsão |
| Fluxo financeiro | Receitas/despesas, realizado/planejado, unidade e período | Sem histórico suficiente: comparação mensal existente; sem plano, omitir série planejada |
| Orçamento | Realizado, limite planejado, disponibilidade e percentual recebido do domínio | “Defina o orçamento deste mês” com link para Planejamento |
| Patrimônio | Posição e data de referência, distinta do mês de fluxo | “Cadastre ativos e passivos”; sem série, não inventar variação |
| Objetivos | Nome, progresso, prazo e estado do domínio | “Crie seu primeiro objetivo” |
| Reserva | Valor e cobertura somente se calculados e disponíveis | Explicar qual dado falta em Segurança financeira |
| Dívidas | Total e compromisso do domínio com referência temporal | Distinguir lista vazia confirmada de erro na consulta |
| Atenção | Fato, período, motivo e destino para ação | Sem pendências confirmadas: texto neutro, sem score de saúde inventado |
| Revisão | Leitura descritiva, baseline e cobertura | Link para Comportamento; não diagnosticar hábitos |

### 7.3 Período e disponibilidade

O seletor deve refletir o mês na URL e nos blocos mensais. Na implementação futura, usar a convenção `month=YYYY-MM` dos módulos existentes e os helpers de calendário. A Home implementada aceita `month=YYYY-MM`. Finanças permanece no mês atual; links da Home explicitam esse destino, sem simular seleção histórica.

Patrimônio é uma posição em data específica; objetivos podem ter horizonte próprio. Blocos que não seguem o mês selecionado devem exibir sua referência. Histórico de 6 ou 12 meses só deve aparecer quando consultado e validado. Não interpolar meses ausentes como zero.

Cada bloco deve declarar `loading`, `ready`, `empty`, `unavailable` ou `error`, com indicador adicional de parcial/desatualizado quando conhecido. Dependências ausentes impedem o KPI derivado; erro em um módulo independente não deve esconder dados válidos dos outros. Não renderizar um agregado parcial como completo.

## 8. Componentes: contratos de uso

### 8.1 Estrutura e dados

| Componente alvo | Variantes/propriedades | Aparência e comportamento | Acessibilidade |
| --- | --- | --- | --- |
| `AppShell` | children, navegação | Responsividade da seção 6; preserva scroll por página quando apropriado | Skip link, nav rotulada, um main |
| `Sidebar` | active, expanded, onToggle | Item 44 px mínimo; grupos com 24 px de separação; transição sem deslocar foco | Links reais; toggle com `aria-expanded` e nome |
| `PageHeader` | title, description, period, actions | h1 + contexto; ações quebram linha; não usar hero promocional | Ordem semântica segue ordem visual |
| `SectionHeader` | title, description, action | h2/h3 segundo hierarquia; ação à direita no desktop | Não saltar níveis de heading |
| `Card` | plain, outlined | surface-1, radius 12, padding 24 desktop/16 mobile; não clicável por padrão | Section com título ou div de agrupamento |
| `MetricCard` | label, value, context, comparison, state | Valor neutro; contexto explícito; sem ícone decorativo grande | Nome e valor legíveis em sequência |
| `ChartCard` | title, period, unit, legend, state | Header + plot + fonte/tabela; mínimo de 240 px para área do plot | Figure/caption e alternativa tabular |
| `Badge` | neutral, accent | Informação curta, 12/18 px, padding 4 × 8, radius 6 | Não é botão; texto não depende da cor |
| `StatusBadge` | success, warning, danger, info, neutral | Estado recebido do domínio com texto e ícone opcional | Não criar estado pelo sinal de um valor |
| `ProgressBar` | value, max, label, displayValue | Trilha 8 px, radius pill; cor conforme contexto | `progress` para progresso limitado; uso financeiro conforme seção 9 |
| `DataTable` | columns, rows, sort, pagination, density | Cabeçalho 40 px; linha 48 px; compacta 40 px só em desktop; números à direita | Table/caption/th; `aria-sort` quando ordenável |
| `Tabs` | items, selected, onChange | Indicador accent e labels curtos; não esconder conteúdo essencial | Setas/Home/End; tablist/tab/tabpanel; Tab sai do grupo |

Tabs que apenas navegam entre rotas devem ser links, com `aria-current`, sem simular um tablist. Tabelas de leitura não devem virar um grid ARIA sem necessidade. Ordenação deve operar no conjunto declarado; se for só a página carregada, comunicar isso. Paginação informa intervalo e total quando conhecidos.

### 8.2 Ações

`Button` tem variantes `primary`, `secondary`, `ghost` e `danger`. Primary usa accent sólido/on-accent; secondary usa surface-2 e border-control; ghost é transparente com hover surface-hover; danger usa danger-subtle, texto danger e borda danger. Não usar verde para todo botão de receita ou vermelho para todo botão de despesa.

Tamanhos: sm 36 px, md 44 px (padrão), lg 48 px; padding horizontal 12/16/20 px. Em toque, alvo de todos os tamanhos deve atingir 44 × 44 px com área adicional quando necessário. Ícone + label: gap 8 px. `IconButton`: 44 × 44 px padrão e ícone 20 px.

| Estado | Regra |
| --- | --- |
| Default | Variante e label de verbo: “Salvar planejamento” |
| Hover | Primary accent-hover; demais surface-hover ou fundo semântico da variante; não mover |
| Active | Primary accent-active; demais mantêm superfície e destacam contorno; não reduzir escala |
| Focus-visible | Contorno focus 2 px / offset 3 px, independente de hover |
| Disabled | Superfície neutra, texto muted, cursor adequado; explicar a condição junto à ação |
| Loading | Preservar largura, label específico “Salvando…”; impedir envio duplicado e anunciar estado |
| Error | Mensagem junto ao contexto; permitir nova tentativa quando segura |

Botão executa ação; link navega. Toda ação sem submissão deve ter `type="button"`. Não aninhar botão em link nem tornar um painel inteiro clicável se contém outras ações. A Home pode ter sua ação principal e links secundários nos módulos; evitar uma ação roxa em cada painel.

### 8.3 Formulários

| Componente | Dimensão e variantes | Contrato |
| --- | --- | --- |
| `Input` | Altura 44 px, radius 8, padding 12; default/error/readOnly/disabled | Label visível, unidade e ajuda; tipo e inputMode conforme dado |
| `Select` | Mesmo campo; nativo preferido | Opção vazia explícita; não salvar automaticamente uma escolha com consequência financeira |
| `Textarea` | Mínimo 112 px, resize vertical | Label e limite somente se existir no domínio |
| `Checkbox` | Visual 20 px, alvo 44 px | Rótulo clicável; Space alterna; indeterminate somente para seleção parcial real |
| `Radio` | Visual 20 px, alvo 44 px | Agrupamento por fieldset/legend; setas entre opções |
| `Switch` | Alvo 44 px, trilha 36 × 20 px | Apenas configuração binária; estado e consequência explícitos; não substituir confirmação |
| `Field` | Gap 8 px; erro/ajuda 12/18 px | Vincular label/id, `aria-describedby`; erro com `aria-invalid` |

Campos usam surface-2, texto primary, label secondary e border-control. Hover não muda significado; foco mantém borda e contorno; erro usa borda danger, ícone e texto; readOnly mantém legibilidade e permite cópia; disabled não implica que o valor é zero. Placeholder é exemplo, nunca label. Não reduzir a opacidade do grupo inteiro para indicar bloqueio.

Agrupar campos relacionados com gap 16 px. No desktop, duas colunas só para campos curtos; descrição, mensagens e confirmação ocupam largura completa. No mobile, uma coluna. Após envio inválido, preservar valores e focar o resumo de erros ou primeiro campo inválido. Manter validação autoritativa no servidor.

### 8.4 Camadas e feedback

| Componente | Contrato visual e funcional |
| --- | --- |
| `Dialog` | Surface-2, radius 16, largura 480 px padrão/640 px ampla, máximo viewport menos 32 px; título, consequência, cancelar e confirmar; rolagem interna se necessário |
| `Drawer` | Navegação mobile de até 320 px e no máximo viewport menos 32 px; mesmo comportamento modal de foco |
| `DropdownMenu` | Surface-2, radius 8, shadow-popover, item mínimo 44 px; seleção por teclado e retorno ao acionador |
| `Tooltip` | Caption, surface-2, texto primary; aparece em hover e foco; nunca guarda erro ou explicação obrigatória |
| `Alert` | Fundo subtle, título curto, texto e ação; persistente enquanto condição for relevante; sem banner global para erro local |
| `Toast` | Confirmação curta e secundária; sucesso pode sumir após 5 s com pausa em hover/foco; erro requer saída explícita ou mensagem persistente no contexto |
| `EmptyState` | Título factual, uma frase e ação pertinente; sem gráfico ilustrativo com números |
| `Skeleton` | Forma aproximada do conteúdo, estático; contêiner anuncia carregamento uma vez |

Diálogo mantém foco dentro, aceita Escape quando cancelável e retorna foco ao acionador. A ação financeira irreversível não pode fechar por clique no overlay; cancelar é explícito. Mensagens informativas usam anúncio não intrusivo; erro urgente usa anúncio prioritário sem repetir a cada renderização. Camadas não devem esconder o elemento focado.

## 9. Visualização de dados

### 9.1 Escolha e encodings

| Pergunta | Visual permitido | Regras |
| --- | --- | --- |
| Planejado versus realizado | Barras agrupadas | Mesma escala, origem zero e labels; planejado contorno/hachura, realizado sólido |
| Evolução mensal | Linha com pontos discretos | Ordem cronológica; lacunas interrompem a linha; projeção tracejada identificada |
| Categorias com maior despesa | Barras horizontais | Ordem decrescente, desempate estável; “Outras” com composição disponível |
| Uso de orçamento | Barra limitada + texto | Mostrar realizado e limite; acima de 100% informar excedente explicitamente |
| Patrimônio ao longo do tempo | Linha | Data de posição; incluir zero quando o cruzamento de sinal for relevante |
| Composição | Barras empilhadas | Total e partes claros; não usar para saldos negativos ou misturar moedas |

Não usar 3D, velocímetro, radar, dupla escala, sombras de séries ou donuts como padrão. Um gráfico de linha pode ter eixo não iniciado em zero se os limites estiverem visíveis e a amplitude não induzir interpretação enganosa. Barras comparativas sempre partem de zero, incluindo região negativa quando houver valores assinados.

### 9.2 Paleta de gráficos

Séries categóricas, nesta ordem: `#b7664c`, `#357f70`, `#94621e`, `#a45576`, `#426b83`, `#72685f`. No contexto inverso, as duas primeiras séries usam `ink-chart-1` e `ink-chart-2`. Usar até seis séries; acima disso, agrupar ou oferecer seleção. Associar a cor à chave estável da categoria; não reassociar quando ordenar.

Receitas: success; despesas: danger; saldo: accent. Esses pares identificam tipos de fluxo e não aprovam/reprovam decisões. Usar também legenda, posição e padrão. Planejado e realizado do mesmo tipo compartilham cor, mas diferem por tracejado/contorno e label. Grid usa border-subtle; eixos usam text-muted; área usa surface-1.

Linha: 2 px; marcador: 4 px; barras: mínimo de 8 px quando visíveis, sem forçar comprimento positivo para zero; grid horizontal de 1 px com quatro a seis referências. Não suavizar linhas de forma a inventar máximos/mínimos. Área preenchida é opcional e não carrega informação sozinha.

### 9.3 Interação e integridade

- Todo gráfico deve exibir título, unidade, período, legenda e fonte ou método em texto simples.
- Tooltip apresenta período, nome da série e valor exato. Disponibilizar os mesmos dados por teclado e por tabela acessível; tooltip não é a única fonte.
- Em telas estreitas, reduzir ticks, nunca a série de dados sem declarar agregação. Não remover silenciosamente meses ou categorias.
- Separar valores realizados, planejados e projetados. Não mostrar projeção como histórico; “cenário provável histórico” conserva o significado do motor, sem probabilidade estatística inventada.
- Não desenhar dados em loading, erro ou ausência. Amostras demonstrativas só são permitidas em ambiente explicitamente identificado de demonstração, isolado dos valores reais.
- Um percentual excedido pode ter trilha visual saturada em 100%, mas o texto preserva `125%`, por exemplo. Usar medidor com texto equivalente; não declarar `aria-valuenow=125` para uma barra com máximo 100.
- Denominador zero ou ausente não gera percentual infinito ou 0% artificial. Exibir “Sem limite definido” ou indisponibilidade conforme a condição recebida.

## 10. Apresentação de dados financeiros

### 10.1 Formatação e significado

| Dado | Regra |
| --- | --- |
| BRL | Reutilizar `formatBRL` para valores válidos: `R$ 1.234,56`; duas casas decimais |
| Negativo | Preservar sinal: `-R$ 250,00`; não remover sinal pela cor |
| Despesa armazenada positiva | Mostrar tipo “Despesa” e valor; não inverter o dado de origem para criar saldo |
| Percentual | Apresentação com uma casa decimal quando pertinente: `12,5%`; precisão não muda cálculo |
| Variação percentual | Indicar base e sentido; aumento de despesa não é sucesso automático |
| Ponto percentual | Usar `p.p.` quando diferença entre taxas; não confundir com variação relativa |
| Data civil | `dd/mm/aaaa` com helper existente; não deslocar dia por conversão de fuso |
| Mês | “Outubro de 2026”; URL/chave interna `2026-10` |
| Data de atualização | Apenas timestamp real conhecido; não exibir horário atual como se fosse última atualização |
| Valores abreviados | `R$ 1,2 mi` somente em eixo ou resumo secundário; KPI, tabela e confirmação usam valor completo |

O mês corrente segue `America/Sao_Paulo` nos helpers existentes; intervalos mantêm o início inclusivo e o fim exclusivo. Moeda diferente de BRL exige seu código e formatter apropriado; não converter nem somar moedas diferentes por apresentação.

Formatação não faz cálculo de domínio. Não introduzir arredondamento antes de agregação, parsing monetário novo ou alteração de precisão em componentes. A entrada monetária deve usar o parser e as validações aprovados pelo projeto, explicando o formato esperado e preservando a entrada em erro.

### 10.2 Ausência, zero e cobertura

- Zero confirmado: `R$ 0,00`.
- Sem plano: “Sem planejamento”, com ação correspondente.
- Dado ausente: “Não informado” ou `—` acompanhado de explicação acessível.
- Consulta com erro: “Não foi possível carregar”, com tentativa quando disponível.
- Histórico insuficiente: “Histórico insuficiente para comparar”.
- Mês em andamento: “Leitura parcial do mês”, sem prometer valor final.
- Dados anteriores durante atualização: preservar apenas com período original e estado “Atualizando”; nunca trocar o cabeçalho para novo mês sobre valores antigos.

`numberValue` e `formatBRL` hoje fazem fallback para zero. Componentes futuros devem receber disponibilidade separada e decidir o estado **antes** de formatar. Este contrato não manda alterar esses helpers ou redefinir a semântica dos cálculos existentes.

Não apresentar saldo realizado mensal como saldo da conta, patrimônio como renda disponível, aporte como receita ou meta como obrigação vencida sem a condição do domínio. Taxas e comparações não podem usar bases inferidas da aparência.

### 10.3 Proteções financeiras existentes

Meses fechados permanecem imutáveis; a UI deve mostrar “Mês fechado” e explicar o bloqueio. Não oferecer “Reabrir mês” ou desfazer fechamento. Recorrências são versionadas somente nos períodos permitidos; a edição deve informar a vigência recebida. Lançamentos automáticos não recebem exclusão individual se a regra não permite. Sincronização mantém idempotência; o layout não deve provocar novas mutações para preencher um gráfico.

Baselines de comportamento e projeção mantêm os períodos e critérios existentes. Ausência de receita histórica não se torna renda zero. Sinais respeitam os limites configurados; este documento não cria faixas de “bom”, “ruim” ou risco por percentuais arbitrários.

Confirmação de fechamento deve incluir mês, consequência definitiva e revisão dos dados pertinentes. Exemplo de copy: “Fechar outubro de 2026? Após o fechamento, os lançamentos e o planejamento deste período não poderão ser alterados.” A confirmação não substitui as travas do servidor.

### 10.4 Privacidade de apresentação

Oferecer “Ocultar valores” como preferência visual futura. Quando ativa, usar “Valor oculto” como nome acessível e máscara consistente, inclusive em KPIs, tabelas, eixos, tooltips e resumos. Números devem ser removidos do conteúdo visual e acessível renderizado, não apenas borrados por CSS. Não renderizar o valor real em title ou atributos auxiliares. Essa preferência não é controle de acesso; autenticação, RLS e isolamento de usuário continuam obrigatórios. Não esconder erro ou bloqueio junto com os valores.

## 11. Estados e feedback de página

| Estado | Apresentação | Ação permitida |
| --- | --- | --- |
| Carregando | Skeleton estático e contexto do que carrega | Evitar edição de dado ainda desconhecido |
| Vazio confirmado | Mensagem específica do recurso | Criar/registrar quando permitido |
| Sem resultado de filtro | “Nenhum lançamento neste filtro” | Limpar filtros; não pedir cadastro inicial |
| Dados incompletos | Aviso contextual, cobertura e valores válidos | Completar dados; não criar diagnósticos |
| Erro local | Mensagem no bloco; demais blocos independentes continuam | Tentar novamente |
| Erro de página | Título claro e recuperação; sem stack trace | Recarregar/voltar ao contexto |
| Sem sessão | Fluxo de login existente | Não mostrar dados antigos de outro usuário |
| Sem permissão | Explicação coerente com autorização real | Não oferecer ação bloqueada |
| Salvando | Bloquear envio duplicado e manter conteúdo | Aguardar; não afirmar sucesso antecipado |
| Sucesso | Confirmação contextual, dado atualizado | Prosseguir; desfazer só quando permitido |
| Falha ao salvar | Preservar entrada e mostrar erro | Corrigir ou tentar novamente |
| Mês fechado | Badge neutro/info e leitura preservada | Consultar; nenhuma edição permitida |
| Desatualizado/offline | Explicar somente se detectado | Não afirmar que salvou localmente sem suporte |

Não misturar conteúdo de usuários ou períodos durante navegação. Estados vazios de toda a Home usam um único convite inicial com passos simples, em vez de repetir dez mensagens de cadastro. Skeletons devem reservar espaço aproximado sem fixar alturas que cortem conteúdo depois.

## 12. Responsividade e densidade

Mobile deve manter a ordem semântica da Home. Header quebra linha; seletor e ação são acessíveis sem rolagem horizontal. Drawer substitui sidebar e não ocupa permanentemente 72 px em telas estreitas. Utilizar safe area quando houver barra fixa, evitando sobrepor conteúdo.

Tabelas amplas podem ter scroll horizontal localizado, com indicação e região acessível nomeada. Nunca causar scroll horizontal na página inteira. Para listas de lançamentos, uma apresentação vertical pode mostrar descrição, data, tipo, valor e ações com os mesmos dados; não ocultar montante, sinal ou período. Evitar renderizar duas cópias acessíveis simultâneas.

Gráficos adaptam legenda e ticks; alternativa tabular permanece disponível. Formulários usam uma coluna abaixo de 640 px. Dialogs e drawers respeitam teclado virtual e altura disponível com `dvh`/scroll interno. Não travar orientação nem reduzir fonte para fazer um layout caber.

Larguras de revisão: 320, 375, 640, 768, 1024, 1280 e 1440 px, incluindo textos longos, valores de milhões e aumento de texto. A 200% de zoom a tarefa continua executável; a 400% a página reorganiza o conteúdo, ressalvadas tabelas/gráficos que precisem de duas dimensões.

## 13. Acessibilidade

Meta: WCAG 2.2 AA. Critérios de aceite deste contrato:

- Contraste de texto ≥4,5:1; texto grande ≥3:1; controles e informação gráfica essencial ≥3:1.
- Toda ação opera por teclado, com foco visível e não encoberto; ordem de leitura coerente.
- Labels persistentes, erros vinculados e nomes acessíveis específicos; idioma `pt-BR`.
- Gráficos têm equivalente textual/tabular; cor nunca comunica sozinha.
- Tooltips funcionam em foco, podem ser dispensados e não ocultam informação obrigatória.
- Mudanças de status são anunciadas sem deslocar foco desnecessariamente.
- Autenticação permite colar e usar gerenciadores de senha.

Referências: [WCAG 2.2 — referência rápida](https://www.w3.org/WAI/WCAG22/quickref/) e [WAI-ARIA APG — padrões](https://www.w3.org/WAI/ARIA/apg/patterns/). Usar HTML nativo antes de ARIA. Padrões de teclado dos componentes devem seguir o APG aplicável.

O alvo interno de toque é 44 × 44 px, inclusive em linhas compactas. Contraste validado em tokens não certifica a aplicação inteira: cada composição, estado, transparência e interação deve ser revisada. Não remover outline sem substituto. Respeitar `forced-colors` e movimento reduzido. Verificar tarefas reais com teclado e leitor de tela além de verificações automáticas.

## 14. Microcopy

Usar português brasileiro, voz direta e capitalização de frase. “Planejado” é valor de plano; “Realizado” é observado no período; “Projetado” é resultado de cenário; “Previsto” deve ter fonte explícita. Não alternar “gasto”, “despesa” e “saída” para o mesmo campo sem motivo; usar “Despesas” nos indicadores principais.

| Contexto | Texto recomendado | Evitar |
| --- | --- | --- |
| Navegação | “Planejamento”, “Projeções” | “MVP 2”, “Motor v7” |
| Ação | “Registrar despesa”, “Salvar planejamento” | “OK”, “Executar” |
| Vazio | “Nenhuma despesa registrada neste mês.” | “Você não controla seus gastos.” |
| Sem plano | “Defina receitas e limites para comparar o mês.” | Mostrar previsão zero |
| Erro | “Não foi possível salvar. Seus dados preenchidos foram mantidos.”, se verdadeiro | Mensagem técnica ou culpa do usuário |
| Parcial | “O mês está em andamento. A comparação usa os lançamentos registrados até agora.” | “Você gastará…” |
| Sucesso | “Planejamento salvo.” | “Sua vida financeira está resolvida!” |
| Bloqueio | “Este mês está fechado e não pode ser alterado.” | Botão cinza sem explicação |
| Projeção | “Cenário com base nos períodos selecionados.” | Garantia de resultado |
| Comportamento | “Despesas acima da média do período de referência.” | “Você perdeu o controle.” |

Mensagens devem declarar o que ocorreu e a próxima ação possível. Confirmações incluem objeto e consequência; “Excluir objetivo?” é preferível a “Tem certeza?”. Não oferecer desfazer se o domínio não permite. Datas e dinheiro nos exemplos de UI só entram quando correspondem ao contexto real.

## 15. Tokens CSS oficiais propostos

Este bloco reflete os tokens da implementação editorial 3.1. O arquivo globals.css é a fonte executável; `.ds-inverse` reatribui os mesmos nomes semânticos às cores de tinta.

```css
:root {
  color-scheme: light;
  --ds-bg: #faf9f5;
  --ds-surface-1: #f5f0e8;
  --ds-surface-2: #efe9de;
  --ds-surface-hover: #e8e0d2;
  --ds-border-subtle: #ded7cd;
  --ds-border-control: #82766b;
  --ds-text-primary: #141413;
  --ds-text-secondary: #3d3d3a;
  --ds-text-muted: #625f58;
  --ds-accent: #994c34;
  --ds-accent-hover: #93452e;
  --ds-accent-active: #803c28;
  --ds-on-accent: #faf9f5;
  --ds-accent-subtle: #f2e0d7;
  --ds-success: #27634d;
  --ds-success-subtle: #e0eee7;
  --ds-danger: #a13232;
  --ds-danger-subtle: #fae9e5;
  --ds-warning: #775500;
  --ds-warning-subtle: #f6edce;
  --ds-info: #315e79;
  --ds-info-subtle: #e5eef2;
  --ds-focus: #93452e;
  --ds-overlay: rgb(0 0 0 / 64%);
  --ds-chart-1: #b7664c;
  --ds-chart-2: #357f70;
  --ds-chart-3: #94621e;
  --ds-chart-4: #a45576;
  --ds-chart-5: #426b83;
  --ds-chart-6: #72685f;

  --ds-font-sans: var(--font-roboto), ui-sans-serif, system-ui, -apple-system,
    BlinkMacSystemFont, "Segoe UI", sans-serif;
  --ds-font-display: var(--font-poppins), ui-sans-serif, system-ui, sans-serif;
  --ds-brand-coral: #cc785c;
  --ds-ink: #181715;
  --ds-ink-elevated: #252320;
  --ds-ink-hover: #35312d;
  --ds-on-ink: #faf9f5;
  --ds-on-ink-secondary: #d7d0c7;
  --ds-on-ink-muted: #b8b0a5;
  --ds-ink-border: #514b44;
  --ds-ink-border-control: #a69b8e;
  --ds-ink-accent: #e4a48b;
  --ds-ink-accent-subtle: #3d2b24;
  --ds-ink-success: #91c7a8;
  --ds-ink-success-subtle: #23372d;
  --ds-ink-danger: #edb0a7;
  --ds-ink-danger-subtle: #412824;
  --ds-ink-warning: #e4c182;
  --ds-ink-warning-subtle: #3a3020;
  --ds-ink-info: #abcbd9;
  --ds-ink-info-subtle: #24333b;
  --ds-ink-chart-1: #e4a48b;
  --ds-ink-chart-2: #7db9a5;
  --ds-weight-regular: 400;
  --ds-weight-medium: 500;
  --ds-weight-semibold: 600;
  --ds-text-display: 2.5rem;
  --ds-leading-display: 3rem;
  --ds-text-h1: 2.25rem;
  --ds-leading-h1: 2.75rem;
  --ds-text-h2: 1.25rem;
  --ds-leading-h2: 1.75rem;
  --ds-text-h3: 1rem;
  --ds-leading-h3: 1.5rem;
  --ds-text-body: 0.875rem;
  --ds-leading-body: 1.375rem;
  --ds-text-label: 0.8125rem;
  --ds-leading-label: 1.25rem;
  --ds-text-caption: 0.75rem;
  --ds-leading-caption: 1.125rem;
  --ds-text-metric: 2rem;
  --ds-leading-metric: 2.5rem;
  --ds-text-metric-compact: 1.5rem;
  --ds-leading-metric-compact: 2rem;
  --ds-tracking-heading: -0.02em;
  --ds-tracking-body: 0;
  --ds-tracking-eyebrow: 0.04em;

  --ds-space-0: 0;
  --ds-space-1: 0.25rem;
  --ds-space-2: 0.5rem;
  --ds-space-3: 0.75rem;
  --ds-space-4: 1rem;
  --ds-space-5: 1.25rem;
  --ds-space-6: 1.5rem;
  --ds-space-7: 2rem;
  --ds-space-8: 2.5rem;
  --ds-space-9: 3rem;
  --ds-space-10: 4rem;
  --ds-radius-badge: 0.375rem;
  --ds-radius-control: 0.5rem;
  --ds-radius-panel: 0.75rem;
  --ds-radius-modal: 1rem;
  --ds-radius-pill: 999px;
  --ds-border-width: 1px;
  --ds-focus-width: 2px;
  --ds-focus-offset: 3px;
  --ds-shadow-popover: 0 8px 24px rgb(0 0 0 / 32%);
  --ds-shadow-modal: 0 24px 64px rgb(0 0 0 / 48%);

  --ds-content-max: 1440px;
  --ds-sidebar-expanded: 240px;
  --ds-sidebar-collapsed: 72px;
  --ds-topbar-min: 64px;
  --ds-control-sm: 36px;
  --ds-control-md: 44px;
  --ds-control-lg: 48px;
  --ds-touch-target: 44px;
  --ds-icon-sm: 16px;
  --ds-icon-md: 20px;
  --ds-table-head: 40px;
  --ds-table-row: 48px;
  --ds-table-row-compact: 40px;
  --ds-progress-height: 8px;
  --ds-chart-min-height: 240px;
  --ds-dialog-width: 480px;
  --ds-dialog-width-wide: 640px;
  --ds-drawer-width: 320px;

  --ds-z-base: 0;
  --ds-z-sticky: 10;
  --ds-z-dropdown: 20;
  --ds-z-overlay: 30;
  --ds-z-modal: 40;
  --ds-z-toast: 50;
  --ds-motion-fast: 120ms;
  --ds-motion-standard: 180ms;
  --ds-motion-layer: 240ms;
  --ds-ease-standard: cubic-bezier(0.2, 0, 0, 1);
}
```

Escalas em rem assumem 16 px como tamanho padrão, sem sobrescrever a preferência do navegador. Dimensões de controle são mínimas; texto ampliado pode aumentar sua altura. Componentes animados devem aderir a `ds-animated` ou aplicar regra equivalente de movimento reduzido.

## 16. Mapeamento para React e migração

### 16.1 Organização proposta

```text
src/components/ui/          Button, IconButton, Field, Badge, Dialog, ...
src/components/layout/      AppShell, PageHeader, SectionHeader
src/components/dashboard/   MetricCard, ChartCard e blocos da Home
src/components/sidebar.tsx  componente existente, migrado em etapa própria
src/components/submit-button.tsx  integração existente com formulário
src/app/globals.css         tokens, base e estilos compartilhados
src/lib/                    domínio existente; não mover cálculo para UI
```

Não introduzir Tailwind, biblioteca de charts ou kit de componentes como requisito implícito. CSS existente pode implementar o contrato; novas dependências precisam de decisão separada.

Server Components devem continuar responsáveis por consultas autenticadas e composição de dados. Client Components devem ser limitados a interação que precisa de estado/eventos, como drawer, tabs, seletor com navegação e ocultação de valores. Não serializar dados sensíveis extras apenas para desenhar uma métrica. Manter Server Actions e validações existentes.

### 16.2 APIs propostas

```tsx
// Contratos de tipos para implementação futura; não são exports atuais.
type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type FinancialDisplayState =
  | { status: "loading" }
  | { status: "empty"; message: string }
  | { status: "unavailable"; reason: string }
  | { status: "error"; message: string }
  | {
      status: "ready";
      formattedValue: string;
      referenceLabel: string;
      partial?: boolean;
      updatedAtLabel?: string;
    };

type MetricCardProps = {
  label: string;
  state: FinancialDisplayState;
  comparison?: { text: string; tone: Tone; baselineLabel: string };
  hidden?: boolean;
  detailsHref?: string;
};
```

O discriminador de disponibilidade evita usar zero como placeholder. `formattedValue` vem de adaptador que verificou disponibilidade e usa formatter existente. `comparison` só existe quando o domínio fornece base válida; `tone` não é inferido no componente pelo sinal de um número. A opção hidden governa todo conteúdo sensível, inclusive comparison e texto acessível.

Exemplo de composição futura, após implementar os componentes:

```tsx
<AppShell active="dashboard">
  <PageHeader title="Visão geral" periodLabel={monthLabel} />
  <section aria-label="Resumo financeiro" className="ds-kpi-strip">
    <MetricCard label="Saldo realizado" state={balanceDisplay} />
    <MetricCard label="Receitas" state={incomeDisplay} />
    <MetricCard label="Despesas" state={expenseDisplay} />
    <MetricCard label="Saldo previsto" state={planDisplay} />
  </section>
</AppShell>
```

`Button` deve estender atributos nativos de button; `IconButton` exige nome acessível; componentes de navegação usam Link. Variantes devem ser uniões fechadas, evitando combinações arbitrárias de `className` para aparência. Permitir classes apenas de layout ou extensão documentada. Field associa IDs estáveis; Card não muda a hierarquia de heading silenciosamente.

`SubmitButton` existente deve continuar integrado a `useFormStatus`, dentro do formulário correspondente. A futura migração pode compartilhar aparência com Button, preservando pending, disabled, action e labels específicos. Não substituir submissão por estado local que ignora a Server Action.

### 16.3 Aliases temporários

| Token existente | Token alvo | Observação |
| --- | --- | --- |
| `--bg` | `--ds-bg` | Fundo |
| `--surface` | `--ds-surface-1` | Painel |
| `--surface-2` | `--ds-surface-2` | Revisar contexto de cada consumidor |
| `--surface-3` | `--ds-bg` | Revisar profundidade; não preservar terceiro nível por hábito |
| `--text` | `--ds-text-primary` | Texto |
| `--muted` | `--ds-text-secondary` | Descrição |
| `--faint` | `--ds-text-muted` | Metadado |
| `--purple` / `--purple-2` | `--ds-accent` / `--ds-accent-hover` | Texto branco de botão deve migrar para on-accent |
| `--green` / `--red` / `--blue` | `--ds-success` / `--ds-danger` / `--ds-info` | Auditar significado |
| `--border` | `--ds-border-subtle` | Campos devem usar border-control explicitamente |

Aliases só são ponte de migração e não garantem conformidade. Remover gradientes, pseudo-elementos decorativos e estilos inline de aparência junto com a mudança do componente. Estilos inline de tamanho derivados de dados podem permanecer se forem válidos e acessíveis.

### 16.4 Sequência de adoção

1. Revisar e aprovar este contrato visual.
2. Implementar tokens/base, tipografia, foco e controles; validar pares de contraste.
3. Migrar AppShell, sidebar e PageHeader em todas as rotas.
4. Migrar Home com os dados já existentes; incluir novos resumos somente com fonte e disponibilidade verificadas.
5. Migrar módulos por contexto: formulários/tabelas, objetivos/reserva/dívidas, projeções/comportamento e automação.
6. Remover aliases e estilos antigos somente após todos os consumidores migrarem.

Cada etapa deve manter a aplicação utilizável e ter PR revisável. Não mudar regras financeiras para cumprir um mockup. Quando uma implementação tocar integração de domínio, executar os testes existentes pertinentes e checagem de tipos; uma PR exclusivamente documental não exige build de aplicação.

## 17. Consistência e governança

- Este arquivo é a referência visual central. Novo padrão reutilizável exige atualização do contrato antes ou junto da implementação.
- Tokens usam prefixo `ds`; componentes usam PascalCase; variantes usam nomes semânticos. Não criar `purpleCard`, `redButton2` ou cópias locais de Field.
- Qualquer exceção deve registrar contexto, motivo, responsável pela revisão e critério de remoção na PR. Não aceitar override permanente sem documentação.
- Versão major: mudança incompatível de contrato; minor: novo padrão compatível; patch: correção/clareza sem mudança de comportamento esperado.
- O autor verifica a implementação; a revisão final de conteúdo decide aceitação do contrato. Não habilitar merge automático para esta proposta.
- Uma alteração de aparência não deve renomear conceitos financeiros ou esconder limites e métodos para simplificar a tela.
- Design aprovado deve ser verificado com dados reais autorizados ou fixtures explicitamente de teste, incluindo dados ausentes e valores negativos.

## 18. Checklist de revisão

### Conteúdo deste contrato

- [ ] Identidade editorial clara e uso controlado de coral representam a direção desejada.
- [ ] Tokens, tamanhos, breakpoints e contratos são concretos e não contraditórios.
- [ ] Home prioriza situação financeira e ações; termos de MVP saem da experiência final.
- [ ] Fontes de dados, períodos e indisponibilidade estão explícitos.
- [ ] Não há alteração de fórmula, baseline, trava de fechamento ou regra de recorrência.
- [ ] APIs propostas estão identificadas como futuras; caminhos atuais foram verificados.
- [ ] Revisão final do conteúdo concluída antes de merge manual.

### Implementação visual futura

- [ ] Tokens centralizados; nenhum hexadecimal novo espalhado por componente.
- [ ] Sem gradientes, blur ou decoração sobre informação financeira.
- [ ] Uma ação primária por contexto; listas usam divisores em vez de card por linha.
- [ ] Tipografia e números tabulares aplicados; valores completos não são cortados.
- [ ] Sidebar e header têm hierarquia, labels e estado ativo consistentes.
- [ ] Layout revisado nas larguras da seção 12, com zoom, textos longos e valores extremos.
- [ ] Controles e overlays não ocultam foco nem conteúdo sob teclado virtual.

### Dados e interação

- [ ] Zero, ausência, erro, vazio, parcial e loading têm apresentações distintas.
- [ ] Planejado, realizado e projetado têm labels, período e fonte.
- [ ] Troca de mês não mistura títulos e dados de períodos diferentes.
- [ ] Gráficos preservam sinal, escala, lacunas, legenda e valores exatos.
- [ ] Orçamento sem limite e uso acima de 100% não geram percentual enganoso.
- [ ] Fechamento, recorrências e lançamentos automáticos respeitam travas existentes.
- [ ] Formulários preservam entrada após erro e impedem envio duplicado.
- [ ] Ocultação de valores cobre conteúdo visual, acessível, tooltips e atributos.

### Acessibilidade e evidência

- [ ] Contraste de todos os pares usados e estados verificado.
- [ ] Fluxo principal completo por teclado; links, tabs, menus e diálogos revisados.
- [ ] Labels, erros e anúncios verificados com leitor de tela.
- [ ] Alternativa tabular dos gráficos e semântica das tabelas disponíveis.
- [ ] Movimento reduzido e forced colors considerados.
- [ ] PR informa escopo, evidência de validação e limitações conhecidas.
- [ ] Alterações de integração passam pelos testes existentes e checagem de tipos pertinentes.

## 19. Critério de conclusão

Uma tela está conforme quando permite interpretar situação, período, qualidade dos dados e próxima ação com os padrões deste contrato. Conformidade não é apenas trocar a paleta: exige estrutura, semântica, estados e preservação das regras financeiras. A migração termina quando todas as rotas usam os padrões, os aliases antigos foram removidos e o checklist foi revisado com evidência.
