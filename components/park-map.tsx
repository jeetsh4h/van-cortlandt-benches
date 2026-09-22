"use client";

import mapboxgl, { type GeoJSONSource, type Map } from "mapbox-gl";
import { useEffect, useRef } from "react";

import { getBenchStatus, type Bench } from "@/lib/bench-types";

const SOURCE_ID = "park-benches";
const CLUSTER_LAYER_ID = "bench-clusters";
const CLUSTER_COUNT_LAYER_ID = "bench-cluster-count";
const HALO_LAYER_ID = "bench-halos";
const POINT_LAYER_ID = "bench-points";
const SYMBOL_LAYER_ID = "bench-symbols";
const PARK_BOUNDS: mapboxgl.LngLatBoundsLike = [
  [-73.912, 40.884],
  [-73.881, 40.917],
];

type ParkMapProps = {
  benches: Bench[];
  mapboxToken: string;
  selectedBenchId: string | null;
  onSelectBench: (benchId: string) => void;
  resetRequestId: number;
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
  resetRequestId,
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
    const clusterColor = getMapColor("--map-cluster");
    let animationFrame: number | undefined;

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
        clusterProperties: {
          available_count: [
            "+",
            ["case", ["==", ["get", "status"], "available"], 1, 0],
          ],
          adopted_count: [
            "+",
            ["case", ["==", ["get", "status"], "adopted"], 1, 0],
          ],
          progress_count: [
            "+",
            ["case", ["==", ["get", "status"], "in-progress"], 1, 0],
          ],
        },
      });

      map.addLayer({
        id: CLUSTER_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        slot: "top",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": surfaceColor,
          "circle-radius": 29,
          "circle-stroke-color": clusterColor,
          "circle-stroke-width": 2,
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
          "text-field": [
            "concat",
            "+ ",
            ["to-string", ["get", "available_count"]],
            "  ♥ ",
            ["to-string", ["get", "adopted_count"]],
            "\n• ",
            ["to-string", ["get", "progress_count"]],
          ],
          "text-size": 11,
          "text-line-height": 1.25,
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": clusterColor,
        },
      });

      map.addLayer({
        id: HALO_LAYER_ID,
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
          "circle-radius": 15,
          "circle-opacity": [
            "match",
            ["get", "status"],
            "available",
            0,
            0.18,
          ],
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

      map.addLayer({
        id: SYMBOL_LAYER_ID,
        type: "symbol",
        source: SOURCE_ID,
        slot: "top",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "text-field": [
            "match",
            ["get", "status"],
            "adopted",
            "♥",
            "in-progress",
            "•",
            "+",
          ],
          "text-size": ["match", ["get", "status"], "in-progress", 18, 15],
          "text-font": ["Arial Unicode MS Bold"],
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": surfaceColor,
        },
      });

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (!reduceMotion) {
        const animateHalos = (time: number) => {
          const pulse = (Math.sin(time / 500) + 1) / 2;
          map.setPaintProperty(HALO_LAYER_ID, "circle-radius", [
            "match",
            ["get", "status"],
            "adopted",
            13 + pulse * 3,
            "in-progress",
            14 + pulse * 5,
            0,
          ]);
          map.setPaintProperty(
            HALO_LAYER_ID,
            "circle-opacity",
            [
              "match",
              ["get", "status"],
              "adopted",
              0.14 + pulse * 0.1,
              "in-progress",
              0.1 + pulse * 0.14,
              0,
            ],
          );
          animationFrame = window.requestAnimationFrame(animateHalos);
        };

        animationFrame = window.requestAnimationFrame(animateHalos);
      }

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

      for (const layerId of [POINT_LAYER_ID, SYMBOL_LAYER_ID]) {
        map.on("click", layerId, (event) => {
          const benchId = event.features?.[0]?.toJSON().properties?.id as
            | string
            | undefined;
          if (benchId) {
            onSelectBenchRef.current(benchId);
          }
        });
      }

      for (const layerId of [CLUSTER_LAYER_ID, POINT_LAYER_ID, SYMBOL_LAYER_ID]) {
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
      if (animationFrame !== undefined) {
        window.cancelAnimationFrame(animationFrame);
      }
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
      padding:
        window.innerWidth >= 640 ?
          { top: 24, right: 424, bottom: 24, left: 24 }
        : {
            top: 88,
            right: 16,
            bottom: Math.round(window.innerHeight * 0.56),
            left: 16,
          },
    });
  }, [benches, selectedBenchId]);

  useEffect(() => {
    if (!resetRequestId || !mapRef.current) {
      return;
    }

    mapRef.current.fitBounds(PARK_BOUNDS, {
      padding: window.innerWidth >= 640 ? 72 : 36,
      maxZoom: 14,
      duration: 700,
    });
  }, [resetRequestId]);

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
