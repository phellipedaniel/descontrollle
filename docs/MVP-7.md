# MVP 7 — Motor de Planejamento

## Objetivo

Conectar os módulos anteriores em um cenário futuro auditável.

O motor compara:

1. **Futuro planejado** — planos mensais explícitos e, quando eles não existem, um baseline escolhido pelo usuário.
2. **Cenário provável histórico** — continuação mecânica das médias dos últimos períodos fechados e reconciliados.

“Provável” não representa probabilidade estatística, Monte Carlo ou previsão de mercado.

## Equação mensal

```
margem =
receita
- despesas
- metas
- provisões
- mínimos das dívidas
- pagamento extra das dívidas
- aporte para reserva
```

Cada bloco integrado pode ser desligado pelo usuário para evitar dupla contagem quando já estiver incorporado ao orçamento mensal.

## Fontes do planejado

Renda e despesa podem usar fontes independentes:

- plano do mês atual;
- média dos 3 últimos meses fechados e reconciliados;
- valor manual.

Um plano explícito criado no MVP 2 para um mês futuro sempre substitui o fallback daquele mês.

## Cenário provável

A janela histórica é configurável entre 1 e 12 meses.

Um tipo de dado só é considerado utilizável quando todos os períodos selecionados possuem pelo menos um lançamento daquele tipo. Isso é particularmente importante no histórico importado atual, que possui despesas, mas não receitas.

Ausência de receita não é convertida em renda zero.

## Metas

Para cada meta ativa ainda no prazo:

```
aporte mensal =
valor restante / meses restantes incluindo o mês-alvo
```

O cálculo é feito em centavos e o último mês recebe somente o restante.

Metas vencidas e ainda incompletas são apresentadas como pendência separada e não são forçadas integralmente para o primeiro mês.

## Provisões

Cada provisão ativa usa o mesmo aporte mensal do MVP 4:

```
custo anual / 12
```

## Dívidas

O motor pode incorporar:

- soma dos pagamentos mínimos;
- pagamento extra configurado no MVP 5.

O MVP 7 não simula amortização contratual. Por isso esses valores permanecem como compromissos mensais ao longo do horizonte.

## Reserva

O target e gap vêm do MVP 4.

O usuário escolhe um aporte mensal. O motor aplica esse valor até que o gap calculado seja preenchido; depois o compromisso de reserva cai para zero.

## Persistência

Tabela:

- `planning_engine_profiles`

Ela armazena apenas premissas do usuário. As projeções são calculadas em tempo real a partir das fontes atuais para evitar cenários silenciosamente desatualizados.

## Segurança

A tabela usa RLS por `auth.uid()`, com grants mínimos para `authenticated` e nenhum acesso para `anon`.

## Testes

- `tests/planning-engine.test.mjs` — baselines, metas, compromissos, reserva e margens.
- `supabase/tests/planning_engine_rls.sql` — isolamento de premissas entre usuários.

## Limites do modelo

- sem previsão de renda por IA;
- sem sazonalidade automática;
- sem inflação;
- sem rentabilidade de investimentos;
- sem amortização detalhada de dívida;
- sem previsão de patrimônio futuro;
- sem classificação automática de compromissos já incluídos no orçamento.
