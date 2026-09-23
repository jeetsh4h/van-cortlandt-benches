"use client";

import {
  Armchair,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Heart,
  LoaderCircle,
  MapPin,
  Sparkles,
  X,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { AdoptionForm } from "@/components/adoption-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { reserveBench } from "@/lib/benches";
import { getBenchImage, getBenchStatus, type Bench } from "@/lib/bench-types";
import { BENCH_ADOPTION_MINIMUM, currencyFormatter } from "@/lib/contribution";
import { cn } from "@/lib/utils";

type BenchDetailsProps = {
  bench: Bench;
  position: number;
  total: number;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onPrevious: () => void;
  onNext: () => void;
};

type AdoptionStage = "details" | "reserving" | "form";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(date: string) {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`));
}

function getSessionToken() {
  const storageKey = "van-cortlandt-adoption-session";
  const existing = sessionStorage.getItem(storageKey);
  if (existing) {
    return existing;
  }

  const token = crypto.randomUUID();
  sessionStorage.setItem(storageKey, token);
  return token;
}

export function BenchDetails({
  bench,
  position,
  total,
  onClose,
  onChanged,
  onPrevious,
  onNext,
}: BenchDetailsProps) {
  const [stage, setStage] = useState<AdoptionStage>("details");
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const status = getBenchStatus(bench);

  async function startAdoption() {
    setStage("reserving");
    setError(null);
    const token = getSessionToken();

    try {
      const result = await reserveBench(bench.id, token);
      if (!result.success || !result.expires_at) {
        setStage("details");
        setError(result.message);
        await onChanged();
        return;
      }

      setSessionToken(token);
      setHoldExpiresAt(result.expires_at);
      setStage("form");
      await onChanged();
    } catch {
      setStage("details");
      setError("Could not hold this bench. Try again.");
    }
  }

  function resetAdoption(message?: string) {
    setStage("details");
    setHoldExpiresAt(null);
    setSessionToken(null);
    setError(message ?? null);
    void onChanged().catch(() => undefined);
  }

  return (
    <aside
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-3xl border border-border/70 bg-background/95 shadow-2xl shadow-foreground/10 backdrop-blur-xl sm:inset-y-4 sm:right-4 sm:left-auto sm:h-auto sm:w-104 sm:rounded-3xl",
        stage === "form" ? "h-[calc(100dvh-0.75rem)]" : "h-[56dvh]",
      )}
      aria-label={`Details for ${bench.name}`}
    >
      <div className="z-10 flex shrink-0 items-center justify-between gap-2 border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur-xl sm:px-5">
        <Badge
          variant={
            stage === "form" ? "progress"
            : status === "adopted" ?
              "adopted"
            : status === "in-progress" ?
              "progress"
            : "available"
          }
        >
          {stage === "form" ?
            "Reserved"
          : status === "adopted" ?
            "Adopted"
          : status === "in-progress" ?
            "In progress"
          : "Available"}
        </Badge>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevious}
            aria-label="Previous bench"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground">
            {position}/{total}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            aria-label="Next bench"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close bench details"
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {stage === "form" && sessionToken && holdExpiresAt ?
          <div className="p-4 sm:p-6">
            <AdoptionForm
              bench={bench}
              sessionToken={sessionToken}
              holdExpiresAt={holdExpiresAt}
              onCancel={() => resetAdoption()}
              onExpired={() =>
                resetAdoption("Your hold expired. You can start again.")
              }
              onComplete={onChanged}
              onDone={onClose}
            />
          </div>
        : <div className="flex flex-col gap-4 p-4 pb-5 sm:gap-6 sm:p-6">
            <figure className="relative h-28 shrink-0 overflow-hidden rounded-2xl bg-muted sm:aspect-3/2 sm:h-auto">
              <Image
                src={getBenchImage(bench.area)}
                alt={`Illustrative view of a park bench in ${bench.area}`}
                fill
                sizes="(max-width: 639px) 100vw, 416px"
                className="object-cover"
                priority
              />
              <figcaption className="absolute right-2 bottom-2 rounded-full bg-background/85 px-2 py-1 text-[0.625rem] font-medium text-muted-foreground backdrop-blur-md">
                Illustrative view
              </figcaption>
            </figure>

            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                {bench.id}
              </p>
              <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
                {bench.name}
              </h1>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin
                  aria-hidden="true"
                  className="size-4"
                />
                {bench.area}
              </p>
            </div>

            <Separator />

            {status === "adopted" && bench.plaque_message ?
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-3 rounded-2xl bg-celebration/10 p-4 text-celebration-foreground">
                  <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-celebration/20">
                    <Heart
                      aria-hidden="true"
                      className="size-5 fill-current"
                    />
                    <Sparkles className="absolute -top-1 -right-1 size-3 motion-safe:animate-pulse" />
                  </span>
                  <p className="font-heading font-semibold">
                    Cared for by a park patron
                  </p>
                </div>
                <blockquote className="font-plaque text-xl leading-relaxed font-medium">
                  “{bench.plaque_message}”
                </blockquote>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Adopted by</p>
                    <p className="mt-1 font-medium">{bench.adopter_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Through</p>
                    <p className="mt-1 font-medium">
                      {bench.adoption_end ?
                        formatDate(bench.adoption_end)
                      : null}
                    </p>
                  </div>
                </div>
              </div>
            : status === "in-progress" ?
              <div className="flex flex-col items-center gap-4 rounded-2xl bg-progress/10 py-7 text-center text-progress-foreground">
                <span className="relative flex size-12 items-center justify-center rounded-full bg-progress/15">
                  <span className="absolute inset-0 rounded-full border border-progress/30 motion-safe:animate-ping" />
                  <Clock3 aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-heading text-lg font-semibold">
                    Adoption in progress
                  </h2>
                  <p className="mt-1 text-sm opacity-75">
                    A patron is choosing their words.
                  </p>
                </div>
              </div>
            : <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Armchair aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-heading font-semibold">
                    Available to adopt
                  </h2>
                  <p className="mt-1 text-sm font-medium text-primary">
                    {currencyFormatter.format(BENCH_ADOPTION_MINIMUM)} minimum ·
                    10 years
                  </p>
                </div>
              </div>
            }

            {error ?
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                {error}
              </p>
            : null}

            <p className="text-xs text-muted-foreground">
              Location: {bench.latitude.toFixed(5)},{" "}
              {bench.longitude.toFixed(5)}
            </p>
          </div>
        }
      </div>

      {stage !== "form" && status === "available" ?
        <div className="shrink-0 border-t border-border/70 bg-background/95 p-3 backdrop-blur-xl sm:p-4">
          <Button
            size="wide"
            onClick={startAdoption}
            disabled={stage === "reserving"}
          >
            {stage === "reserving" ?
              <LoaderCircle
                className="animate-spin"
                aria-hidden="true"
              />
            : null}
            Adopt this bench
          </Button>
        </div>
      : null}
    </aside>
  );
}
