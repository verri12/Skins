# Cloudflare Pages

`/functions/api/price.ts` é uma **Cloudflare Pages Function** que faz proxy
server-side para a Steam Market API, contornando totalmente o CORS.

## Como deployar

1. Faça push do projeto para um repo GitHub.
2. No painel do Cloudflare → **Pages** → **Create a project** → conecte ao repo.
3. Configurações de build:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - Node version: `20`
4. A pasta `functions/` é detectada automaticamente — `/api/price` ficará disponível.

Em desenvolvimento local (`npm run dev`), o endpoint `/api/price` não existe;
o app cai automaticamente para proxies CORS públicos. Se sua rede também os
bloquear, os preços ficam indisponíveis localmente — mas funcionarão em
produção.

Para testar Functions localmente, instale o Wrangler:

```bash
npm i -D wrangler
npx wrangler pages dev -- npm run dev
```
