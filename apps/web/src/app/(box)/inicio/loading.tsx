export default function InicioLoading() {
  return (
    <div className="space-y-6 pb-8" aria-busy="true" aria-label="Cargando panel">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-52 animate-pulse rounded-xl bg-secondary" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded-lg bg-secondary" />
        </div>
        <div className="h-11 w-40 animate-pulse rounded-full bg-secondary" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="h-72 animate-pulse rounded-3xl border border-border bg-card md:col-span-9" />
        <div className="grid grid-cols-1 gap-4 md:col-span-3">
          <div className="h-28 animate-pulse rounded-3xl border border-border bg-card" />
          <div className="h-28 animate-pulse rounded-3xl border border-border bg-card" />
        </div>
      </div>
    </div>
  );
}
