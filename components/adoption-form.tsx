"use client";

import { CalendarDays, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { ContributionReceipt } from "@/components/contribution-receipt";
import { PaymentMethodPicker } from "@/components/payment-method-picker";
import { PlaquePreview } from "@/components/plaque-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { releaseBenchHold, submitAdoption } from "@/lib/benches";
import type {
  AdoptionResult,
  Bench,
  PaymentMethod,
} from "@/lib/bench-types";
import {
  BENCH_ADOPTION_MINIMUM,
  currencyFormatter,
  DEFAULT_ADOPTION_YEARS,
  paymentMethodLabels,
} from "@/lib/contribution";
import {
  getPlaqueLines,
  isPlaqueMessageValid,
  MAX_PLAQUE_CHARACTERS,
  MAX_PLAQUE_LINES,
} from "@/lib/plaque";
import { cn } from "@/lib/utils";

type AdoptionFormProps = {
  bench: Bench;
  sessionToken: string;
  holdExpiresAt: string;
  onCancel: () => void;
  onComplete: () => Promise<void>;
  onDone: () => void;
};

type FlowStage = "tribute" | "payment" | "review" | "processing" | "receipt";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function calendarEndDate(count: number, unit: "month" | "year") {
  const start = new Date();
  const year = start.getFullYear();
  const month = start.getMonth();
  const day = start.getDate();
  const targetMonth = unit === "month" ? month + count : month;
  const targetYear = unit === "year" ? year + count : year;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();

  return new Date(
    Date.UTC(targetYear, targetMonth, Math.min(day, lastDay)),
  );
}

function FlowProgress({ stage }: { stage: FlowStage }) {
  const activeIndex = ["tribute", "payment", "review"].indexOf(stage);

  return (
    <div className="grid grid-cols-3 gap-2" aria-label="Adoption progress">
      {["Plaque", "Contribution", "Review"].map((label, index) => (
        <div key={label} className="flex flex-col gap-1.5">
          <span
            className={cn(
              "h-1 rounded-full transition-colors",
              index <= activeIndex || activeIndex === -1
                ? "bg-primary"
                : "bg-muted",
            )}
          />
          <span className="text-[0.625rem] font-medium text-muted-foreground">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AdoptionForm({
  bench,
  sessionToken,
  holdExpiresAt,
  onCancel,
  onComplete,
  onDone,
}: AdoptionFormProps) {
  const [stage, setStage] = useState<FlowStage>("tribute");
  const [patronName, setPatronName] = useState("");
  const [durationCount, setDurationCount] = useState(DEFAULT_ADOPTION_YEARS);
  const [durationUnit, setDurationUnit] = useState<"month" | "year">("year");
  const [plaqueMessage, setPlaqueMessage] = useState("");
  const [contributionAmount, setContributionAmount] = useState(
    BENCH_ADOPTION_MINIMUM,
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<AdoptionResult | null>(null);
  const ownsHoldRef = useRef(true);

  useEffect(() => {
    return () => {
      if (ownsHoldRef.current) {
        void releaseBenchHold(bench.id, sessionToken).catch(() => undefined);
      }
    };
  }, [bench.id, sessionToken]);

  async function handleCancel() {
    ownsHoldRef.current = false;
    await releaseBenchHold(bench.id, sessionToken).catch(() => undefined);
    onCancel();
  }

  function handlePlaqueChange(value: string) {
    if (Array.from(value).length > MAX_PLAQUE_CHARACTERS) {
      setError(`${MAX_PLAQUE_CHARACTERS} characters maximum.`);
      return;
    }

    if (getPlaqueLines(value).length > MAX_PLAQUE_LINES) {
      setError(`${MAX_PLAQUE_LINES} plaque lines maximum, including wrapping.`);
      return;
    }

    setError(null);
    setPlaqueMessage(value);
  }

  function showPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (patronName.trim().length < 2 || !isPlaqueMessageValid(plaqueMessage)) {
      setError("Add your name and a plaque message that fits the proof.");
      return;
    }

    setError(null);
    setStage("payment");
  }

  function showReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (contributionAmount < BENCH_ADOPTION_MINIMUM) {
      setError(`The minimum contribution is ${currencyFormatter.format(BENCH_ADOPTION_MINIMUM)}.`);
      return;
    }

    setError(null);
    setStage("review");
  }

  async function confirmContribution() {
    setStage("processing");
    setError(null);

    await new Promise((resolve) => window.setTimeout(resolve, 900));

    try {
      const result = await submitAdoption({
        benchId: bench.id,
        sessionToken,
        adopterName: patronName,
        plaqueMessage,
        durationCount,
        durationUnit,
        contributionAmount,
        paymentMethod,
        isAnonymous,
      });

      if (!result.success) {
        setError(result.message);
        setStage("review");
        return;
      }

      ownsHoldRef.current = false;
      setReceipt(result);
      setStage("receipt");
      await onComplete();
    } catch {
      setError("Could not complete the adoption. Try again.");
      setStage("review");
    }
  }

  const endDate = calendarEndDate(durationCount, durationUnit);
  const holdTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(holdExpiresAt));

  if (stage === "receipt" && receipt) {
    return (
      <ContributionReceipt
        bench={bench}
        result={receipt}
        patronName={patronName}
        onDone={onDone}
      />
    );
  }

  if (stage === "processing") {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-5 text-center" aria-live="polite">
        <span className="relative flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <span className="absolute inset-0 rounded-full border border-primary/30 motion-safe:animate-ping" />
          <LoaderCircle className="size-7 animate-spin" aria-hidden="true" />
        </span>
        <p className="font-heading text-lg font-semibold">Preparing your bench</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <FlowProgress stage={stage} />

      <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <LockKeyhole aria-hidden="true" className="size-3.5" />
          Held until {holdTime}
        </span>
        <span>10-year standard</span>
      </div>

      {stage === "tribute" ? (
        <form className="flex animate-in flex-col gap-5 fade-in" onSubmit={showPayment}>
          <PlaquePreview message={plaqueMessage} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="adopterName">Patron name</Label>
            <Input
              id="adopterName"
              name="adopterName"
              autoComplete="name"
              minLength={2}
              maxLength={80}
              value={patronName}
              onChange={(event) => setPatronName(event.target.value)}
              placeholder="Name or family"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="plaqueMessage">Plaque message</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {Array.from(plaqueMessage).length}/{MAX_PLAQUE_CHARACTERS}
              </span>
            </div>
            <Textarea
              id="plaqueMessage"
              name="plaqueMessage"
              value={plaqueMessage}
              onChange={(event) => handlePlaqueChange(event.target.value)}
              minLength={2}
              maxLength={MAX_PLAQUE_CHARACTERS}
              placeholder="A short dedication"
              required
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Term</legend>
            <div className="grid grid-cols-[1fr_1.4fr] gap-2">
              <Input
                aria-label="Duration count"
                type="number"
                min={1}
                max={durationUnit === "year" ? 10 : 120}
                step={1}
                value={durationCount}
                onChange={(event) =>
                  setDurationCount(Math.max(1, Number(event.target.value)))
                }
                required
              />
              <NativeSelect
                aria-label="Duration unit"
                value={durationUnit}
                onChange={(event) => {
                  const unit = event.target.value as "month" | "year";
                  setDurationUnit(unit);
                  setDurationCount(unit === "year" ? DEFAULT_ADOPTION_YEARS : 120);
                }}
              >
                <NativeSelectOption value="month">Months</NativeSelectOption>
                <NativeSelectOption value="year">Years</NativeSelectOption>
              </NativeSelect>
            </div>
          </fieldset>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays aria-hidden="true" className="size-4" />
            Through {dateFormatter.format(endDate)}
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" size="wide" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" size="wide">
              Continue
            </Button>
          </div>
        </form>
      ) : null}

      {stage === "payment" ? (
        <form className="flex animate-in flex-col gap-5 fade-in" onSubmit={showReview}>
          <div className="rounded-2xl bg-muted p-4">
            <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Minimum contribution
            </p>
            <p className="mt-1 font-heading text-3xl font-semibold">
              {currencyFormatter.format(BENCH_ADOPTION_MINIMUM)}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="contributionAmount">Your contribution (USD)</Label>
            <Input
              id="contributionAmount"
              type="number"
              min={BENCH_ADOPTION_MINIMUM}
              max={999999}
              step={100}
              value={contributionAmount}
              onChange={(event) => setContributionAmount(Number(event.target.value))}
              required
            />
            {contributionAmount > BENCH_ADOPTION_MINIMUM ? (
              <p className="text-xs font-medium text-primary">
                +{currencyFormatter.format(contributionAmount - BENCH_ADOPTION_MINIMUM)} for park care
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Payment method</Label>
            <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isAnonymous}
            className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-3 text-left outline-none transition-colors hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            onClick={() => setIsAnonymous((current) => !current)}
          >
            <span className="flex items-center gap-3">
              <EyeOff aria-hidden="true" className="size-4 text-muted-foreground" />
              <span>
                <span className="block text-sm font-medium">Give anonymously</span>
                <span className="block text-xs text-muted-foreground">Hide my name on the map</span>
              </span>
            </span>
            <span
              className={cn(
                "flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors",
                isAnonymous ? "bg-primary" : "bg-muted-foreground/30",
              )}
            >
              <span
                className={cn(
                  "size-5 rounded-full bg-background shadow-sm transition-transform",
                  isAnonymous && "translate-x-4",
                )}
              />
            </span>
          </button>

          <p className="text-xs text-muted-foreground">
            Prototype only · no payment details are collected.
          </p>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" size="wide" onClick={() => setStage("tribute")}>
              Back
            </Button>
            <Button type="submit" size="wide">
              Review
            </Button>
          </div>
        </form>
      ) : null}

      {stage === "review" ? (
        <div className="flex animate-in flex-col gap-5 fade-in">
          <PlaquePreview message={plaqueMessage} />
          <dl className="grid gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Contribution</dt>
              <dd className="font-semibold">{currencyFormatter.format(contributionAmount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Method</dt>
              <dd className="font-medium">{paymentMethodLabels[paymentMethod]}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Public credit</dt>
              <dd className="font-medium">{isAnonymous ? "Anonymous patron" : patronName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Term ends</dt>
              <dd className="font-medium">{dateFormatter.format(endDate)}</dd>
            </div>
          </dl>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" size="wide" onClick={() => setStage("payment")}>
              Back
            </Button>
            <Button type="button" size="wide" onClick={confirmContribution}>
              Confirm
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
