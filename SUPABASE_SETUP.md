# Ativação do painel administrativo

O painel usa Supabase Auth, banco PostgreSQL e Storage. Para ativá-lo em produção:

1. Crie um projeto no Supabase.
2. Abra **SQL Editor**, cole todo o conteúdo de `supabase/schema.sql` e execute uma vez.
3. Em **Authentication → URL Configuration**, use a URL da Vercel como Site URL e adicione `https://SEU-DOMINIO.vercel.app/auth/callback` às Redirect URLs.
4. Na Vercel, abra **Settings → Environment Variables** e cadastre:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`
   - `OPENAI_API_KEY` (opcional, somente para renomeação com IA)
5. Faça um novo deploy e crie sua conta em `/cadastro`.
6. No SQL Editor, troque o e-mail em `supabase/make-admin.sql` pelo seu e execute o arquivo.
7. Entre novamente em `/login` e abra `/admin`.

Produtos novos começam ocultos. Depois de revisar suas imagens e informações, use **Publicar** para exibi-los na loja.
