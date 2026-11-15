/**
 * Skeleton Bento de carga inicial para la ruta `/reservas`.
 */
export default function ReservasLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando reservas"
      className="space-y-6 pb-20"
    >
      <div className="space-y-2">
        <div className="h-8 w-44 animate-pulse rounded-xl bg-secondary" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-lg bg-secondary/70" />
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-3xl border border-border bg-card p-5 sm:grid-cols-3">
        <div className="h-12 animate-pulse rounded-2xl bg-secondary" />
        <div className="h-12 animate-pulse rounded-2xl bg-secondary" />
        <div className="h-12 animate-pulse rounded-2xl bg-secondary" />
      </div>

      <div className="space-y-3">
        <div className="h-6 w-48 animate-pulse rounded-lg bg-secondary" />
        <div className="flex gap-2 overflow-hidden">
          <div className="h-11 w-24 shrink-0 animate-pulse rounded-full bg-secondary" />
          <div className="h-11 w-28 shrink-0 animate-pulse rounded-full bg-secondary" />
          <div className="h-11 w-28 shrink-0 animate-pulse rounded-full bg-secondary" />
          <div className="h-11 w-24 shrink-0 animate-pulse rounded-full bg-secondary" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="h-56 animate-pulse rounded-3xl border border-border bg-card p-5"
          />
        ))}
      </div>
    </div>
  );
}
