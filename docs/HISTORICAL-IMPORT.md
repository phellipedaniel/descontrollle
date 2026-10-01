# Histórico financeiro — staging e regras

## Estado da carga

Batch de staging:

`c911e40a-3c8f-4044-b58b-11ab55bf8c5c`

Validação estrutural:

- 1.021 gastos
- R$ 90.682,69
- 19 eventos de acerto/pagamento
- 31 meses
- 1.021 chaves históricas distintas
- 0 gastos órfãos de período
- 0 divergências entre agregados mensais do staging e o arquivo curado
- 27 meses reconciliados
- 3 meses não reconciliados: 2024-09, 2025-05 e 2026-01
- 1 mês incompleto: 2025-11

O lote está em status `validated`, mas não foi promovido para `public.transactions`.

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

No histórico do WhatsApp somente 2 despesas têm PIX explicitamente identificado. As outras 1.019 permanecem como meio de pagamento desconhecido. O sistema não deve inferir cartão sem evidência.

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

Os candidatos históricos detectados (aluguel, internet, plano, Gympass, Coelba, Gran Cursos etc.) não são ativados automaticamente. Exigem confirmação do usuário.

## Gate antes da promoção

A promoção para tabelas públicas permanece bloqueada até:

1. existir um usuário autenticado de destino;
2. o batch ser associado a esse usuário;
3. definir a conta contábil para despesas cujo histórico não identifica a conta de origem;
4. criar/marcar categorias, estabelecimentos e meios de pagamento do usuário;
5. promover os gastos em transação única;
6. validar novamente totais por mês;
7. criar e fechar os 31 períodos com seus respectivos estados de reconciliação.

O staging fica no schema `private` e não é exposto ao papel `anon` nem ao `authenticated`.
