"use client";

import mapboxgl, { type GeoJSONSource, type Map } from "mapbox-gl";
import { useEffect, useRef } from "react";

import { getBenchStatus, type Bench } from "@/lib/bench-types";

const SOURCE_ID = "park-benches";
const CLUSTER_LAYER_ID = "bench-clusters";
const CLUSTER_COUNT_LAYER_ID = "bench-cluster-count";
const POINT_LAYER_ID = "bench-points";

type ParkMapProps = {
  benches: Bench[];
  mapboxToken: string;
  selectedBenchId: string | null;
  onSelectBench: (benchId: string) => void;
};

function toGeoJson(benches: Bench[], selectedBenchId: string | null) {
  return {
    type: "FeatureCollection" as const,
    features: benches.map((bench) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [bench.longitude, bench.latitude],
      },
      properties: {
        id: bench.id,
        status: getBenchStatus(bench),
        selected: bench.id === selectedBenchId,
      },
    })),
  };
}

function getMapColor(token: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}

export function ParkMap({
  benches,
  mapboxToken,
  selectedBenchId,
  onSelectBench,
}: ParkMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const benchesRef = useRef(benches);
  const selectedBenchIdRef = useRef(selectedBenchId);
  const onSelectBenchRef = useRef(onSelectBench);

  useEffect(() => {
    benchesRef.current = benches;
    selectedBenchIdRef.current = selectedBenchId;
    onSelectBenchRef.current = onSelectBench;
  }, [benches, selectedBenchId, onSelectBench]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const availableColor = getMapColor("--map-available");
    const adoptedColor = getMapColor("--map-adopted");
    const progressColor = getMapColor("--map-progress");
    const surfaceColor = getMapColor("--map-surface");

    const map = new mapboxgl.Map({
      accessToken: mapboxToken,
      container: containerRef.current,
      style: "mapbox://styles/mapbox/standard",
      config: {
        basemap: {
          theme: "faded",
          lightPreset: "day",
          showPedestrianRoads: true,
          showPointOfInterestLabels: true,
          showTransitLabels: false,
          show3dObjects: false,
        },
      },
      center: [-73.8919, 40.8986],
      zoom: 13.6,
      maxBounds: [
        [-73.924, 40.872],
        [-73.856, 40.928],
      ],
      minZoom: 12.5,
      maxZoom: 19,
      attributionControl: false,
    });

    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));

    map.on("load", () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: toGeoJson(benchesRef.current, selectedBenchIdRef.current),
        cluster: true,
        clusterMaxZoom: 15,
        clusterRadius: 44,
      });

      map.addLayer({
        id: CLUSTER_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        slot: "top",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": availableColor,
          "circle-radius": ["step", ["get", "point_count"], 18, 8, 23],
          "circle-stroke-color": surfaceColor,
          "circle-stroke-width": 3,
          "circle-emissive-strength": 1,
        },
      });

      map.addLayer({
        id: CLUSTER_COUNT_LAYER_ID,
        type: "symbol",
        source: SOURCE_ID,
        slot: "top",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
        },
        paint: {
          "text-color": surfaceColor,
        },
      });

      map.addLayer({
        id: POINT_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        slot: "top",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match",
            ["get", "status"],
            "adopted",
            adoptedColor,
            "in-progress",
            progressColor,
            availableColor,
          ],
          "circle-radius": ["case", ["get", "selected"], 11, 8],
          "circle-stroke-color": surfaceColor,
          "circle-stroke-width": ["case", ["get", "selected"], 4, 3],
          "circle-emissive-strength": 1,
        },
      });

      map.on("click", CLUSTER_LAYER_ID, (event) => {
        const feature = event.features?.[0]?.toJSON();
        const clusterId = feature?.properties?.cluster_id as number | undefined;
        const coordinates =
          feature?.geometry.type === "Point"
            ? (feature.geometry.coordinates as [number, number])
            : undefined;

        if (clusterId === undefined || !coordinates) {
          return;
        }

        (map.getSource(SOURCE_ID) as GeoJSONSource).getClusterExpansionZoom(
          clusterId,
          (error, zoom) => {
            if (!error && zoom !== null && zoom !== undefined) {
              map.easeTo({ center: coordinates, zoom });
            }
          },
        );
      });

      map.on("click", POINT_LAYER_ID, (event) => {
        const benchId = event.features?.[0]?.toJSON().properties?.id as
          | string
          | undefined;
        if (benchId) {
          onSelectBenchRef.current(benchId);
        }
      });

      for (const layerId of [CLUSTER_LAYER_ID, POINT_LAYER_ID]) {
        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
        });
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapboxToken]);

  useEffect(() => {
    const source = mapRef.current?.getSource(SOURCE_ID) as
      | GeoJSONSource
      | undefined;
    source?.setData(toGeoJson(benches, selectedBenchId));
  }, [benches, selectedBenchId]);

  useEffect(() => {
    if (!selectedBenchId || !mapRef.current) {
      return;
    }

    const bench = benches.find((item) => item.id === selectedBenchId);
    if (!bench) {
      return;
    }

    mapRef.current.easeTo({
      center: [bench.longitude, bench.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 15.5),
      duration: 700,
      padding: window.innerWidth >= 640 ? { right: 400 } : { bottom: 280 },
    });
  }, [benches, selectedBenchId]);

  return (
    <div className="absolute inset-0">
      <div
        ref={containerRef}
        className="h-full w-full"
        role="application"
        aria-label="Map of benches in Van Cortlandt Park"
      />
    </div>
  );
}
