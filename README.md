# Nord Imports

Loja e painel administrativo em Next.js, preparados para deploy na Vercel com Supabase.

## Rodar localmente

1. Instale o Node.js 22.
2. Execute `npm install`.
3. Copie `.env.example` para `.env.local` e preencha as variáveis.
4. Execute o conteúdo de `supabase/schema.sql` no SQL Editor do Supabase.
5. Execute `npm run dev`.

## Publicar na Vercel

1. Envie este repositório ao GitHub.
2. Na Vercel, clique em **Add New → Project** e importe o repositório.
3. A Vercel detectará Next.js automaticamente. Não altere Build Command ou Output Directory.
4. Em **Settings → Environment Variables**, adicione todas as chaves listadas em `.env.example`.
5. Defina `NEXT_PUBLIC_SITE_URL` com o domínio final, por exemplo `https://nordimports.com.br`.
6. Faça o deploy e cadastre o domínio final nas URLs permitidas do Supabase Auth.

O arquivo `vercel.json` fixa a região de execução em São Paulo (`gru1`).
