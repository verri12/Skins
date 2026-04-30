import { useMemo } from "react";
import { useSkinsStore } from "../store/useSkinsStore";

export default function Filters() {
  const { skins, filters, setFilter, resetFilters } = useSkinsStore();

  const options = useMemo(() => {
    const weapons = new Set<string>();
    const categories = new Set<string>();
    const rarities = new Map<string, string>();
    const collections = new Set<string>();
    for (const s of skins) {
      if (s.weapon?.name) weapons.add(s.weapon.name);
      if (s.category?.name) categories.add(s.category.name);
      if (s.rarity?.name) rarities.set(s.rarity.name, s.rarity.color);
      for (const c of s.collections || []) collections.add(c.name);
    }
    return {
      weapons: [...weapons].sort(),
      categories: [...categories].sort(),
      rarities: [...rarities.entries()],
      collections: [...collections].sort(),
    };
  }, [skins]);

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Filtros</h2>
          <button
            onClick={resetFilters}
            className="text-xs text-zinc-500 hover:text-amber-400 transition"
          >
            Limpar
          </button>
        </div>

        <Field label="Categoria">
          <select
            value={filters.category}
            onChange={(e) => setFilter("category", e.target.value)}
            className="select"
          >
            <option value="">Todas</option>
            {options.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Arma">
          <select
            value={filters.weapon}
            onChange={(e) => setFilter("weapon", e.target.value)}
            className="select"
          >
            <option value="">Todas</option>
            {options.weapons.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Raridade">
          <div className="space-y-1">
            <button
              onClick={() => setFilter("rarity", "")}
              className={`w-full text-left text-xs px-2 py-1.5 rounded transition ${
                !filters.rarity
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-800/50"
              }`}
            >
              Todas
            </button>
            {options.rarities.map(([name, color]) => (
              <button
                key={name}
                onClick={() => setFilter("rarity", name)}
                className={`w-full text-left text-xs px-2 py-1.5 rounded transition flex items-center gap-2 ${
                  filters.rarity === name
                    ? "bg-zinc-800"
                    : "hover:bg-zinc-800/50"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: color }}
                />
                <span className="text-zinc-300">{name}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Coleção">
          <select
            value={filters.collection}
            onChange={(e) => setFilter("collection", e.target.value)}
            className="select"
          >
            <option value="">Todas</option>
            {options.collections.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={filters.stattrak === true}
            onChange={(e) =>
              setFilter("stattrak", e.target.checked ? true : null)
            }
            className="accent-amber-500"
          />
          Apenas StatTrak™
        </label>
      </div>
    </aside>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
        {label}
      </label>
      {children}
      <style>{`
        .select {
          width: 100%;
          background: #18181b;
          border: 1px solid #27272a;
          color: #e4e4e7;
          padding: 6px 8px;
          font-size: 12px;
          border-radius: 6px;
          outline: none;
        }
        .select:focus { border-color: #f59e0b; }
      `}</style>
    </div>
  );
}
