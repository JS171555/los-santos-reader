# Como configurar (e como virar administrador)

Não existe login separado de admin: **admin é uma conta comum com `role = 'admin'`** no banco. Isso é proposital (nenhuma tela pública pode conceder poder de admin).

1. **Supabase → Project Settings → API**: copie a *Project URL* e a chave *anon/publishable* para `js/config.js`. (Essas são as únicas credenciais do projeto; nunca use a `service_role`.)
2. **SQL Editor**: rode, em ordem, `sql/001_fase1.sql`, `sql/002_fase2.sql`, `sql/003_fase3.sql` e `sql/004_fase4.sql` e `sql/005_fase5.sql`.
3. Abra `login.html`, **crie sua conta normalmente** (e confirme o e-mail, se o Supabase exigir) e entre.
4. **SQL Editor**: rode `sql/promover_admin.sql` trocando o e-mail pelo da conta criada no passo 3.
5. Saia e entre de novo (ou recarregue): o item **Admin** aparece no menu lateral (no celular, na barra inferior) e abre `admin.html`.

## Publicação (checklist)
- Rode também `sql/005_fase5.sql`. Hospede a pasta inteira em qualquer hospedagem estática com HTTPS (Netlify, Cloudflare Pages, Vercel, GitHub Pages). O arquivo `_headers` (Netlify/Cloudflare) já aplica cabeçalhos de segurança.
- Supabase → Authentication → URL Configuration: coloque a URL final em *Site URL* e em *Redirect URLs* (`login.html` e `reset.html`).
- Supabase → Authentication: revise a política de senha e configure SMTP próprio antes de abrir ao público (o e-mail padrão tem limite baixo).
- Confira que `js/config.js` tem só a chave anon. Nunca publique a `service_role`.
- Teste de integração (RLS/XP): veja o cabeçalho de `tests/rls-smoke.mjs`.
