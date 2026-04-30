interface Props {
  page: number;
  totalPages: number;
  onChange: (n: number) => void;
}

export default function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;
  const go = (n: number) =>
    onChange(Math.min(Math.max(1, n), totalPages));

  const pages: (number | "...")[] = [];
  const push = (n: number | "...") => pages.push(n);
  const range = (a: number, b: number) =>
    Array.from({ length: b - a + 1 }, (_, i) => a + i);

  if (totalPages <= 7) {
    range(1, totalPages).forEach(push);
  } else {
    push(1);
    if (page > 3) push("...");
    range(Math.max(2, page - 1), Math.min(totalPages - 1, page + 1)).forEach(
      push
    );
    if (page < totalPages - 2) push("...");
    push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        onClick={() => go(page - 1)}
        disabled={page === 1}
        className="px-3 py-1.5 text-sm rounded bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-40 hover:border-zinc-700"
      >
        ‹
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={i} className="px-2 text-zinc-600">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => go(p)}
            className={`min-w-[36px] px-2 py-1.5 text-sm rounded border transition ${
              p === page
                ? "bg-amber-500 border-amber-500 text-zinc-900 font-bold"
                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => go(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-1.5 text-sm rounded bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-40 hover:border-zinc-700"
      >
        ›
      </button>
    </div>
  );
}
