import type { PaymentMethod } from "@/lib/bench-types";

export const BENCH_ADOPTION_MINIMUM = 3_500;
export const DEFAULT_ADOPTION_YEARS = 10;
export const MAX_ADOPTION_YEARS = 99;
export const ADDITIONAL_YEAR_RATE = 350;

export function minimumContributionForYears(years: number) {
  return (
    BENCH_ADOPTION_MINIMUM +
    Math.max(0, years - DEFAULT_ADOPTION_YEARS) * ADDITIONAL_YEAR_RATE
  );
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  card: "Card",
  bank: "Bank transfer",
  zelle: "Zelle",
  check: "Check or money order",
  stock: "Stock",
  daf: "Donor-advised fund",
};

export const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
