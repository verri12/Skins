import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { withSize, STEAM_MIRROR_COUNT } from "../utils/image";

interface Props {
  imageUrl: string;
  float: number; // 0..1 (visual wear)
  pattern: number; // 0..1000 (seed)
  rotateAuto?: boolean;
}

/**
 * SkinViewer3D
 * --------------------------------------------------------------------------
 * Renderiza a textura da skin sobre um modelo (placeholder de arma) usando
 * um ShaderMaterial customizado que simula:
 *  - Float (desgaste): valor 0..1 que escurece áreas com base em ruído procedural,
 *    aumentando a quantidade de "scratches" conforme o float aumenta.
 *  - Pattern (seed): valor 0..1000 que afeta offset/rotação/escala da textura,
 *    simulando a variação de pattern index do CS2.
 *
 * Observação: o jogo usa shaders proprietários (CSGO finishes) e seeds que
 * indexam pontos específicos da textura. Esta é uma aproximação visual
 * educacional e não reproduz fielmente a renderização do jogo.
 */
export default function SkinViewer3D({
  imageUrl,
  float,
  pattern,
  rotateAuto = true,
}: Props) {
  const texture = useSteamTexture(imageUrl);

  return (
    <div className="w-full aspect-[4/3] bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden relative">
      {!texture && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500 z-10">
          Carregando textura...
        </div>
      )}
      <Canvas
        camera={{ position: [0, 0.4, 3.2], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["#09090b"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 4, 5]} intensity={1.1} />
        <directionalLight position={[-3, -2, -3]} intensity={0.4} />

        {texture && (
          <SkinMesh
            texture={texture}
            float={float}
            pattern={pattern}
            rotateAuto={rotateAuto}
          />
        )}

        <OrbitControls
          enablePan={false}
          minDistance={1.8}
          maxDistance={6}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
}

/**
 * Carrega a textura tentando múltiplos mirrors do Steam CDN. Se todos falharem,
 * gera uma textura procedural (fallback) para o 3D continuar funcional.
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
      if (i >= STEAM_MIRROR_COUNT) {
        // todos os mirrors falharam → fallback procedural
        setTexture(makeFallbackTexture());
        return;
      }
      loader.load(
        withSize(imageUrl, 512, i),
        (t) => {
          if (cancelled) return;
          t.colorSpace = THREE.SRGBColorSpace;
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
  ctx.fillText("imagem bloqueada", 128, 120);
  ctx.fillText("pela rede", 128, 144);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalMatrix * normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uFloat;       // 0..1
  uniform float uPattern;     // 0..1
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;

  // Hash / noise utilities
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
    // Pattern affects texture transform: rotation, scale, offset
    float angle = uPattern * 6.2831853;
    float c = cos(angle);
    float s = sin(angle);
    mat2 rot = mat2(c, -s, s, c);

    vec2 centered = vUv - 0.5;
    float scale = 1.0 + (uPattern - 0.5) * 0.4;
    vec2 transformed = rot * centered * scale + 0.5;
    transformed += vec2(uPattern * 0.2 - 0.1, (1.0 - uPattern) * 0.15 - 0.075);
    transformed = fract(transformed);

    vec4 base = texture2D(uMap, transformed);

    // Wear: dark scratches and edge wear modulated by float
    float n = fbm(vUv * 18.0 + uPattern * 100.0);
    float scratches = smoothstep(0.45 - uFloat * 0.45, 0.55, n);
    float edgeWear = pow(1.0 - abs(vUv.y - 0.5) * 2.0, 0.4);
    edgeWear *= pow(1.0 - abs(vUv.x - 0.5) * 2.0, 0.6);
    float wearMask = scratches * (0.55 + 0.45 * edgeWear) * uFloat;

    vec3 worn = mix(base.rgb, base.rgb * 0.35, wearMask);

    // Subtle metallic highlight
    float light = clamp(dot(normalize(vNormal), normalize(vec3(0.5, 0.8, 0.6))), 0.0, 1.0);
    worn += vec3(0.07) * light;

    gl_FragColor = vec4(worn, 1.0);
  }
`;

function SkinMesh({
  texture,
  float,
  pattern,
  rotateAuto,
}: {
  texture: THREE.Texture;
  float: number;
  pattern: number;
  rotateAuto: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uFloat: { value: float },
      uPattern: { value: pattern / 1000 },
      uTime: { value: 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [texture]
  );

  useFrame((state, delta) => {
    if (matRef.current) {
      matRef.current.uniforms.uFloat.value = float;
      matRef.current.uniforms.uPattern.value = pattern / 1000;
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
    if (meshRef.current && rotateAuto) {
      meshRef.current.rotation.y += delta * 0.25;
    }
  });

  // Use a long, flat box to resemble a weapon body (placeholder for a real GLB).
  return (
    <mesh ref={meshRef} rotation={[0.1, 0.4, 0]}>
      <boxGeometry args={[2.4, 0.7, 0.18]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}
