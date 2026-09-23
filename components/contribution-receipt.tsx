"use client";

import { Armchair, Download, Leaf, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AdoptionResult, Bench } from "@/lib/bench-types";
import {
  currencyFormatter,
  paymentMethodLabels,
} from "@/lib/contribution";

type ContributionReceiptProps = {
  bench: Bench;
  result: AdoptionResult;
  patronName: string;
  onDone: () => void;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function ContributionReceipt({
  bench,
  result,
  patronName,
  onDone,
}: ContributionReceiptProps) {
  return (
    <div className="contribution-receipt flex flex-col gap-6">
      <div className="relative flex flex-col items-center overflow-hidden rounded-2xl bg-primary px-5 py-8 text-center text-primary-foreground">
        <Leaf className="absolute top-4 left-5 size-5 rotate-[-24deg] opacity-50 motion-safe:animate-celebrate" />
        <Sparkles className="absolute top-6 right-6 size-5 opacity-70 motion-safe:animate-pulse" />
        <Leaf className="absolute right-10 bottom-4 size-4 rotate-24 opacity-40 motion-safe:animate-celebrate-delayed" />
        <span className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary-foreground text-primary shadow-xl motion-safe:animate-receipt-pop">
          <Armchair aria-hidden="true" className="size-7" />
        </span>
        <p className="text-xs font-medium tracking-[0.14em] uppercase opacity-75">
          Bench adopted
        </p>
        <h2 className="mt-2 font-heading text-2xl font-semibold">
          Thank you, {patronName}
        </h2>
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-card p-5">
        <div className="flex items-baseline justify-between gap-3 border-b border-border pb-4">
          <span className="text-sm text-muted-foreground">Contribution</span>
          <strong className="font-heading text-2xl">
            {result.contribution_amount
              ? currencyFormatter.format(result.contribution_amount)
              : null}
          </strong>
        </div>
        <dl className="grid gap-3 pt-4 text-sm">
          {result.additional_contribution_amount ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Additional donation</dt>
              <dd className="font-medium">
                {currencyFormatter.format(
                  result.additional_contribution_amount,
                )}
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Bench</dt>
            <dd className="font-medium">{bench.id}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Through</dt>
            <dd className="font-medium">
              {result.adoption_end
                ? dateFormatter.format(new Date(`${result.adoption_end}T00:00:00Z`))
                : null}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Method</dt>
            <dd className="font-medium">
              {result.payment_method
                ? paymentMethodLabels[result.payment_method]
                : null}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Receipt</dt>
            <dd className="font-mono text-xs font-medium">
              {result.receipt_number}
            </dd>
          </div>
        </dl>
      </div>

      {result.is_anonymous ? (
        <p className="text-center text-xs text-muted-foreground">
          Public credit: Anonymous patron
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 print:hidden">
        <Button variant="outline" size="wide" onClick={() => window.print()}>
          <Download aria-hidden="true" />
          Receipt
        </Button>
        <Button size="wide" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}
