# Sprint — Visão geral: storytelling de dados
Data: 02/10/2026.

## Leitura
Após os KPIs, a Home responde: como receitas e despesas evoluem, o que mudou em relação ao ano anterior e quais categorias apresentam as maiores diferenças. Preserva o tema atual da main e as regras financeiras.

- Evolução: duas linhas com escala única em reais e origem zero; despesas tracejadas, receitas contínuas.
- Comparação anual: controle Receitas/Despesas, anos com traços distintos. Resumo calcula exclusivamente os mesmos meses com registros nos dois anos até o mês selecionado, excluindo o mês em andamento. Não soma um ano completo contra outro parcial.
- Categorias: despesas da mesma base anual; ranking pelo maior valor dos dois anos, seis categorias e demais agrupadas. Tabela apresenta todas e suas diferenças.
- Títulos descritivos e conclusões calculadas, sem atribuir causas ou julgar gastos.

## Integridade e limites
Leitura paginada (500 por página), ordenada por data/id e filtrada pelo usuário autenticado. Contagem exata, duplicatas e alterações de contagem interrompem a análise, com limite de 50 mil lançamentos. Consultas incompletas não produzem gráficos parciais. Categorias devem ser carregadas integralmente.

Meses sem registros são lacunas; zero só ocorre em mês com registros e nenhum valor daquele tipo. Presença não atesta conciliação. Valores nominais, sem inflação. Datas futuras e meses após a seleção ficam excluídos. Categorias atuais rotulam o histórico (renomear uma categoria altera a identificação exibida). Importações privadas não publicadas ficam fora. Leitura entre páginas não é snapshot transacional; alterações de valor sem mudança de contagem podem ocorrer, como na exportação existente.

## Acessibilidade
Tabelas equivalentes acessíveis; pontos com valores por teclado e tooltip nativo; linha contínua/tracejada e barras preenchidas/contornadas além de cor; unidades e fonte explícitas; gráficos roláveis em tela estreita. Sem animação de números ou biblioteca externa. Só agregados são enviados ao componente interativo, não descrições nem registros individuais.

## Entrega
Branch nova e PR para revisão; sem merge automático. Validar testes de agregação/paginação, regressão financeira, tipos, build e preview autenticado. Com autorização do usuário, as configurações públicas do Supabase foram adicionadas exclusivamente à branch desta sprint. O preview consulta o banco atual com login e RLS. Tema claro/escuro da main integrado à branch.

## Validação do preview
Deploy e sessão autenticada verificados. Dois gráficos SVG carregados; alternância de receitas/despesas e abertura das tabelas conferidas. Testes em 390 e 320 px confirmaram ausência de overflow da página; gráficos usam rolagem interna. Estado inicial e viewport restaurados. Valores financeiros não foram registrados nas evidências textuais. Revisar classificações em Finanças é a ação sugerida após a leitura por categoria. Nenhuma escrita no banco.
