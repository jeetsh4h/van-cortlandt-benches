import type { PaymentMethod } from "@/lib/bench-types";

export const BENCH_ADOPTION_MINIMUM = 3_500;
export const DEFAULT_ADOPTION_YEARS = 10;

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
