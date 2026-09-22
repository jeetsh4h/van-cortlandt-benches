"use client";

import { CalendarDays, Check, LoaderCircle } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { releaseBenchHold, submitAdoption } from "@/lib/benches";
import type { Bench } from "@/lib/bench-types";

type AdoptionFormProps = {
  bench: Bench;
  sessionToken: string;
  holdExpiresAt: string;
  onCancel: () => void;
  onComplete: () => Promise<void>;
};

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

export function AdoptionForm({
  bench,
  sessionToken,
  holdExpiresAt,
  onCancel,
  onComplete,
}: AdoptionFormProps) {
  const [durationCount, setDurationCount] = useState(1);
  const [durationUnit, setDurationUnit] = useState<"month" | "year">("year");
  const [plaqueMessage, setPlaqueMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await submitAdoption({
        benchId: bench.id,
        sessionToken,
        adopterName: String(formData.get("adopterName") ?? ""),
        plaqueMessage,
        durationCount,
        durationUnit,
      });

      if (!result.success) {
        setError(result.message);
        return;
      }

      ownsHoldRef.current = false;
      await onComplete();
    } catch {
      setError("Could not complete the adoption. Try again.");
    } finally {
      setPending(false);
    }
  }

  const endDate = calendarEndDate(durationCount, durationUnit);
  const holdTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(holdExpiresAt));

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
        Held for you until {holdTime}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="adopterName">Adopted by</Label>
        <Input
          id="adopterName"
          name="adopterName"
          autoComplete="name"
          minLength={2}
          maxLength={80}
          placeholder="Name or family"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="plaqueMessage">Plaque message</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {plaqueMessage.length}/160
          </span>
        </div>
        <Textarea
          id="plaqueMessage"
          name="plaqueMessage"
          value={plaqueMessage}
          onChange={(event) => setPlaqueMessage(event.target.value)}
          minLength={2}
          maxLength={160}
          placeholder="A short dedication"
          required
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Duration</legend>
        <div className="grid grid-cols-[1fr_1.4fr] gap-2">
          <Input
            aria-label="Duration count"
            type="number"
            min={1}
            max={120}
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
            onChange={(event) =>
              setDurationUnit(event.target.value as "month" | "year")
            }
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
        <Button
          type="button"
          variant="outline"
          size="wide"
          onClick={handleCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" size="wide" disabled={pending}>
          {pending ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Check aria-hidden="true" />
          )}
          Adopt
        </Button>
      </div>
    </form>
  );
}
