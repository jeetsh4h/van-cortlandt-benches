import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AdoptionResult,
  Bench,
  HoldResult,
  PaymentMethod,
} from "@/lib/bench-types";
import {
  createPublicSupabaseClient,
  getBrowserSupabaseClient,
} from "@/lib/supabase";

export async function listBenches(client?: SupabaseClient): Promise<Bench[]> {
  const supabase = client ?? createPublicSupabaseClient();
  const { data, error } = await supabase.rpc("list_benches");

  if (error) {
    throw new Error(`Unable to load benches: ${error.message}`);
  }

  return (data ?? []) as Bench[];
}

export async function reserveBench(
  benchId: string,
  sessionToken: string,
): Promise<HoldResult> {
  const { data, error } = await getBrowserSupabaseClient().rpc("reserve_bench", {
    p_bench_id: benchId,
    p_session_token: sessionToken,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data as HoldResult[])[0];
}

export async function releaseBenchHold(
  benchId: string,
  sessionToken: string,
) {
  const { error } = await getBrowserSupabaseClient().rpc("release_bench_hold", {
    p_bench_id: benchId,
    p_session_token: sessionToken,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function submitAdoption(input: {
  benchId: string;
  sessionToken: string;
  adopterName: string;
  plaqueMessage: string;
  durationCount: number;
  contributionAmount: number;
  paymentMethod: PaymentMethod;
  isAnonymous: boolean;
}): Promise<AdoptionResult> {
  const { data, error } = await getBrowserSupabaseClient().rpc("adopt_bench", {
    p_bench_id: input.benchId,
    p_session_token: input.sessionToken,
    p_adopter_name: input.adopterName,
    p_plaque_message: input.plaqueMessage,
    p_duration_years: input.durationCount,
    p_contribution_amount: input.contributionAmount,
    p_payment_method: input.paymentMethod,
    p_is_anonymous: input.isAnonymous,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data as AdoptionResult[])[0];
}
