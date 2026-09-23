"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AppHeader } from "@/components/app-header";
import { BenchDetails } from "@/components/bench-details";
import { MapLegend } from "@/components/map-legend";
import { ParkMap } from "@/components/park-map";
import { listBenches } from "@/lib/benches";
import {
  getBenchStatus,
  type Bench,
  type BenchStatus,
} from "@/lib/bench-types";
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
  const [focusRequestId, setFocusRequestId] = useState(0);

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

  const orderedBenches = useMemo(
    () =>
      [...benches].sort((first, second) =>
        first.id.localeCompare(second.id, undefined, { numeric: true }),
      ),
    [benches],
  );

  const selectedBench = useMemo(
    () =>
      orderedBenches.find((bench) => bench.id === selectedBenchId) ?? null,
    [orderedBenches, selectedBenchId],
  );

  const selectedBenchIndex = orderedBenches.findIndex(
    (bench) => bench.id === selectedBenchId,
  );

  const focusBench = useCallback((benchId: string) => {
    setSelectedBenchId(benchId);
    setFocusRequestId((current) => current + 1);
  }, []);

  const selectRandomBench = useCallback(
    (status: BenchStatus) => {
      const matchingBenches = orderedBenches.filter(
        (bench) => getBenchStatus(bench) === status,
      );
      if (!matchingBenches.length) {
        return;
      }

      const candidates =
        matchingBenches.length > 1 ?
          matchingBenches.filter((bench) => bench.id !== selectedBenchId)
        : matchingBenches;
      const randomIndex = Math.floor(Math.random() * candidates.length);
      focusBench(candidates[randomIndex].id);
    },
    [focusBench, orderedBenches, selectedBenchId],
  );

  const cycleBench = useCallback(
    (direction: 1 | -1) => {
      if (!orderedBenches.length) {
        return;
      }

      const nextIndex =
        selectedBenchIndex === -1 ? 0
        : (selectedBenchIndex + direction + orderedBenches.length) %
          orderedBenches.length;
      focusBench(orderedBenches[nextIndex].id);
    },
    [focusBench, orderedBenches, selectedBenchIndex],
  );

  const counts = useMemo(
    () => ({
      available: orderedBenches.filter(
        (bench) => getBenchStatus(bench) === "available",
      ).length,
      adopted: orderedBenches.filter(
        (bench) => getBenchStatus(bench) === "adopted",
      ).length,
      inProgress: orderedBenches.filter(
        (bench) => getBenchStatus(bench) === "in-progress",
      ).length,
    }),
    [orderedBenches],
  );

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-muted">
      <ParkMap
        benches={benches}
        mapboxToken={mapboxToken}
        selectedBenchId={selectedBenchId}
        onSelectBench={focusBench}
        resetRequestId={resetRequestId}
        focusRequestId={focusRequestId}
      />
      <AppHeader
        availableCount={counts.available}
        adoptedCount={counts.adopted}
        inProgressCount={counts.inProgress}
        onShowAvailable={() => selectRandomBench("available")}
        onShowAdopted={() => selectRandomBench("adopted")}
        onShowInProgress={() => selectRandomBench("in-progress")}
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
          position={selectedBenchIndex + 1}
          total={orderedBenches.length}
          onClose={() => setSelectedBenchId(null)}
          onChanged={refreshBenches}
          onPrevious={() => cycleBench(-1)}
          onNext={() => cycleBench(1)}
        />
      ) : null}
    </main>
  );
}
