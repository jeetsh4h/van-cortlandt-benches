import { Clock3, Heart, Plus } from "lucide-react";

export function MapLegend() {
  return (
    <aside
      className="pointer-events-none fixed bottom-4 left-4 z-10 hidden rounded-xl border border-border/70 bg-background/90 px-3 py-2.5 shadow-lg shadow-foreground/5 backdrop-blur-xl sm:block"
      aria-label="Bench map legend"
    >
      <div className="flex items-center gap-4 text-xs font-medium">
        <span className="flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background">
            <Plus className="size-3" />
          </span>
          Available
        </span>
        <span className="flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded-full bg-celebration text-background ring-2 ring-background">
            <Heart className="size-2.5 fill-current" />
          </span>
          Adopted
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className="flex size-5 items-center justify-center rounded-full bg-progress text-background ring-2 ring-background">
            <Clock3 className="size-2.5" />
          </span>
          In progress
        </span>
      </div>
    </aside>
  );
}
