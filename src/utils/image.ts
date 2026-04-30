/**
 * Steam CDN tem múltiplos mirrors. Akamai costuma ser bloqueado por
 * firewalls/redes corporativas e ORB do Chrome. Cloudflare/Fastly funcionam
 * melhor como hotlink. Tentamos em ordem e a UI faz fallback automático
 * via onError quando uma falha.
 */
const MIRRORS = [
  "community.cloudflare.steamstatic.com",
  "community.fastly.steamstatic.com",
  "steamcdn-a.akamaihd.net",
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
