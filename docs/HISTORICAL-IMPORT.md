# Histórico financeiro — staging e regras

## Revisão das fontes

A migration `20261001123638_historical_spreadsheet_source_review` acrescenta uma camada privada para revisar planilhas antes de complementar o histórico já extraído.

- `historical_source_documents`: manifesto, versão do parser e hashes SHA-256 do arquivo e do payload.
- `historical_source_rows`: aba, células de origem, texto original, valores original e candidato, parcelas e evidências da revisão.

Cada linha recebe um estado: `candidate` (selecionada e com data/valor), `holdout` (pendência), `duplicate` (com chaves históricas correspondentes) ou `alternative` (outra versão). A realização é separada: `unknown`, `actual` ou `forecast`. Ser candidata não comprova que a despesa foi realizada.

O arquivo tem hash único; cada lote tem chave única por linha e por aba/célula. A carga deve conferir os hashes antes de reutilizar um lote e tratar uma repetição idêntica como operação sem novas inserções. Essas chaves impedem recarga da mesma origem, mas a comparação entre fontes exige revisão de data, descrição, valor e parcela. Gastos legítimos repetidos devem ser preservados.

Valores ausentes permanecem nulos. Previsões, versões alternativas e pendências ficam fora da promoção. O valor original é preservado separadamente do candidato arredondado para centavos. Nenhuma linha entra automaticamente em `historical_expense_staging`.

Após confirmação, selecionar apenas gastos realizados e completos, excluir duplicatas comprovadas e registrar a decisão de curadoria. Recalcular contagens e totais mensais, comparar com o manifesto e confirmar que o histórico anterior não foi alterado.

As duas tabelas de fontes têm RLS habilitada e privilégios revogados de `PUBLIC`, `anon`, `authenticated` e `service_role`. A ausência de políticas é intencional: a revisão exige conexão administrativa autorizada.

## Identidade e isolamento

Cada usuário tem seu UUID do Supabase Auth. As políticas das tabelas operacionais usam `auth.uid() = user_id` e verificam a propriedade das referências. O UUID identifica o proprietário; a autorização é feita pela sessão e pela RLS. Hashes de arquivos servem à integridade e deduplicação.

O proprietário do histórico usa o papel normal `authenticated`; a designação de usuário mestre não concede acesso aos dados de outros usuários. Vincular o lote por `owner_user_id` não libera o staging ao frontend.

Quando a fonte não informa uma conta bancária, pode ser usada uma conta interna do tipo `other`, pertencente ao mesmo usuário, sem inferir banco, cartão ou meio de pagamento. A criação do acesso deve passar pelo Supabase Auth; senhas e dados de cadastro não pertencem às migrations.

## Regra de períodos fechados

`financial_periods` representa o estado de cada mês.

Quando um período está `closed`:

- transações daquele mês não podem ser inseridas, alteradas ou excluídas pelo fluxo autenticado;
- orçamento mensal não pode ser criado/alterado/excluído;
- orçamento por categoria não pode ser criado/alterado/excluído;
- o fechamento não pode ser reaberto pelo fluxo normal.

O histórico importado será fechado somente depois da promoção e reconciliação.

## Meios de pagamento

`payment_methods` suporta:

- PIX;
- cartão de crédito;
- cartão de débito;
- dinheiro;
- transferência bancária;
- outro.

Para cartões:

- `name`: nome definido pelo usuário, por exemplo "Nubank";
- `card_brand`: bandeira opcional, por exemplo "Mastercard".

Meios de pagamento só devem ser preenchidos quando houver evidência explícita na fonte. Ausência de informação permanece desconhecida; não inferir cartão.

## Origem / estabelecimento

`merchants` armazena o estabelecimento/origem canônica.

`merchant_aliases` preserva variações de escrita observadas no histórico.

O texto original de cada gasto permanece disponível por `source_description` e pela staging table.

## Gastos recorrentes

Recorrências usam duas tabelas:

- `recurring_expenses`: identidade lógica;
- `recurring_expense_versions`: versões imutáveis.

Uma alteração nunca edita a versão anterior. É inserida uma nova versão com `effective_from`.

A policy só permite criar versões depois do último mês fechado do usuário. Assim, uma alteração feita no futuro não reescreve meses já fechados.

Desativar uma recorrência também deve ser representado por uma nova versão com `is_active=false`.

Os candidatos históricos a recorrência não são ativados automaticamente. Exigem confirmação do usuário.

## Gate antes da promoção

A promoção para tabelas públicas permanece bloqueada até:

1. existir um usuário autenticado de destino;
2. o batch ser associado a esse usuário;
3. definir a conta contábil para despesas cujo histórico não identifica a conta de origem;
4. criar/marcar categorias, estabelecimentos e meios de pagamento do usuário;
5. promover os gastos em transação única;
6. validar novamente totais por mês;
7. criar e fechar os períodos importados, preservando seus respectivos estados de reconciliação.

O staging fica no schema `private` e não é exposto ao papel `anon` nem ao `authenticated`.


## Versionamento e validação

O repositório contém a estrutura e as regras gerais. Arquivos de origem, payloads, relatórios com valores, identificadores de lotes reais e credenciais devem permanecer em armazenamento privado.

Na validação da camada de fontes foram verificados: recarga sem novas linhas, rejeição de chaves duplicadas, candidatos sem data/valor, valores não positivos e parcelas inválidas; também foram conferidos RLS e privilégios. A vinculação do proprietário foi verificada com leitura permitida ao dono e leitura/alteração sem acesso por outra identidade.

A migration corresponde à estrutura já aplicada no banco. Versioná-la não promove despesas para as tabelas operacionais. Totais e resultados de cada carga ficam nos relatórios privados.

## Promoção operacional e reexecução

A promoção operacional foi executada e verificada em 01/10/2026. A execução específica, os identificadores e os resultados financeiros permanecem em relatório privado. Nenhum payload de produção é distribuído neste repositório.

O procedimento administrativo utilizado segue esta sequência:

1. Abrir uma transação e bloquear as tabelas envolvidas durante a carga.
2. Conferir proprietário, conta de destino, estado dos lotes, chaves únicas e totais esperados.
3. Comparar cada agregado mensal com o staging de períodos e rejeitar despesas sem período correspondente.
4. Reutilizar as classificações curadas; manter categoria nula quando não houver classificação confiável e meio de pagamento nulo quando desconhecido.
5. Inserir despesas, preservar a procedência e registrar o vínculo em `imported_transaction_id`.
6. Conferir novamente contagens e valores de cada mês, além da propriedade das referências.
7. Criar os períodos conforme `target_period_status` e `close_after_import`, mantendo `reconciliation_status` independente do fechamento.
8. Marcar os lotes promovidos e confirmar a transação somente se todas as verificações passarem.

Antes da aplicação, executar a mesma carga com rollback. Conflitos com dados operacionais existentes devem interromper a operação para revisão, sem sobrescrever transações. Uma reexecução de lotes já promovidos só pode terminar sem alterações quando os vínculos e os dados esperados ainda conferirem.

O conteúdo original das despesas em staging deve permanecer idêntico, exceto pelo vínculo à transação. Eventos de pagamento/acerto, fontes alternativas, duplicatas e itens sem valor ficam separados da carga de despesas. O estado `promoted` se refere às despesas curadas do lote e não significa que todas as pendências da fonte foram resolvidas.

### Verificações de autorização realizadas

Os testes no banco utilizaram o papel `authenticated`, com identidade definida apenas no contexto transacional e rollback ao final:

- O proprietário consultou as despesas importadas e o total esperado.
- Uma identidade diferente não consultou dados do proprietário nem inseriu, alterou ou excluiu suas despesas.
- Meses fechados rejeitaram novas despesas e não permitiram edição, exclusão ou reabertura pelo fluxo normal.
- A reexecução da carga não criou novas despesas.

Esses testes validam as políticas do banco; não substituem testes de navegação com duas sessões reais. Fechar um período com pendências preserva o estado de reconciliação e exige um procedimento administrativo controlado para futuras correções.

A conta histórica usa saldo inicial técnico. Uma carga de despesas, isoladamente, não reconstrói receitas nem comprova saldo bancário.


## Complemento por planilha e previsões

Quando uma planilha complementa o histórico já promovido, a revisão deve ser idempotente:

1. Preservar a célula, aba, arquivo e valor bruto da fonte.
2. Comparar a linha com as transações já existentes antes de qualquer inserção.
3. Quando houver correspondência unívoca, apenas vincular o staging à transação existente.
4. Aplicar categoria e estabelecimento somente quando a evidência for confiável; ausência de classificação permanece nula.
5. Itens explicitamente futuros ficam em `historical_forecast_staging`, separados de despesas realizadas.
6. Valores ausentes ou outras pendências ficam em `historical_import_issues` e impedem o fechamento daquele período quando forem materiais.
7. Valores com precisão maior que centavos preservam `source_amount_raw`; a diferença de arredondamento fica registrada no período em vez de reescrever a fonte.

Um mês reconciliado pode ser fechado depois da comparação entre staging e transações. Um mês incompleto permanece aberto. Uma aba futura ou rascunho não deve criar transações operacionais apenas por conter valores.
