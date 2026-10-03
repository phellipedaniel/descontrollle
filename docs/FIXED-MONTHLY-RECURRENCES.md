# Receitas e custos fixos

A rota `/recurrences`, no grupo Rotinas, cadastra salário/receita mensal fixa e custos fixos. Cada item possui tipo permanente, versões mensais, valor em BRL, conta, categoria compatível opcional e estado ativo/pausado. Não reutiliza a sincronização legada, que gera despesas realizadas automaticamente.

## Previsão e vigência

O início mínimo é o maior entre outubro de 2026 e o mês atual em America/Sao_Paulo, validado no servidor e no banco. Versões passadas não são alteráveis, mesmo se o mês estiver aberto. Versões futuras entram somente na competência escolhida. Uma correção na vigência atual ainda aberta atualiza a previsão, preservando os lançamentos já confirmados.

As previsões são calculadas na leitura desde o primeiro dia do mês, sem cron, sem gravar lançamentos e sem modificar monthly_plans/category_budgets. A Home mostra um bloco separado, independente dos filtros de custos. Não se somam essas previsões ao Planejamento nem aos KPIs realizados. A diferença entre receitas e custos fixos abrange apenas os cadastros desta área; não é saldo bancário ou disponível.

## Confirmação

O usuário confirma recebimento/pagamento, data real dentro do mês atual até hoje e ausência de lançamento duplicado manual. Somente o mês atual aberto pode ser confirmado. A RPC insere uma transação normal com metadados de origem e vincula uma confirmação por item/mês, em uma operação atômica. Slot único e bloqueio de linha impedem duplicação por concorrência ou repetição. Valores confirmados usam o valor da transação, mesmo que a previsão mude.

Não há conciliação automática com lançamentos manuais/importados: não confirmar algo que já esteja registrado. Se o valor diferir, corrigir a vigência antes de confirmar. Uma confirmação pode ser removida em Finanças somente no mês atual aberto; a exclusão da transação libera o item, que volta a previsto. Transações confirmadas de meses anteriores permanecem protegidas; alterações diretas são bloqueadas. Fechamento de período mantém as travas existentes.

## Banco e privacidade

Migration `20261003194000_fixed_monthly_recurrences.sql`: três tabelas com RLS, grants mínimos, referências próprias, versões e confirmações protegidas por triggers, funções security invoker e search_path vazio. Nenhuma chave administrativa no cliente. A exportação e o inventário privado de exclusão da conta incluem as três novas tabelas. Não foi criada API pública de exclusão de conta.

A migration é aditiva, não preenche dados nem reescreve meses anteriores. Deve ser aplicada antes da implantação desta branch para a exportação continuar completa. Sem ela, a área mostra indisponibilidade, sem inventar previsões ou tratar erro como zero.

## Verificação e reversão

Testes de centavos, previsão/realização, vigência, formulários, idempotência, isolamento entre usuários, períodos passados/futuros/fechados, referência de categoria/conta e privacidade. Suítes SQL executadas em PostgreSQL local temporário com rollback dos dados sintéticos, sem conexão de produção.

Reverter o código não requer apagar as tabelas nem transações. Em caso de reversão, manter o inventário de exportação/exclusão das novas tabelas enquanto houver dados nelas. Uma remoção de schema/dados exige revisão separada; não executar automaticamente.
