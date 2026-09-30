# descontrollle

Gerenciador de finanças pessoais orientado a planejamento financeiro.

## MVP 0 — Fundação

- Next.js 16 + React 19 + TypeScript
- Supabase Auth com SSR (`@supabase/ssr`)
- `proxy.ts` para renovação/validação de sessão via `getClaims()`
- Dashboard responsivo inspirado na referência visual do projeto
- Variáveis de ambiente sem segredos versionados

## MVP 1 — Diagnóstico Financeiro

- Contas financeiras
- Categorias de receita e despesa
- Receitas e despesas
- Saldo mensal
- Histórico recente
- Dashboard alimentado pelo Supabase
- RLS por usuário
- Migration: `20260930223150_mvp1_financial_core`

Rotas principais:

- `/` — visão geral
- `/finance` — diagnóstico financeiro

## Rodar localmente

1. Copie `.env.example` para `.env.local`.
2. Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Adicione `NEXT_PUBLIC_SITE_URL=http://localhost:3000` para confirmação de e-mail local.
4. Execute:

```bash
npm install
npm run dev
```

## Segurança

- Nenhuma `service_role`/secret key deve ser exposta ao frontend.
- Autorização server-side usa Supabase Auth.
- As tabelas financeiras têm RLS habilitado e políticas por `auth.uid()`.
- O papel `anon` não recebe acesso às tabelas financeiras.
