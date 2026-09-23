"use client";

import {
  CalendarDays,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  TimerOff,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

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
  currencyFormatter,
  DEFAULT_ADOPTION_YEARS,
  MAX_ADOPTION_YEARS,
  minimumContributionForYears,
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
  onExpired: () => void;
};

type FlowStage =
  | "tribute"
  | "payment"
  | "review"
  | "processing"
  | "receipt"
  | "expired";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const ADOPTION_YEAR_OPTIONS = Array.from(
  { length: MAX_ADOPTION_YEARS - DEFAULT_ADOPTION_YEARS + 1 },
  (_, index) => DEFAULT_ADOPTION_YEARS + index,
);

function calendarEndDate(years: number) {
  const start = new Date();
  const year = start.getFullYear();
  const month = start.getMonth();
  const day = start.getDate();
  const targetYear = year + years;
  const lastDay = new Date(targetYear, month + 1, 0).getDate();

  return new Date(
    Date.UTC(targetYear, month, Math.min(day, lastDay)),
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
  onExpired,
}: AdoptionFormProps) {
  const [stage, setStage] = useState<FlowStage>("tribute");
  const [patronName, setPatronName] = useState("");
  const [durationCount, setDurationCount] = useState(DEFAULT_ADOPTION_YEARS);
  const [plaqueMessage, setPlaqueMessage] = useState("");
  const [additionalContribution, setAdditionalContribution] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<AdoptionResult | null>(null);
  const ownsHoldRef = useRef(true);
  const releaseTimerRef = useRef<number | null>(null);
  const expirationTimerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const expiredHandledRef = useRef(false);
  const onExpiredRef = useRef(onExpired);
  const minimumContribution = minimumContributionForYears(durationCount);
  const additionalContributionAmount =
    additionalContribution === "" ? 0 : Number(additionalContribution);
  const contributionAmount =
    minimumContribution + additionalContributionAmount;

  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);

  const expireHold = useCallback(() => {
    if (expiredHandledRef.current) {
      return;
    }

    expiredHandledRef.current = true;
    ownsHoldRef.current = false;
    setStage("expired");
    exitTimerRef.current = window.setTimeout(() => {
      onExpiredRef.current();
    }, 1_400);
  }, []);

  useEffect(() => {
    const remainingMilliseconds =
      new Date(holdExpiresAt).getTime() - Date.now();
    expirationTimerRef.current = window.setTimeout(
      expireHold,
      Math.max(0, remainingMilliseconds),
    );

    return () => {
      if (expirationTimerRef.current !== null) {
        window.clearTimeout(expirationTimerRef.current);
      }
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, [expireHold, holdExpiresAt]);

  useEffect(() => {
    if (releaseTimerRef.current !== null) {
      window.clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }

    return () => {
      if (ownsHoldRef.current) {
        releaseTimerRef.current = window.setTimeout(() => {
          void releaseBenchHold(bench.id, sessionToken).catch(() => undefined);
        }, 0);
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
    if (
      !Number.isFinite(additionalContributionAmount) ||
      additionalContributionAmount < 0
    ) {
      setError("Additional donation cannot be negative.");
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
        additionalContributionAmount,
        paymentMethod,
        isAnonymous,
      });

      if (!result.success) {
        if (result.message.toLowerCase().includes("hold expired")) {
          expireHold();
          return;
        }
        setError(result.message);
        setStage("review");
        return;
      }

      if (expirationTimerRef.current !== null) {
        window.clearTimeout(expirationTimerRef.current);
        expirationTimerRef.current = null;
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

  const endDate = calendarEndDate(durationCount);
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

  if (stage === "expired") {
    return (
      <div
        className="flex min-h-72 flex-col items-center justify-center gap-5 text-center"
        aria-live="assertive"
      >
        <span className="relative flex size-16 items-center justify-center rounded-full bg-progress/10 text-progress-foreground">
          <span className="absolute inset-0 rounded-full border border-progress/30 motion-safe:animate-ping" />
          <TimerOff className="size-7" aria-hidden="true" />
        </span>
        <div>
          <p className="font-heading text-lg font-semibold">Hold expired</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Returning to this bench
          </p>
        </div>
      </div>
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
    <div className="flex flex-col gap-4 sm:gap-5">
      <FlowProgress stage={stage} />

      <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <LockKeyhole aria-hidden="true" className="size-3.5" />
          Held until {holdTime}
        </span>
        <span>10-year minimum</span>
      </div>

      {stage === "tribute" ? (
        <form className="flex animate-in flex-col gap-4 fade-in sm:gap-5" onSubmit={showPayment}>
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
            <NativeSelect
              aria-label="Adoption term"
              value={String(durationCount)}
              onChange={(event) => setDurationCount(Number(event.target.value))}
            >
              {ADOPTION_YEAR_OPTIONS.map((years) => (
                <NativeSelectOption key={years} value={String(years)}>
                  {years} years
                </NativeSelectOption>
              ))}
            </NativeSelect>
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
              {durationCount}-year minimum
            </p>
            <p className="mt-1 font-heading text-3xl font-semibold">
              {currencyFormatter.format(minimumContribution)}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="additionalContribution">
              Additional donation (USD)
            </Label>
            <Input
              id="additionalContribution"
              type="number"
              min={0}
              max={999999 - minimumContribution}
              step={50}
              value={additionalContribution}
              onChange={(event) => setAdditionalContribution(event.target.value)}
              placeholder="0"
            />
            {additionalContributionAmount > 0 ? (
              <p className="text-xs font-medium text-primary">
                Total {currencyFormatter.format(contributionAmount)}
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
              <dt className="text-muted-foreground">Adoption contribution</dt>
              <dd className="font-medium">
                {currencyFormatter.format(minimumContribution)}
              </dd>
            </div>
            {additionalContributionAmount > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Additional donation</dt>
                <dd className="font-medium">
                  {currencyFormatter.format(additionalContributionAmount)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t border-border pt-3">
              <dt className="font-medium">Total</dt>
              <dd className="font-semibold">
                {currencyFormatter.format(contributionAmount)}
              </dd>
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
