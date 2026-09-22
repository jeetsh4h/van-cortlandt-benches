import { Armchair, Clock3, Heart } from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";

type AppHeaderProps = {
  availableCount: number;
  adoptedCount: number;
  inProgressCount: number;
  onResetMap: () => void;
  onShowAvailable: () => void;
};

export function AppHeader({
  availableCount,
  adoptedCount,
  inProgressCount,
  onResetMap,
  onShowAvailable,
}: AppHeaderProps) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-5">
      <button
        type="button"
        className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-border/70 bg-background/90 p-2 pr-3 text-left shadow-lg shadow-foreground/5 backdrop-blur-xl transition-colors hover:bg-background focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none sm:pr-4"
        onClick={onResetMap}
        aria-label="Show all of Van Cortlandt Park"
      >
        <Image
          src="/vcpa-mark.png"
          alt=""
          width={40}
          height={40}
          className="size-10"
          priority
        />
        <div>
          <p className="font-heading text-sm font-semibold tracking-tight">
            Van Cortlandt Park
          </p>
          <p className="text-xs text-muted-foreground">Adopt a bench</p>
        </div>
      </button>

      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border/70 bg-background/90 p-1.5 shadow-lg shadow-foreground/5 backdrop-blur-xl">
        <button
          type="button"
          onClick={onShowAvailable}
          aria-label={`Browse ${availableCount} available benches`}
          className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          <Badge variant="available" className="cursor-pointer">
            <Armchair aria-hidden="true" className="size-3" />
            {availableCount} available
          </Badge>
        </button>
        <Badge variant="adopted" className="hidden sm:inline-flex">
          <Heart aria-hidden="true" className="size-3 fill-current" />
          {adoptedCount} adopted
        </Badge>
        {inProgressCount ? (
          <Badge variant="progress" className="hidden sm:inline-flex">
            <Clock3 aria-hidden="true" className="size-3" />
            {inProgressCount} in progress
          </Badge>
        ) : null}
      </div>
    </header>
  );
}
