# CS Skins Viewer

Aplicação web inspirada em [csgoskins.gg](https://csgoskins.gg/) para explorar
todas as skins de Counter-Strike, ajustar **float** (desgaste) e **pattern**
(seed) e visualizar o resultado em 3D.

## ✨ Funcionalidades

- 📦 **Catálogo completo** de skins (dados da API pública [`ByMykel/CSGO-API`](https://bymykel.github.io/CSGO-API/))
- 🔎 **Busca** por nome e **filtros** (categoria, arma, raridade, coleção, StatTrak™)
- 📄 **Página de detalhes** com informações da skin
- 🎚️ **Slider de Float** com indicação de wear (Factory New → Battle-Scarred) respeitando o `min_float`/`max_float` real
- 🎲 **Slider de Pattern (0–1000)** + botão de pattern aleatório
- 🧊 **Visualizador 3D** (Three.js / React Three Fiber) com shader customizado que simula:
  - Desgaste (scratches + edge-wear) modulado pelo float
  - Variação de pattern (offset/rotação/escala da textura)
- 💰 **Preços do Steam Market** (via proxy CORS, best-effort)

## 🚀 Como rodar

Pré-requisitos: **Node.js 18+**.

```bash
npm install
npm run dev
```

Abra http://localhost:5173.

Para gerar build de produção:

```bash
npm run build
npm run preview
```

## 🧱 Stack

- **Vite** + **React 18** + **TypeScript**
- **TailwindCSS** (UI)
- **React Router** (rotas)
- **Zustand** (estado global)
- **Three.js** + `@react-three/fiber` + `drei` (3D)
- **Axios** (HTTP)

## 📁 Estrutura

```
src/
├── api/
│   ├── skins.ts          # fetch da CSGO-API
│   └── prices.ts         # Steam Market via proxy CORS
├── components/
│   ├── Layout.tsx
│   ├── SkinCard.tsx
│   ├── Filters.tsx
│   ├── SearchBar.tsx
│   ├── Pagination.tsx
│   └── SkinViewer3D.tsx  # canvas + shader de wear/pattern
├── pages/
│   ├── HomePage.tsx      # catálogo, filtros, busca, paginação
│   └── SkinDetailPage.tsx# detalhes + sliders + 3D + preços
├── store/
│   └── useSkinsStore.ts
├── types.ts              # tipos + ranges de wear
├── App.tsx
└── main.tsx
```

## ⚠️ Observações importantes

### Renderização 3D
O CS2 usa shaders proprietários ("finishes") e modelos `.mdl`/`.vmdl` das armas
para renderizar skins. Reproduzir isso fielmente exige assets do jogo (não
distribuíveis). Esta aplicação aproxima o efeito visual com:

- Um `BoxGeometry` como placeholder do modelo da arma
- Um `ShaderMaterial` GLSL que aplica:
  - Transformação de UV controlada pelo *pattern seed*
  - Máscara de desgaste procedural (FBM noise + edge-wear) modulada pelo *float*

Para uma simulação fiel, substitua o `boxGeometry` por modelos `.glb` reais das
armas em [SkinViewer3D.tsx](src/components/SkinViewer3D.tsx) e ajuste o shader
para usar as máscaras de wear oficiais (`*_wear.vtf`).

### Preços
Steam bloqueia chamadas diretas do navegador via CORS. A app usa o proxy público
`api.allorigins.win`, que pode ser limitado. Para produção, recomenda-se um
backend próprio que faça cache das chamadas a `priceoverview`.

### Inspect link
Não implementado: requer autenticação Steam + bot in-game (CSFloat-like).
A combinação float+pattern aqui é puramente visual/exploratória.

## 📜 Licença / Atribuição

Projeto educacional. Não afiliado à Valve. Counter-Strike e todas as marcas
relacionadas são propriedade da Valve Corporation.
