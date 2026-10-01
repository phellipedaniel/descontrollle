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
