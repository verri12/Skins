import { Link } from "react-router-dom";
import type { Skin } from "../types";
import SkinImage from "./SkinImage";

interface Props {
  skin: Skin;
}

export default function SkinCard({ skin }: Props) {
  const color = skin.rarity?.color ?? "#71717a";
  return (
    <Link
      to={`/skin/${encodeURIComponent(skin.id)}`}
      className="group relative overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition flex flex-col"
      style={{ boxShadow: `inset 0 -3px 0 ${color}` }}
    >
      <div
        className="relative aspect-[4/3] flex items-center justify-center"
        style={{
          background: `radial-gradient(circle at center, ${color}33 0%, transparent 70%)`,
        }}
      >
        <SkinImage
          src={skin.image}
          size={360}
          alt={skin.name}
          loading="lazy"
          className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform"
        />
        {skin.stattrak && (
          <span className="absolute top-2 left-2 text-[10px] font-bold bg-orange-600/90 text-white px-1.5 py-0.5 rounded">
            StatTrak™
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color }}
        >
          {skin.rarity?.name}
        </span>
        <h3 className="text-sm font-semibold leading-tight line-clamp-2">
          {skin.name}
        </h3>
        <span className="text-xs text-zinc-500 mt-auto pt-1">
          {skin.weapon?.name}
        </span>
      </div>
    </Link>
  );
}
