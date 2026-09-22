import { connection } from "next/server";

import { BenchExplorer } from "@/components/bench-explorer";
import { listBenches } from "@/lib/benches";

export default async function Home() {
  await connection();

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!mapboxToken) {
    throw new Error("NEXT_PUBLIC_MAPBOX_TOKEN is not configured.");
  }

  const benches = await listBenches();

  return <BenchExplorer initialBenches={benches} mapboxToken={mapboxToken} />;
}
