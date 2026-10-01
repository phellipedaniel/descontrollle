create index transactions_recurring_expense_idx
  on public.transactions(recurring_expense_id,user_id)
  where recurring_expense_id is not null;
