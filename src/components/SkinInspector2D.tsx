import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { withSize, STEAM_MIRROR_COUNT, proxiedImage } from "../utils/image";

interface Props {
  imageUrl: string;
  float: number; // 0..1 (visual wear)
  pattern: number; // 0..1000 (seed)
  /**
   * URL de uma imagem renderizada server-side pela Steam (vinda da CSFloat
   * via inspect link). Quando fornecida, mostramos a imagem REAL do item
   * naquele float/pattern e desabilitamos a simulação por shader.
   */
  realImageUrl?: string | null;
}

/**
 * SkinInspector2D
 * --------------------------------------------------------------------------
 * Modo 1 — Imagem REAL (quando `realImageUrl` é fornecida):
 *   Mostra a imagem renderizada server-side pela Steam (mesma fonte usada
 *   por csgoskins.gg, csfloat, etc). Reflete float/pattern reais do item.
 *
 * Modo 2 — Simulação (sem `realImageUrl`):
 *   Renderiza a imagem genérica do market com um shader procedural que
 *   aproxima wear (arranhões/edge wear) e pattern (rotação/offset). Útil
 *   para "brincar" com os sliders sem precisar de inspect link.
 */
export default function SkinInspector2D({
  imageUrl,
  float,
  pattern,
  realImageUrl,
}: Props) {
  // ============= MODO REAL =============
  if (realImageUrl) {
    return (
      <div className="w-full aspect-[4/3] bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-lg border border-amber-500/30 overflow-hidden relative">
        <img
          src={realImageUrl}
          alt="Skin renderizada pela Steam"
          className="w-full h-full object-contain"
          loading="eager"
        />
        <div className="absolute top-2 left-2 bg-amber-500/90 text-zinc-950 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
          Imagem real · Steam
        </div>
      </div>
    );
  }

  // ============= MODO SIMULAÇÃO (shader) =============
  return <SkinSimulationCanvas imageUrl={imageUrl} float={float} pattern={pattern} />;
}

function SkinSimulationCanvas({
  imageUrl,
  float,
  pattern,
}: {
  imageUrl: string;
  float: number;
  pattern: number;
}) {
  const texture = useSteamTexture(imageUrl);
  const aspect = useMemo(() => {
    if (!texture?.image) return 4 / 3;
    const w = (texture.image as HTMLImageElement).naturalWidth || 4;
    const h = (texture.image as HTMLImageElement).naturalHeight || 3;
    return w / h;
  }, [texture]);

  return (
    <div className="w-full aspect-[4/3] bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-lg border border-zinc-800 overflow-hidden relative">
      {!texture && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500 z-10">
          Carregando textura...
        </div>
      )}
      <div className="absolute top-2 left-2 bg-zinc-800/80 text-zinc-300 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded">
        Simulação
      </div>
      <Canvas
        orthographic
        camera={{ position: [0, 0, 5], zoom: 220, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
      >
        <ambientLight intensity={1} />
        {texture && (
          <SkinPlane
            texture={texture}
            aspect={aspect}
            float={float}
            pattern={pattern}
          />
        )}
      </Canvas>
    </div>
  );
}

/**
 * Carrega a textura via proxy `/api/image` (sem CORS) com fallback para
 * mirrors diretos do Steam CDN.
 */
function useSteamTexture(imageUrl: string): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTexture(null);
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    const tryMirror = (i: number) => {
      if (cancelled) return;
      if (i >= STEAM_MIRROR_COUNT + 1) {
        setTexture(makeFallbackTexture());
        return;
      }
      const src =
        i === 0 ? proxiedImage(imageUrl, 512) : withSize(imageUrl, 512, i - 1);
      loader.load(
        src,
        (t) => {
          if (cancelled) return;
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 8;
          setTexture(t);
        },
        undefined,
        () => tryMirror(i + 1)
      );
    };
    tryMirror(0);
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return texture;
}

function makeFallbackTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, "#52525b");
  grad.addColorStop(1, "#27272a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "bold 18px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("imagem indisponível", 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uFloat;       // 0..1
  uniform float uPattern;     // 0..1 (paintseed / 1000)
  varying vec2 vUv;

  // ------------- noise utils -------------
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      v += amp * noise(p);
      p *= 2.0;
      amp *= 0.5;
    }
    return v;
  }

  // Pattern aleatório porém estável: hash do seed gera offsets e ângulos
  // únicos por seed, simulando como o jogo posiciona a textura.
  vec3 patternParams(float seed) {
    float a = fract(sin(seed * 12.9898) * 43758.5453);
    float b = fract(sin(seed * 78.233 + 1.0) * 43758.5453);
    float c = fract(sin(seed * 39.346 + 2.0) * 43758.5453);
    return vec3(a, b, c);
  }

  void main() {
    // ============ PATTERN: deslocamento + rotação + escala ============
    // Cada seed gera uma combinação única e estável de transformações.
    vec3 pp = patternParams(uPattern * 1000.0);
    float angle = (pp.x - 0.5) * 1.6;          // ~ -45°..45°
    float c = cos(angle);
    float s = sin(angle);
    mat2 rot = mat2(c, -s, s, c);

    vec2 centered = vUv - 0.5;
    float scale = 0.85 + pp.y * 0.45;          // 0.85..1.30
    vec2 transformed = rot * centered * scale + 0.5;
    transformed += vec2(pp.x - 0.5, pp.z - 0.5) * 0.30;

    // Fora dos limites da imagem → descarta (não tilear)
    if (transformed.x < 0.0 || transformed.x > 1.0 ||
        transformed.y < 0.0 || transformed.y > 1.0) {
      discard;
    }

    vec4 base = texture2D(uMap, transformed);
    if (base.a < 0.01) discard;

    // ============ FLOAT (WEAR): arranhões + dessaturação ============
    // 0.00 → impecável | 1.00 → completamente destruído.
    // Mistura três camadas de ruído em escalas diferentes para parecer
    // arranhões reais.
    float n1 = fbm(vUv * 8.0  + pp.x * 100.0);
    float n2 = fbm(vUv * 24.0 + pp.y * 100.0);
    float n3 = fbm(vUv * 60.0 + pp.z * 100.0);
    float scratch = (n1 * 0.5 + n2 * 0.35 + n3 * 0.15);
    float scratchMask = smoothstep(0.55 - uFloat * 0.7, 0.65, scratch);

    // Edge wear — bordas desgastam primeiro (igual ao CS2)
    float edge = pow(1.0 - abs(vUv.y - 0.5) * 2.0, 0.35) *
                 pow(1.0 - abs(vUv.x - 0.5) * 2.0, 0.55);
    float edgeWear = (1.0 - edge) * uFloat * 1.2;

    float wearMask = clamp(scratchMask * uFloat * 1.4 + edgeWear * 0.8, 0.0, 1.0);

    // Aplica desgaste:
    //  - escurece (mistura com cor da arma metálica)
    //  - dessatura (perde brilho)
    //  - reduz brilho geral
    vec3 metal = vec3(0.18, 0.16, 0.14);
    vec3 worn = mix(base.rgb, metal, wearMask * 0.85);
    float gray = dot(worn, vec3(0.299, 0.587, 0.114));
    worn = mix(worn, vec3(gray), wearMask * 0.55);
    worn *= (1.0 - uFloat * 0.25);

    // Brilho geral diminui conforme float aumenta (skin nova brilha mais)
    float shine = (1.0 - uFloat) * 0.15;
    worn += vec3(shine);

    gl_FragColor = vec4(worn, base.a);
  }
`;

function SkinPlane({
  texture,
  aspect,
  float,
  pattern,
}: {
  texture: THREE.Texture;
  aspect: number;
  float: number;
  pattern: number;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uFloat: { value: float },
      uPattern: { value: pattern / 1000 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [texture]
  );

  // Atualiza uniforms imediatamente quando float/pattern mudam (durante drag).
  useEffect(() => {
    if (matRef.current) {
      matRef.current.uniforms.uFloat.value = float;
      matRef.current.uniforms.uPattern.value = pattern / 1000;
    }
  }, [float, pattern]);

  // Garante render contínuo enquanto o usuário arrasta (r3f por padrão só
  // re-renderiza quando algo muda — isto força frames consistentes).
  useFrame(() => {
    if (matRef.current) {
      matRef.current.uniforms.uFloat.value = float;
      matRef.current.uniforms.uPattern.value = pattern / 1000;
    }
  });

  // Plano com aspect ratio da textura. Tamanho em "unidades" — a câmera
  // ortográfica com zoom=220 dá o enquadramento certo no aspect 4:3.
  const w = aspect >= 1 ? 2.6 : 2.6 * aspect;
  const h = aspect >= 1 ? 2.6 / aspect : 2.6;

  return (
    <mesh>
      <planeGeometry args={[w, h]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
      />
    </mesh>
  );
}
