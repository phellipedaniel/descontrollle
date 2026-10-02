# Privacidade: operação e preparação para terceiros

Atualizado em 02/10/2026. O ambiente atual é pessoal. Esta documentação implementa procedimentos técnicos e registra condições de abertura a terceiros; não declara certificação LGPD.

## Entregas e pendências

| Controle | Entrega neste PR | Validação ou dependência |
|---|---|---|
| Retorno do login | Somente destinos internos; formatos ambíguos rejeitados | Testes de destinos maliciosos e fluxos de sessão |
| Cadastro | Botão e ação de cadastro removidos | Signup desativado e confirmado no painel de produção em 02/10/2026; manter essa configuração |
| Erros | Códigos estáveis; conteúdo arbitrário da URL não exibido | Testes de URL manipulada e falhas do provedor |
| Sessões | Cookies Secure em produção; renovação preservada nos dois redirects | Conferir sessão autenticada em preview e logout; SameSite=Lax mantido |
| Cache | Respostas da aplicação e exportação privadas, sem armazenamento em cache | Conferir cabeçalhos reais |
| CSP | Nonce por requisição, scripts estritos, conexões restritas e proteção contra frames | Estilos inline continuam permitidos para gráficos; não há unsafe-inline para scripts em produção |
| Transparência | Página pública /privacy para o uso pessoal e links no login/navegação | Não é aviso final de um serviço oferecido a terceiros |
| Acesso | Exportação paginada das 25 tabelas públicas, sem arquivo parcial em caso de falha | Não inclui fontes privadas, arquivos locais, sessões ou logs |
| Fontes privadas | Exportação administrativa isolada, por dono dos lotes | Migração precisa ser revisada e aplicada; exportação manual não executada em dados reais |
| Exclusão | Cascata das fontes e função administrativa atômica com confirmação específica | Migração revisável; nenhum usuário real excluído |
| Senhas vazadas | Ajuste identificado no provedor | Pendente: plano Free confirmado; recurso exige Pro ou superior. Nenhuma assinatura alterada |
| Retenção e incidentes | Procedimentos abaixo | Operador precisa executar e registrar os controles; contratos e backups pendentes |

## Inventário de atividades

| Atividade | Dados | Finalidade | Destinos | Encerramento/retensão | Base para futura oferta |
|---|---|---|---|---|---|
| Conta | E-mail, identificador e autenticação | Acesso | Supabase Auth | Encerramento da conta e política de sessões | Avaliar execução contratual |
| Finanças e planejamento | Movimentações, contas, categorias, metas, dívidas e patrimônio | Organizar e acompanhar finanças | Supabase Postgres e aplicação Vercel | Enquanto necessários à finalidade escolhida; eliminar no encerramento autorizado, observadas exceções fundamentadas | Avaliar execução contratual |
| Reflexões e indicadores | Texto livre e estatísticas do histórico | Revisão descritiva | Banco e aplicação | Mesmo ciclo do histórico; minimizar texto sensível | Avaliar hipótese aplicável; análise distinta para dados sensíveis incidentais |
| Importação | Arquivos, células originais, versões, metadados e hashes | Validar e conciliar histórico | Schema privado e cópias locais | Manter durante conferência; revisar necessidade das duplicações após concluir; eliminar no encerramento | Documentar origem, necessidade e terceiros presentes |
| Segurança/operação | Sessões, potenciais IPs, erros e registros operacionais | Acesso, prevenção e recuperação | Fornecedores | Confirmar duração, acesso e descarte por fornecedor | Avaliar hipótese e necessidade por finalidade |
| Navegação | Cookie de autenticação e preferência de sidebar | Funcionamento e preferência | Navegador | Sessão do provedor; preferência até limpeza pelo navegador | Explicar os usos necessários |
| Atendimento/incidentes | Identificador do caso, datas, medidas e decisões | Atendimento e resposta | Registro privado do operador | Política própria e eventual obrigação aplicável | Definir antes de terceiros |

Informações financeiras não pertencem automaticamente à categoria legal de dados sensíveis, mas textos podem revelar essas categorias e dados de outras pessoas. Evitar coleta desnecessária. Não utilizar um consentimento genérico para legitimar todas as atividades. [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm).

## Configuração do Supabase

Configurações verificadas no painel em 02/10/2026: novos cadastros bloqueados, confirmação de e-mail ativa, login anônimo e vinculação manual desativados, alteração segura de senha e exigência de senha atual ativadas. O mínimo de senha foi configurado para oito caracteres. Plano Free confirmado; proteção contra senhas vazadas não foi habilitada, pois requer Pro ou superior. Não houve mudança de plano.

No projeto correto, manter e registrar:

1. Desativar novos cadastros (disable_signup=true). O login do usuário existente continua permitido. Não criar um segundo usuário real para testar o bloqueio.
2. Manter confirmação de e-mail; conferir URL oficial e destinos permitidos de autenticação.
3. Habilitar proteção contra senhas vazadas se o plano permitir; não adquirir um plano pago automaticamente. [Documentação de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
4. Conferir política de senhas, limites de tentativas e MFA administrativo. A configuração de MFA exige participação do titular e armazenamento privado dos códigos de recuperação.
5. Registrar duração dos JWTs, sessões e opções de backup. Não confundir duração de cookie com duração do JWT.
6. Executar o Security Advisor após mudanças. Não adicionar políticas permissivas ao schema privado apenas para remover avisos informativos.
7. Validar login, renovação e logout; não registrar tokens, senhas ou cookies completos nas evidências.

## Acesso e atendimento

No uso atual, o responsável é o próprio usuário. Antes de terceiros, definir pessoa/empresa responsável, canal público e responsável operacional.

Para cada pedido: registrar número do caso, identidade verificada proporcionalmente, tipo, data, prazo aplicável, responsável e conclusão. Preferir sessão autenticada; não pedir documento adicional sem necessidade. Não armazenar a cópia do histórico financeiro no registro do pedido.

A exportação /privacy/export contém dados do usuário autenticado nas tabelas públicas, além de identificação básica da conta. É uma leitura paginada, não um snapshot transacional entre tabelas. Contagens, chaves e ownership são conferidos; falhas ou alterações detectadas interrompem o arquivo. Há limite de 50 mil registros por tabela, acima do qual se exige atendimento administrativo.

Para atendimento completo, complementar com as fontes privadas e sistemas fora da aplicação. Após a migração, um administrador SQL pode usar:

~~~sql
-- Substituir exclusivamente pelo usuário verificado no pedido.
select private.export_import_sources('UUID_DO_TITULAR'::uuid);
~~~

Não enviar esse resultado a logs públicos ou ao Git. Conferir dados de terceiros no conteúdo antes de entregar. A função é SECURITY INVOKER, fica em schema privado e não pode ser executada pelos papéis anon, authenticated ou service_role. Não criar uma API pública para ela.

O prazo de 15 dias corresponde à declaração completa de confirmação/acesso, não a um prazo universal para todos os direitos. Portabilidade, correção, eliminação e demais direitos demandam tratamento específico. [Orientação da ANPD](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados/direito-dos-titulares).

## Correção e exclusão

As regras de períodos fechados e as restrições usuais permanecem. Um pedido de correção do histórico deve ter procedimento administrativo e justificativa, sem liberar alterações indiscriminadas na interface.

A migração corrige três referências: usuário → lote, lote → documento e documento → linhas passam a ter exclusão em cascata. Lotes já sem proprietário exigem avaliação manual; não atribuir esses dados automaticamente ao único usuário existente.

A função privada erase_account_data elimina, em uma operação atômica, sessões, lotes privados com descendentes, as 25 tabelas públicas em ordem de dependência e a identidade. Não expõe endpoint de exclusão ao usuário. Verifica inventário público e exige confirmação contendo o UUID exato. Uma tabela nova com user_id faz a função interromper até a revisão.

Antes de uma exclusão real:

1. Confirmar o pedido específico e identidade; verificar retenções justificadas e explicar alcance.
2. Suspender operações dessa conta durante o atendimento e localizar arquivos locais, relatórios, ferramentas e fornecedores. Não produzir uma nova cópia integral por hábito.
3. Revogar sessões; lembrar que JWTs existentes podem permanecer criptograficamente válidos até expirar. getUser consulta o provedor; não usar apenas decodificação local como garantia de revogação.
4. Após revisar a migração e o procedimento, executar a função como administrador SQL com a confirmação específica:
~~~sql
-- Exemplo não executável até a substituição dos dois valores pelo mesmo UUID verificado.
select private.erase_account_data('UUID_DO_TITULAR'::uuid, 'ERASE UUID_DO_TITULAR');
~~~
5. Registrar apenas contagens e conclusão necessárias, sem preservar os dados eliminados.
6. Tratar cópias locais, dados de suporte e backups separadamente. A função não os elimina.
7. Conferir resíduos no banco e garantir supressão após eventual restauração.

A função não deve ser chamada automaticamente por cron, por login ou por saída da conta. O teste local utiliza somente usuários sintéticos e ROLLBACK.

## Retenção e restauração

O histórico continua necessário ao planejamento escolhido pelo usuário atual; este PR não apaga períodos antigos. Para cada local, manter inventário privado com: finalidade, dono, acesso, critério de revisão, descarte e eventual justificativa de conservação.

- Arquivos originais e duplicações: revisar após a validação e resolução das pendências; conservar somente o que continua necessário à conferência. Não apagar fontes ainda necessárias à conciliação.
- Exportações e relatórios de atendimento: cópias temporárias devem ser eliminadas depois da entrega e verificação, salvo necessidade fundamentada.
- Registros de incidentes: prazo regulamentar próprio; não reutilizar esse prazo como retenção de todo o histórico.
- Logs e backups: confirmar prazos efetivos dos fornecedores e contratos. Não prometer eliminação imediata onde a plataforma mantém backups com expiração.
- Restauração: registrar de forma mínima os pedidos de eliminação que ainda precisem ser reaplicados; após restaurar, cumprir a supressão antes de reabrir o ambiente.

Não foram estabelecidos prazos fictícios para backups cuja configuração ainda não foi conferida.

## Incidentes

1. Conter acesso comprometido e preservar evidência mínima; não publicar logs com credenciais ou finanças.
2. Registrar quando o controlador tomou conhecimento, natureza, sistemas/dados afetados, abrangência, medidas e avaliação de risco.
3. Definir necessidade de comunicação com o responsável jurídico. Como regra geral, incidentes com risco ou dano relevante exigem comunicação à ANPD e titulares em três dias úteis; não adotar automaticamente 72 horas.
4. Manter registro de incidentes, inclusive não comunicados, por no mínimo cinco anos conforme a regulamentação. Registrar também a justificativa de não comunicar.
5. Recuperar o ambiente, testar restauração e impedir reintrodução de dados anteriormente excluídos.
6. Revisar controles e responsáveis após o incidente.

[Instruções oficiais de comunicação](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis), [regulamento e registros](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aprova-o-regulamento-de-comunicacao-de-incidente-de-seguranca).

## Condições para abertura a terceiros

- Identificação do responsável, canal e aviso final de privacidade aprovados.
- Inventário de finalidades, hipóteses, dados sensíveis incidentais e retenção validado juridicamente.
- Contratos efetivos e suboperadores conferidos; região do banco não comprova localização de todos os tratamentos. [DPA Supabase](https://supabase.com/legal/customer-resources/data-processing-addendum), [DPA Vercel](https://vercel.com/legal/dpa).
- Mecanismos de transferências internacionais verificados conforme países e prestadores efetivos. [Regulamentação ANPD](https://www.gov.br/anpd/pt-br/assuntos/noticias/resolucao-normatiza-transferencia-internacional-de-dados).
- Enquadramento de pequeno porte e eventual encarregado avaliados; a flexibilização não elimina canal e segurança. [Resolução 2/2022](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022).
- Necessidade de RIPD e público/menores avaliados.
- Atendimento completo, exclusão, restauração e resposta a incidentes exercitados.
- Revisão autenticada de preview concluída antes de merge; migração aplicada em etapa controlada após revisão.

## Verificação técnica

npm test cobre cálculo financeiro, estados dos dados, UI, exportação, redirects e CSP.
npm run test:database reproduz as 19 migrações em Postgres temporário via PGlite, com tabelas Auth mínimas simuladas, e executa os oito scripts SQL de isolamento e privacidade. Não utiliza conexão de produção e não substitui um teste de integração completo do Supabase Auth.
npm run build executa ambos antes da compilação.
