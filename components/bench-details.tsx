"use client";

import {
  Armchair,
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

type BenchDetailsProps = {
  bench: Bench;
  onClose: () => void;
  onChanged: () => Promise<void>;
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

export function BenchDetails({ bench, onClose, onChanged }: BenchDetailsProps) {
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

  async function completeAdoption() {
    await onChanged();
  }

  return (
    <aside
      className="fixed inset-x-0 bottom-0 z-30 max-h-[72dvh] overflow-y-auto rounded-t-3xl border border-border/70 bg-background/95 shadow-2xl shadow-foreground/10 backdrop-blur-xl sm:inset-y-4 sm:right-4 sm:left-auto sm:max-h-none sm:w-96 sm:rounded-3xl"
      aria-label={`Details for ${bench.name}`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/70 bg-background/95 px-5 py-4 backdrop-blur-xl">
        <Badge
          variant={
            status === "adopted" ? "adopted"
            : status === "in-progress" ?
              "progress"
            : "available"
          }
        >
          {status === "adopted" ?
            "Adopted"
          : status === "in-progress" ?
            "In progress"
          : "Available"}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close bench details"
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      <div className="flex flex-col gap-6 p-5 sm:p-6">
        <figure className="relative aspect-3/2 overflow-hidden rounded-2xl bg-muted">
          <Image
            src={getBenchImage(bench.area)}
            alt={`Illustrative view of a park bench in ${bench.area}`}
            fill
            sizes="(max-width: 639px) 100vw, 384px"
            className="object-cover"
            priority
          />
          <figcaption className="absolute right-2 bottom-2 rounded-full bg-background/85 px-2 py-1 text-[0.625rem] font-medium text-muted-foreground backdrop-blur-md">
            Illustrative view
          </figcaption>
        </figure>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {bench.id}
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
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

        {stage === "form" && sessionToken && holdExpiresAt ?
          <AdoptionForm
            bench={bench}
            sessionToken={sessionToken}
            holdExpiresAt={holdExpiresAt}
            onCancel={() => {
              setStage("details");
              setHoldExpiresAt(null);
              setSessionToken(null);
              void onChanged().catch(() => undefined);
            }}
            onComplete={completeAdoption}
            onDone={onClose}
          />
        : status === "adopted" && bench.plaque_message ?
          <div className="flex flex-col gap-6">
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
            <blockquote className="font-heading text-xl leading-relaxed font-medium tracking-tight">
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
                  {bench.adoption_end ? formatDate(bench.adoption_end) : null}
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
        : <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
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
            {error ?
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                {error}
              </p>
            : null}
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
        }

        <p className="text-xs text-muted-foreground">
          Location: {bench.latitude.toFixed(5)}, {bench.longitude.toFixed(5)}
        </p>
      </div>
    </aside>
  );
}
