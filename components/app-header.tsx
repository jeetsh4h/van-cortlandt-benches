import { Armchair, Clock3, Heart, Trees } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type AppHeaderProps = {
  availableCount: number;
  adoptedCount: number;
  inProgressCount: number;
};

export function AppHeader({
  availableCount,
  adoptedCount,
  inProgressCount,
}: AppHeaderProps) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-5">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-border/70 bg-background/90 p-2.5 pr-4 shadow-lg shadow-foreground/5 backdrop-blur-xl">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Trees aria-hidden="true" />
        </span>
        <div>
          <p className="font-heading text-sm font-semibold tracking-tight">
            Van Cortlandt Park
          </p>
          <p className="text-xs text-muted-foreground">Adopt a bench</p>
        </div>
      </div>

      <div className="pointer-events-auto hidden items-center gap-2 rounded-full border border-border/70 bg-background/90 p-1.5 shadow-lg shadow-foreground/5 backdrop-blur-xl sm:flex">
        <Badge variant="available">
          <Armchair aria-hidden="true" className="size-3" />
          {availableCount} available
        </Badge>
        <Badge variant="adopted">
          <Heart aria-hidden="true" className="size-3 fill-current" />
          {adoptedCount} adopted
        </Badge>
        {inProgressCount ? (
          <Badge variant="progress">
            <Clock3 aria-hidden="true" className="size-3" />
            {inProgressCount} in progress
          </Badge>
        ) : null}
      </div>
    </header>
  );
}
