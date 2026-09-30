# descontrollle

Gerenciador de finanças pessoais orientado a planejamento financeiro.

## MVP 0 — Fundação

- Next.js 16 + React 19 + TypeScript
- Supabase Auth com SSR (`@supabase/ssr`)
- `proxy.ts` para renovação/validação de sessão via `getClaims()`
- Dashboard responsivo inspirado na referência visual do projeto
- Variáveis de ambiente sem segredos versionados

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
- Autorização server-side usa `supabase.auth.getClaims()`.
- Dados financeiros futuros deverão usar RLS por `auth.uid()` em todas as tabelas expostas.
