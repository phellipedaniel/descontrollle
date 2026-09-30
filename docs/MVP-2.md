# MVP 2 — Planejamento Mensal

## Hipótese

O diagnóstico só descreve o passado e o presente. Para influenciar decisões, o usuário precisa declarar antecipadamente o que espera receber, quanto pretende gastar e em quais categorias.

## Escopo entregue

- Um plano por usuário e por mês.
- Receita planejada mensal.
- Limites de despesa por categoria.
- Navegação entre meses.
- Comparação de receita planejada × realizada.
- Comparação de despesas orçadas × realizadas.
- Saldo previsto × saldo realizado.
- Desvio por categoria durante o mês.
- Dashboard principal atualizado para planejado × realizado.
- RLS em todas as novas tabelas.

## Modelo de dados

### `monthly_plans`

Representa as premissas de um mês.

- `user_id`
- `month`
- `planned_income`
- `notes`

### `category_budgets`

Representa o limite planejado para uma categoria de despesa.

- `user_id`
- `plan_id`
- `category_id`
- `planned_amount`

As políticas validam propriedade do plano e da categoria, e só permitem categorias do tipo `expense`.

## Critérios de aceite

- [x] Usuário só acessa os próprios planos.
- [x] Usuário cria/edita o plano de um mês.
- [x] Usuário define receita planejada.
- [x] Usuário define limite por categoria de despesa.
- [x] Valor zero remove o limite da categoria.
- [x] Sistema calcula despesas orçadas e realizadas.
- [x] Sistema calcula saldo previsto e realizado.
- [x] Dashboard compara planejado × realizado.
- [x] Migration registrada no Supabase.
- [ ] Preview Vercel compila sem erro.
- [ ] Fluxo validado em produção.

## Fora do escopo

- Metas/objetivos financeiros.
- Reserva de emergência.
- Estratégia de dívidas.
- Patrimônio líquido.
- Importação bancária/Open Finance.
