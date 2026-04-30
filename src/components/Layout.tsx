import { Link, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center font-black text-zinc-900">
              CS
            </div>
            <span className="font-bold text-lg tracking-tight group-hover:text-amber-400 transition">
              Skins Viewer
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-4 text-sm text-zinc-400">
            <Link to="/" className="hover:text-amber-400 transition">
              Catálogo
            </Link>
            <a
              href="https://github.com/ByMykel/CSGO-API"
              target="_blank"
              rel="noreferrer"
              className="hover:text-amber-400 transition"
            >
              API
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-zinc-800 py-4 text-center text-xs text-zinc-500">
        Projeto educacional · Dados:{" "}
        <a
          href="https://bymykel.github.io/CSGO-API/"
          target="_blank"
          rel="noreferrer"
          className="text-amber-500 hover:underline"
        >
          ByMykel/CSGO-API
        </a>
        . Não afiliado à Valve.
        . Desenvolvido por <a href="https://github.com/verri12" target="_blank" rel="noreferrer" className="text-amber-500 hover:underline">Vinicius Verri</a>.
      </footer>
    </div>
  );
}
