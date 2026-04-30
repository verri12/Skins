/**
 * Steam CDN tem múltiplos mirrors. Akamai costuma ser bloqueado por
 * firewalls/redes corporativas e ORB do Chrome. Cloudflare/Fastly funcionam
 * melhor como hotlink. Tentamos em ordem e a UI faz fallback automático
 * via onError quando uma falha.
 *
 * Obs: `steamcdn-a.akamaihd.net` foi removido — vem retornando 404 para
 * imagens novas do market.
 */
const MIRRORS = [
  "community.cloudflare.steamstatic.com",
  "community.fastly.steamstatic.com",
  "community.akamai.steamstatic.com",
];

function rewriteHost(url: string, host: string): string {
  return url.replace(
    /https?:\/\/(community\.(akamai|cloudflare|fastly)\.steamstatic\.com|steamcdn-a\.akamaihd\.net)/,
    `https://${host}`
  );
}

/**
 * Adiciona sufixo de tamanho exigido pelo Steam CDN e troca para mirror confiável.
 */
export function withSize(url: string, size = 360, mirrorIndex = 0): string {
  if (!url) return url;
  const isSteam =
    url.includes("steamstatic.com") || url.includes("steamcdn-a.akamaihd.net");
  if (!isSteam) return url;

  const host = MIRRORS[Math.min(mirrorIndex, MIRRORS.length - 1)];
  let out = rewriteHost(url, host);
  if (!/\/\d+fx\d+f\/?$/.test(out)) {
    out = `${out.replace(/\/$/, "")}/${size}fx${size}f`;
  }
  return out;
}

export const STEAM_MIRROR_COUNT = MIRRORS.length;

/**
 * Retorna URL via proxy `/api/image` (Cloudflare Pages Function), que busca
 * a imagem no edge e responde com `Access-Control-Allow-Origin: *`. Necessário
 * para WebGL/THREE.TextureLoader, que não consegue usar imagens sem CORS.
 *
 * Em dev (vite) o proxy não existe; nesse caso devolvemos a URL direta com
 * o sufixo de tamanho — funciona para `<img>` mas pode falhar no WebGL.
 */
export function proxiedImage(url: string, size = 512): string {
  if (!url) return url;
  const sized = withSize(url, size, 0);
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return sized;
  }
  return `/api/image?u=${encodeURIComponent(sized)}`;
}
