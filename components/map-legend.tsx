export function MapLegend() {
  return (
    <aside
      className="pointer-events-none fixed bottom-4 left-4 z-10 hidden rounded-xl border border-border/70 bg-background/90 px-3 py-2.5 shadow-lg shadow-foreground/5 backdrop-blur-xl sm:block"
      aria-label="Bench map legend"
    >
      <div className="flex items-center gap-4 text-xs font-medium">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-primary ring-2 ring-background" />
          Available
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-foreground ring-2 ring-background" />
          Adopted
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2.5 rounded-full bg-muted-foreground ring-2 ring-background" />
          In progress
        </span>
      </div>
    </aside>
  );
}
