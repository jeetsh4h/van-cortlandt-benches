export type Bench = {
  id: string;
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  source: string;
  source_reference: string;
  adopter_name: string | null;
  plaque_message: string | null;
  adoption_start: string | null;
  adoption_end: string | null;
  hold_expires_at: string | null;
};

export type BenchStatus = "available" | "adopted" | "in-progress";

export type HoldResult = {
  success: boolean;
  message: string;
  expires_at: string | null;
};

export type AdoptionResult = {
  success: boolean;
  message: string;
  adoption_start: string | null;
  adoption_end: string | null;
  contribution_amount: number | null;
  payment_method: PaymentMethod | null;
  is_anonymous: boolean | null;
  receipt_number: string | null;
};

export type PaymentMethod =
  | "card"
  | "bank"
  | "zelle"
  | "check"
  | "stock"
  | "daf";

export function getBenchStatus(bench: Bench): BenchStatus {
  if (bench.adoption_end) {
    return "adopted";
  }

  if (
    bench.hold_expires_at &&
    new Date(bench.hold_expires_at).getTime() > Date.now()
  ) {
    return "in-progress";
  }

  return "available";
}

export function getBenchImage(area: string) {
  if (area === "Lake area") {
    return "/benches/lake-area.webp";
  }

  if (area === "Southwest park") {
    return "/benches/southwest-park.webp";
  }

  return "/benches/wooded-trail.webp";
}
