import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { withSize, STEAM_MIRROR_COUNT, proxiedImage } from "../utils/image";

interface Props {
  imageUrl: string;
  float: number; // 0..1 (visual wear)
  pattern: number; // 0..1000 (seed)
}

/**
 * SkinInspector2D
 * --------------------------------------------------------------------------
 * Inspetor 2D estilo csgoskins.gg: a skin é renderizada de frente (plano),
 * sem rotação. Um shader aplica:
 *   - Wear (float 0..1): escurece áreas com base em ruído procedural,
 *     simulando arranhões/desgaste. Fica mais intenso conforme o float sobe.
 *   - Pattern (seed 0..1000): muda offset/rotação/escala da textura,
 *     simulando a variação de pattern index do CS2.
 *
 * Não é uma reprodução 1:1 do shader proprietário do CS2; é uma aproximação
 * visual com a mesma intenção (educacional).
 */
export default function SkinInspector2D({ imageUrl, float, pattern }: Props) {
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
  uniform float uPattern;     // 0..1
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

  void main() {
    // -------- Pattern: muda offset/rotação/escala da textura --------
    // pattern=0.5 → identidade. Extremos = mais transformação.
    float p = uPattern;
    float angle = (p - 0.5) * 0.8;             // ~ -22°..22°
    float c = cos(angle);
    float s = sin(angle);
    mat2 rot = mat2(c, -s, s, c);

    vec2 centered = vUv - 0.5;
    float scale = 1.0 + (p - 0.5) * 0.35;
    vec2 transformed = rot * centered * scale + 0.5;
    transformed += vec2(p * 0.18 - 0.09, sin(p * 6.2831) * 0.05);

    // bordas: se sair da imagem, retorna ao alpha 0 ao invés de tilear
    if (transformed.x < 0.0 || transformed.x > 1.0 ||
        transformed.y < 0.0 || transformed.y > 1.0) {
      discard;
    }

    vec4 base = texture2D(uMap, transformed);
    if (base.a < 0.01) discard;

    // -------- Wear: arranhões + escurecimento por float --------
    float n = fbm(vUv * 14.0 + p * 53.0);
    float scratchMask = smoothstep(0.55 - uFloat * 0.5, 0.65, n);

    // borda mais marcada (bordas das skins desgastam primeiro)
    float edge = pow(1.0 - abs(vUv.y - 0.5) * 2.0, 0.35) *
                 pow(1.0 - abs(vUv.x - 0.5) * 2.0, 0.55);
    float edgeWear = (1.0 - edge) * uFloat;

    float wearMask = clamp(scratchMask * uFloat + edgeWear * 0.6, 0.0, 1.0);

    vec3 worn = mix(base.rgb, base.rgb * 0.3, wearMask);
    // leve dessaturação conforme desgaste
    float gray = dot(worn, vec3(0.299, 0.587, 0.114));
    worn = mix(worn, vec3(gray), wearMask * 0.35);

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
