import { cn } from "@/lib/utils";
import { getPlaqueLines, MAX_PLAQUE_LINES } from "@/lib/plaque";

type PlaquePreviewProps = {
  message: string;
};

function PlaqueScrew({ position }: { position: string }) {
  return (
    <span
      className={cn(
        "absolute size-3 rounded-full border border-plaque-edge bg-plaque-screw shadow-sm after:absolute after:top-1/2 after:left-1/2 after:h-px after:w-1.5 after:-translate-x-1/2 after:-translate-y-1/2 after:rotate-45 after:bg-plaque-edge",
        position,
      )}
      aria-hidden="true"
    />
  );
}

export function PlaquePreview({ message }: PlaquePreviewProps) {
  const lines = getPlaqueLines(message).slice(0, MAX_PLAQUE_LINES);
  const longestLine = Math.max(...lines.map((line) => Array.from(line).length));
  const fontSize =
    lines.length <= 2 && longestLine <= 19 ? "text-lg"
    : lines.length <= 4 && longestLine <= 26 ? "text-sm"
    : lines.length <= 6 ? "text-xs"
    : "text-[0.625rem]";

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative aspect-5/2 w-full overflow-hidden rounded-sm border border-plaque-edge bg-plaque px-8 py-4 shadow-inner">
        <PlaqueScrew position="top-2 left-2" />
        <PlaqueScrew position="top-2 right-2" />
        <PlaqueScrew position="bottom-2 left-2" />
        <PlaqueScrew position="right-2 bottom-2" />
        <div
          className={cn(
            "flex h-full flex-col items-center justify-center text-center font-plaque leading-tight font-medium tracking-normal text-plaque-foreground",
            fontSize,
            !message && "opacity-40",
          )}
          aria-label="Plaque preview"
        >
          {(message ? lines : ["Your words belong here"]).map((line, index) => (
            <span key={`${line}-${index}`}>{line || "\u00A0"}</span>
          ))}
        </div>
      </div>
      <figcaption className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Live plaque proof</span>
        <span>{lines.length}/7 lines</span>
      </figcaption>
    </figure>
  );
}
