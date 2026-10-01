# Sprint 2 — direção editorial

A interface passa a usar papel creme, texto escuro, coral controlado e títulos serifados. A arquitetura da Home, as consultas e as regras financeiras do Sprint 1 permanecem intactas. O contrato visual recebe versão 3.0 por substituir a direção dark/roxa anterior.

## Entrega

- Tokens semânticos claros e contexto inverso completo para fluxo financeiro e apresentação do login.
- Styrene B Regular/Medium e Copernicus Book carregadas localmente pelo Next, com swap e fallbacks; três arquivos, aproximadamente 165 KB antes da otimização.
- Sidebar, cabeçalhos, métricas, estados, formulários e gráficos existentes adaptados por estilos compartilhados.
- Cards sem gradientes ou círculos decorativos, faixa de KPIs com divisores, marca própria preservada.
- Remoção da referência de MVP e de detalhes da infraestrutura na apresentação do login.
- Nenhuma alteração de domínio, consultas, ações de persistência ou migração de banco.

## Fontes fornecidas

Os arquivos anexados são versões Trial com licença empacotada "Personal Use Only". O usuário confirmou possuir licença de uso web em 01/10/2026. A cobertura dos arquivos foi inspecionada: acentos portugueses e o símbolo `$` estão ausentes; nesses caracteres o navegador usa Arial/Georgia. Substituir pelos arquivos completos licenciados continua pendente para uniformidade tipográfica. Os nomes internos Trial foram preservados pelos binários.

## Verificação

- 45 testes aprovados: domínio financeiro, estados reais da Home e dois testes de contraste que verificam texto, estados, controles, foco e séries principais nos contextos claro/inverso.
- TypeScript e build de produção aprovados, incluindo processamento local das fontes.
- Validação visual autenticada, responsividade por navegador, zoom e leitor de tela ainda requerem acesso à aplicação. O build e os testes não substituem essa revisão.

A implementação deve permanecer em PR para revisão, sem merge automático.
