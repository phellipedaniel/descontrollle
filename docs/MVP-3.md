# MVP 3 — Objetivos financeiros

## Escopo

- Rota `/goals` com acesso autenticado e entrada na navegação principal.
- Criar objetivos com nome, valor desejado, prazo, valor inicialmente reservado e observações.
- Editar nome, valor, prazo e observações; arquivar e reativar sem perder histórico.
- Registrar aportes realizados, consultar os últimos 30 e remover um aporte incorreto após confirmação.
- Progresso, valor restante, metas alcançadas e prazos vencidos.
- Aporte mensal necessário comparado com a sobra do planejamento do mês atual.

Aportes são registros declarados pelo usuário. Não transferem dinheiro, não criam receitas/despesas e não alteram períodos financeiros fechados. O valor inicial é imutável após a criação; valores posteriores entram como aportes. Metas arquivadas preservam o histórico e não aceitam novos aportes ou remoções até serem reativadas.

## Cálculo

O valor reservado é o inicial mais a soma dos aportes. O restante nunca é negativo. O aporte mensal divide o restante pela quantidade de meses até o prazo, incluindo o mês atual e o mês de destino, arredondando para cima em centavos. Não há previsão de juros ou rendimentos.

Quando o prazo passou e ainda falta dinheiro, o objetivo fica vencido e sua estimativa mensal fica indisponível até revisão. Objetivos alcançados têm restante e aporte necessário iguais a zero, mesmo quando o prazo já passou. Valores acima do alvo permanecem no saldo reservado; a barra limita-se a 100%.

A sobra prevista depende de um plano mensal cadastrado. Sem plano, a interface informa isso, sem apresentar uma capacidade financeira presumida. Metas vencidas ficam fora da soma dos aportes mensais com aviso explícito.

## Dados e segurança

Migration: `20261001135228_mvp3_financial_goals`.

- `financial_goals`: proprietário, valor inicial, alvo, prazo e estado.
- `goal_contributions`: histórico de aportes com referência composta `(goal_id, user_id)`.
- `financial_goal_progress`: view com `security_invoker=true`; as políticas das tabelas continuam valendo para os agregados.

As tabelas têm RLS por `auth.uid()`, sem acesso anônimo. O papel autenticado só pode editar colunas permitidas dos objetivos, sem trocar proprietário ou saldo inicial. Aportes não são editáveis; correções removem o registro e recalculam o agregado. Uma chave por formulário de aporte impede que a repetição da mesma submissão contabilize duas vezes.

## Validação

Os testes de cálculo estão em `tests/goals.test.mjs`:

```sh
node --experimental-strip-types --test tests/goals.test.mjs
```

Usar Node 22 ou superior. Os testes cobrem centavos, entradas inválidas, datas inexistentes, mudança de ano, prazo vencido e objetivo acima do alvo.

`supabase/tests/goals_rls.sql` executa testes administrativos com dois usuários sintéticos dentro de uma transação, encerrada com rollback. Verifica propriedade, acesso à view, referências cruzadas, edição, aporte futuro, arquivamento, remoção e recálculo. Não deixa contas ou metas de teste persistidas.

## Limites desta etapa

Sem investimentos automáticos, projeções de rendimento, transferências bancárias, retiradas parciais ou geração automática de metas a partir do histórico. Cada objetivo deve ser criado pelo usuário com valores reais.
