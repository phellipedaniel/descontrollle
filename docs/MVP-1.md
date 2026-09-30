# MVP 1 — Diagnóstico Financeiro

## Hipótese

Antes de planejar metas e orçamento, o usuário precisa construir uma fotografia confiável do presente financeiro.

## Escopo entregue

- Contas financeiras com saldo inicial.
- Categorias separadas entre receita e despesa.
- Registro de receitas e despesas por conta, categoria e data.
- Exclusão de movimentações lançadas por engano.
- Dashboard alimentado pelo mês corrente.
- Saldo mensal = receitas − despesas.
- Histórico das 20 movimentações mais recentes.
- RLS por usuário em todas as tabelas financeiras.
- Acesso Data API restrito ao papel `authenticated`.

## Modelo de dados

- `accounts`
- `categories`
- `transactions`

Todas as tabelas carregam `user_id` e usam políticas RLS baseadas em `auth.uid()`. Movimentações também validam que conta e categoria pertencem ao mesmo usuário e que a categoria corresponde ao tipo da movimentação.

## Critérios de aceite

- [x] Usuário autenticado só acessa os próprios dados.
- [x] Usuário cadastra ao menos uma conta.
- [x] Usuário cadastra categorias de receita/despesa.
- [x] Usuário registra receita.
- [x] Usuário registra despesa.
- [x] Dashboard calcula receitas, despesas e saldo do mês.
- [x] Usuário vê histórico recente.
- [x] Usuário consegue excluir uma movimentação.
- [x] Migration registrada no Supabase.
- [ ] Preview Vercel compila sem erro.
- [ ] Fluxo validado no navegador antes de merge para `main`.

## Fora do escopo

- Planejamento/orçamento por categoria.
- Metas.
- Dívidas.
- Patrimônio líquido.
- Open Finance/importação automática.
- Investimentos.

Esses itens permanecem para MVPs posteriores.
