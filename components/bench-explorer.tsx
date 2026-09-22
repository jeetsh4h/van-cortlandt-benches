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
  const [resetRequestId, setResetRequestId] = useState(0);

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
        { event: "*", schema: "public", table: "bench_updates" },
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

  const availableBenches = useMemo(
    () => benches.filter((bench) => getBenchStatus(bench) === "available"),
    [benches],
  );

  const selectedAvailableIndex = availableBenches.findIndex(
    (bench) => bench.id === selectedBenchId,
  );

  const cycleAvailable = useCallback(
    (direction: 1 | -1) => {
      if (!availableBenches.length) {
        return;
      }

      const nextIndex =
        selectedAvailableIndex === -1 ?
          direction === 1 ? 0 : availableBenches.length - 1
        : (selectedAvailableIndex + direction + availableBenches.length) %
          availableBenches.length;
      setSelectedBenchId(availableBenches[nextIndex].id);
    },
    [availableBenches, selectedAvailableIndex],
  );

  const counts = useMemo(
    () => ({
      available: benches.filter((bench) => getBenchStatus(bench) === "available")
        .length,
      adopted: benches.filter((bench) => getBenchStatus(bench) === "adopted")
        .length,
      inProgress: benches.filter(
        (bench) => getBenchStatus(bench) === "in-progress",
      ).length,
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
        resetRequestId={resetRequestId}
      />
      <AppHeader
        availableCount={counts.available}
        adoptedCount={counts.adopted}
        inProgressCount={counts.inProgress}
        onShowAvailable={() => cycleAvailable(1)}
        onResetMap={() => {
          setSelectedBenchId(null);
          setResetRequestId((current) => current + 1);
        }}
      />
      <MapLegend />
      {selectedBench ? (
        <BenchDetails
          key={selectedBench.id}
          bench={selectedBench}
          onClose={() => setSelectedBenchId(null)}
          onChanged={refreshBenches}
          availablePosition={
            selectedAvailableIndex === -1 ? null : selectedAvailableIndex + 1
          }
          availableTotal={availableBenches.length}
          onPreviousAvailable={() => cycleAvailable(-1)}
          onNextAvailable={() => cycleAvailable(1)}
        />
      ) : null}
    </main>
  );
}
