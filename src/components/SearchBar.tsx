import { useSkinsStore } from "../store/useSkinsStore";

export default function SearchBar() {
  const { filters, setFilter } = useSkinsStore();
  return (
    <div className="relative w-full">
      <input
        type="search"
        placeholder="Buscar skin (ex: AK-47 Redline)..."
        value={filters.search}
        onChange={(e) => setFilter("search", e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 outline-none rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 transition"
      />
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    </div>
  );
}
