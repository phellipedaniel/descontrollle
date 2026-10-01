# MVP 8 — Comportamento Financeiro

## Objetivo

Adicionar uma camada de revisão do comportamento observado sem inferir traços pessoais, compulsão, disciplina ou qualidade moral.

O MVP 8 responde a perguntas descritivas:

- quanto o mês se afastou do baseline;
- quantos dias tiveram despesas;
- quais categorias mais mudaram;
- quanto dos dados possui categoria e estabelecimento;
- se existe concentração relevante quando a cobertura permite;
- qual ação o próprio usuário quer testar.

## Baseline

O baseline usa exclusivamente períodos anteriores que estejam simultaneamente:

- `closed`;
- `reconciled`.

A janela é configurável entre 1 e 12 meses.

O mês analisado pode ser aberto ou incompleto, mas a interface avisa que a leitura é parcial.

## Sinais

Os sinais são calculados em tempo real e não são persistidos como diagnóstico.

### Gasto mensal

Compara o total do mês com a média mensal do baseline.

### Frequência

Compara o número de dias distintos com despesas com a média de dias do baseline.

### Categorias

Para cada categoria:

```
baseline = soma da categoria nos meses de referência / quantidade de meses
diferença = mês analisado - baseline
```

Um sinal só aparece quando a diferença percentual e a diferença mínima em reais configuradas pelo usuário são atingidas. Uma categoria sem histórico pode gerar sinal quando o valor atual supera o piso em reais.

### Estabelecimentos

A concentração usa apenas gastos cujo estabelecimento está identificado.

Ela só pode gerar sinal quando a cobertura de estabelecimento sobre o valor total do mês supera o mínimo escolhido pelo usuário. Com cobertura insuficiente, o ranking continua visível, mas é tratado como parcial.

## Check-in

Há um check-in por usuário por mês.

O usuário escolhe uma intenção:

- observar;
- manter;
- reduzir;
- redirecionar.

Também pode escolher uma categoria de foco e escrever uma reflexão/ação concreta.

O check-in não altera transações, orçamento, saldo ou fechamento financeiro.

## Persistência

Tabelas:

- `behavior_profiles`;
- `behavior_checkins`.

Os sinais são derivados das transações atuais e não são armazenados.

## Segurança

As duas tabelas usam RLS por `auth.uid()`.

Um check-in só pode referenciar uma categoria pertencente ao mesmo usuário.

## Dados atuais

No momento da implementação havia:

- 1.283 despesas;
- 922 despesas categorizadas;
- 320 despesas com estabelecimento;
- 30 períodos fechados e reconciliados.

Isso torna análises por categoria mais completas que análises por estabelecimento. A própria interface expõe essa diferença de cobertura.

## Testes

- `tests/behavior.test.mjs` — baseline, cobertura, categoria, estabelecimento e sinais.
- `supabase/tests/behavior_rls.sql` — isolamento de perfil/check-in, categoria cruzada e bloqueio anônimo.

## Limites

O MVP não conclui que:

- aumento de gasto é necessariamente ruim;
- maior frequência significa compulsão;
- queda de gasto é necessariamente positiva;
- concentração em um estabelecimento é problema;
- uma categoria define um traço comportamental do usuário.

A interpretação final pertence ao usuário.
