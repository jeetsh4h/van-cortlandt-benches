"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AppHeader } from "@/components/app-header";
import { BenchDetails } from "@/components/bench-details";
import { MapLegend } from "@/components/map-legend";
import { ParkMap } from "@/components/park-map";
import { listBenches } from "@/lib/benches";
import { getBenchStatus, type Bench } from "@/lib/bench-types";
import { getBrowserSupabaseClient } from "@/lib/supabase";

type BenchExplorerProps = {
  initialBenches: Bench[];
  mapboxToken: string;
};

export function BenchExplorer({
  initialBenches,
  mapboxToken,
}: BenchExplorerProps) {
  const [benches, setBenches] = useState(initialBenches);
  const [selectedBenchId, setSelectedBenchId] = useState<string | null>(null);

  const refreshBenches = useCallback(async () => {
    const nextBenches = await listBenches(getBrowserSupabaseClient());
    setBenches(nextBenches);
  }, []);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    const syncBenches = () => {
      void refreshBenches().catch(() => undefined);
    };
    const channel = supabase
      .channel("public-bench-map")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bench_adoptions" },
        syncBenches,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "benches" },
        syncBenches,
      )
      .subscribe();

    const poll = window.setInterval(syncBenches, 15_000);

    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [refreshBenches]);

  const selectedBench = useMemo(
    () => benches.find((bench) => bench.id === selectedBenchId) ?? null,
    [benches, selectedBenchId],
  );

  const counts = useMemo(
    () => ({
      available: benches.filter((bench) => getBenchStatus(bench) === "available")
        .length,
      adopted: benches.filter((bench) => getBenchStatus(bench) === "adopted")
        .length,
    }),
    [benches],
  );

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-muted">
      <ParkMap
        benches={benches}
        mapboxToken={mapboxToken}
        selectedBenchId={selectedBenchId}
        onSelectBench={setSelectedBenchId}
      />
      <AppHeader
        availableCount={counts.available}
        adoptedCount={counts.adopted}
      />
      <MapLegend />
      {selectedBench ? (
        <BenchDetails
          key={selectedBench.id}
          bench={selectedBench}
          onClose={() => setSelectedBenchId(null)}
          onChanged={refreshBenches}
        />
      ) : null}
    </main>
  );
}
