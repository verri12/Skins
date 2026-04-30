import { useEffect, useMemo } from "react";
import { useSkinsStore, applyFilters } from "../store/useSkinsStore";
import SkinCard from "../components/SkinCard";
import Filters from "../components/Filters";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";

export default function HomePage() {
  const { skins, loading, error, filters, page, pageSize, load, setPage } =
    useSkinsStore();

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => applyFilters(skins, filters),
    [skins, filters]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <Filters />

      <section className="flex-1 min-w-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <SearchBar />
          <span className="text-xs text-zinc-500 whitespace-nowrap">
            {loading
              ? "Carregando..."
              : `${filtered.length.toLocaleString("pt-BR")} skins`}
          </span>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-900 text-red-300 text-sm rounded-lg p-3">
            Erro ao carregar skins: {error}
          </div>
        )}

        {loading && skins.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] bg-zinc-900 border border-zinc-800 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : pageItems.length === 0 ? (
          <div className="text-center text-zinc-500 py-20">
            Nenhuma skin encontrada com esses filtros.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {pageItems.map((s) => (
              <SkinCard key={s.id} skin={s} />
            ))}
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={setPage}
        />
      </section>
    </div>
  );
}
