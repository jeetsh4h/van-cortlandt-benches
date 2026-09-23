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
const BENCH_FOCUS_ZOOM = 17;
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
  focusRequestId: number;
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
  focusRequestId,
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
          "circle-color": [
            "case",
            [">", ["get", "available_count"], 0],
            availableColor,
            [">", ["get", "adopted_count"], 0],
            adoptedColor,
            progressColor,
          ],
          "circle-radius": ["step", ["get", "point_count"], 23, 8, 27],
          "circle-stroke-color": [
            "case",
            [
              "all",
              [">", ["get", "available_count"], 0],
              [">", ["get", "adopted_count"], 0],
            ],
            adoptedColor,
            [
              "all",
              [">", ["get", "available_count"], 0],
              [">", ["get", "progress_count"], 0],
            ],
            progressColor,
            [
              "all",
              [">", ["get", "adopted_count"], 0],
              [">", ["get", "progress_count"], 0],
            ],
            progressColor,
            surfaceColor,
          ],
          "circle-stroke-width": [
            "case",
            [
              "any",
              [
                "all",
                [">", ["get", "available_count"], 0],
                [">", ["get", "adopted_count"], 0],
              ],
              [
                "all",
                [">", ["get", "available_count"], 0],
                [">", ["get", "progress_count"], 0],
              ],
              [
                "all",
                [">", ["get", "adopted_count"], 0],
                [">", ["get", "progress_count"], 0],
              ],
            ],
            5,
            3,
          ],
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
            "to-string",
            [
              "case",
              [">", ["get", "available_count"], 0],
              ["get", "available_count"],
              [">", ["get", "adopted_count"], 0],
              ["get", "adopted_count"],
              ["get", "progress_count"],
            ],
          ],
          "text-size": 14,
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": surfaceColor,
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
          "circle-radius": 19,
          "circle-opacity": [
            "match",
            ["get", "status"],
            "available",
            0.14,
            0.2,
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
          "circle-radius": ["case", ["get", "selected"], 14, 11],
          "circle-stroke-color": surfaceColor,
          "circle-stroke-width": ["case", ["get", "selected"], 5, 3.5],
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
          "text-size": ["match", ["get", "status"], "in-progress", 21, 17],
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
            17 + pulse * 3,
            "in-progress",
            18 + pulse * 4,
            17 + pulse * 3,
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
              0.1 + pulse * 0.08,
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

    const map = mapRef.current;
    const isDesktop = window.innerWidth >= 640;
    const padding =
      isDesktop ?
        { top: 24, right: 424, bottom: 24, left: 24 }
      : {
          top: 88,
          right: 16,
          bottom: Math.round(window.innerHeight * 0.56),
          left: 16,
        };
    const point = map.project([bench.longitude, bench.latitude]);
    const canvas = map.getCanvas();
    const isVisible =
      point.x >= padding.left &&
      point.x <= canvas.clientWidth - padding.right &&
      point.y >= padding.top &&
      point.y <= canvas.clientHeight - padding.bottom;
    const needsZoom = map.getZoom() < BENCH_FOCUS_ZOOM;

    if (isVisible && !needsZoom) {
      return;
    }

    map.easeTo({
      center: [bench.longitude, bench.latitude],
      zoom: Math.max(map.getZoom(), BENCH_FOCUS_ZOOM),
      duration: 700,
      padding,
    });
  }, [benches, focusRequestId, selectedBenchId]);

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
