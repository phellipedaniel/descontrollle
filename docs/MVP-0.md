# MVP 0 — Fundação

## Objetivo

Entregar a base técnica do descontrollle antes de implementar dados financeiros.

## Escopo

- Next.js + React + TypeScript
- Autenticação Supabase com SSR
- Proteção de rotas com `getClaims()`
- Login, cadastro, confirmação de e-mail e logout
- Dashboard-base inspirado na referência visual do Figma
- Projeto Supabase dedicado em `sa-east-1`
- Git local na branch `main`
- Preparação para Vercel via variáveis de ambiente

## Aceite

| Critério | Estado |
| --- | --- |
| Estrutura do app criada | concluído |
| Supabase dedicado criado | concluído |
| Auth disponível | concluído |
| Publishable key usada no frontend | concluído |
| `service_role` ausente do frontend | concluído |
| Proteção server-side com `getClaims()` | concluído |
| Advisors Supabase sem alertas | concluído |
| Dashboard-base implementado | concluído |
| Git local / branch `main` | concluído |
| Instalação/build local | bloqueado pelo acesso ao npm registry no runtime |
| Repositório remoto GitHub | concluído: `phellipedaniel/descontrollle` |
| Deploy Vercel | bloqueado: operação de deploy do conector não está disponível e não há team context exposto |

## Próximo marco

Após publicar o repositório e o primeiro deploy, iniciar o MVP 1: contas, receitas, despesas, categorias e diagnóstico mensal.
