import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchSkinById } from "../api/skins";
import { fetchPrice, type PriceData } from "../api/prices";
import { wearFromFloat, WEAR_RANGES } from "../types";
import type { Skin } from "../types";
import SkinViewer3D from "../components/SkinViewer3D";

export default function SkinDetailPage() {
  const { id } = useParams();
  const [skin, setSkin] = useState<Skin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [floatVal, setFloatVal] = useState(0.15);
  const [pattern, setPattern] = useState(420);
  const [stattrak, setStattrak] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);

  const [prices, setPrices] = useState<PriceData[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchSkinById(decodeURIComponent(id))
      .then((s) => {
        if (!s) {
          setError("Skin não encontrada.");
        } else {
          setSkin(s);
          setFloatVal(
            Math.max(s.min_float ?? 0, Math.min(s.max_float ?? 1, 0.15))
          );
        }
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  // Get base name (without "(Wear)" suffix and StatTrak prefix)
  const baseName = skin?.name?.replace(/\s*\(.*\)\s*$/, "") ?? "";

  useEffect(() => {
    if (!skin) return;
    setPricesLoading(true);
    setPrices([]);
    const wears = (skin.wears?.map((w) => w.name) as any) || [
      "Factory New",
      "Minimal Wear",
      "Field-Tested",
      "Well-Worn",
      "Battle-Scarred",
    ];
    Promise.all(
      wears.map((w: any) => fetchPrice(baseName, w, stattrak))
    ).then((results) => {
      setPrices(results.filter((r): r is PriceData => !!r));
      setPricesLoading(false);
    });
  }, [skin, stattrak, baseName]);

  if (loading) {
    return (
      <div className="text-center text-zinc-400 py-20">Carregando skin...</div>
    );
  }
  if (error || !skin) {
    return (
      <div className="text-center text-red-400 py-20">
        {error ?? "Erro"} ·{" "}
        <Link to="/" className="text-amber-400 hover:underline">
          Voltar
        </Link>
      </div>
    );
  }

  const minF = skin.min_float ?? 0;
  const maxF = skin.max_float ?? 1;
  const wearLabel = wearFromFloat(floatVal);

  return (
    <div className="space-y-6">
      <Link
        to="/"
        className="text-sm text-zinc-400 hover:text-amber-400 transition inline-flex items-center gap-1"
      >
        ← Voltar ao catálogo
      </Link>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 3D Viewer */}
        <div className="space-y-3">
          <SkinViewer3D
            imageUrl={skin.image}
            float={floatVal}
            pattern={pattern}
            rotateAuto={autoRotate}
          />
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Arraste para girar · Scroll para zoom</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRotate}
                onChange={(e) => setAutoRotate(e.target.checked)}
                className="accent-amber-500"
              />
              Auto-rotação
            </label>
          </div>
        </div>

        {/* Info & Controls */}
        <div className="space-y-4">
          <div>
            <span
              className="inline-block text-xs font-semibold uppercase tracking-wider mb-1"
              style={{ color: skin.rarity?.color }}
            >
              {skin.rarity?.name}
            </span>
            <h1 className="text-3xl font-bold leading-tight">{skin.name}</h1>
            <p className="text-zinc-400 mt-1">
              {skin.weapon?.name} · {skin.category?.name}
              {skin.pattern?.name && ` · ${skin.pattern.name}`}
            </p>
          </div>

          {skin.description && (
            <p className="text-sm text-zinc-400 italic border-l-2 border-zinc-800 pl-3">
              {skin.description}
            </p>
          )}

          {/* Float */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Float (Wear)</h3>
              <span className="text-xs text-zinc-400">
                {wearLabel} · {floatVal.toFixed(6)}
              </span>
            </div>
            <input
              type="range"
              min={minF}
              max={maxF}
              step={0.000001}
              value={floatVal}
              onChange={(e) => setFloatVal(parseFloat(e.target.value))}
            />
            <WearBar minF={minF} maxF={maxF} value={floatVal} />
            <div className="flex flex-wrap gap-1">
              {WEAR_RANGES.filter(
                (w) => !(w.max < minF || w.min > maxF)
              ).map((w) => (
                <button
                  key={w.name}
                  onClick={() =>
                    setFloatVal(Math.max(minF, Math.min(maxF, (w.min + w.max) / 2)))
                  }
                  className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  {w.name}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500">
              Faixa válida desta skin: {minF.toFixed(2)} – {maxF.toFixed(2)}
            </p>
          </div>

          {/* Pattern */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Pattern (Seed)</h3>
              <span className="text-xs text-zinc-400">#{pattern}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1000}
              step={1}
              value={pattern}
              onChange={(e) => setPattern(parseInt(e.target.value))}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setPattern(Math.floor(Math.random() * 1001))}
                className="text-xs px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-900 rounded font-medium transition"
              >
                Pattern aleatório
              </button>
              <input
                type="number"
                min={0}
                max={1000}
                value={pattern}
                onChange={(e) =>
                  setPattern(
                    Math.max(0, Math.min(1000, parseInt(e.target.value) || 0))
                  )
                }
                className="w-24 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
              />
            </div>
          </div>

          {/* Prices */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Preços (Steam Market)</h3>
              {skin.stattrak && (
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stattrak}
                    onChange={(e) => setStattrak(e.target.checked)}
                    className="accent-orange-500"
                  />
                  StatTrak™
                </label>
              )}
            </div>
            {pricesLoading ? (
              <p className="text-xs text-zinc-500">Carregando preços...</p>
            ) : prices.length === 0 ? (
              <p className="text-xs text-zinc-500">
                Indisponível (rate-limit do proxy CORS).
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-zinc-500 text-left">
                  <tr>
                    <th className="font-medium pb-1">Wear</th>
                    <th className="font-medium pb-1">Menor preço</th>
                    <th className="font-medium pb-1">Mediana</th>
                    <th className="font-medium pb-1">Vol</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((p) => (
                    <tr key={p.wear} className="border-t border-zinc-800">
                      <td className="py-1.5 text-zinc-300">{p.wear}</td>
                      <td className="py-1.5 text-amber-400">
                        {p.lowest_price ?? "—"}
                      </td>
                      <td className="py-1.5 text-zinc-400">
                        {p.median_price ?? "—"}
                      </td>
                      <td className="py-1.5 text-zinc-500">
                        {p.volume ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {skin.collections && skin.collections.length > 0 && (
            <div className="text-xs text-zinc-500">
              <span className="text-zinc-400">Coleção:</span>{" "}
              {skin.collections.map((c) => c.name).join(", ")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WearBar({
  minF,
  maxF,
  value,
}: {
  minF: number;
  maxF: number;
  value: number;
}) {
  const colors = ["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"];
  return (
    <div className="relative h-2 rounded overflow-hidden flex">
      {WEAR_RANGES.map((w, i) => {
        const lo = Math.max(w.min, minF);
        const hi = Math.min(w.max, maxF);
        const span = hi - lo;
        if (span <= 0) return null;
        const pct = (span / (maxF - minF)) * 100;
        return (
          <div
            key={w.name}
            style={{ width: `${pct}%`, background: colors[i] }}
            title={w.name}
          />
        );
      })}
      <div
        className="absolute top-0 h-full w-0.5 bg-white"
        style={{ left: `${((value - minF) / (maxF - minF)) * 100}%` }}
      />
    </div>
  );
}
