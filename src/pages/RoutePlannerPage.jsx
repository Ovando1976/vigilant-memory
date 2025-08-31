// src/pages/RoutePlannerPage.jsx
import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import MapIcon from "@mui/icons-material/Map";
import ShareIcon from "@mui/icons-material/Share";
import RestoreIcon from "@mui/icons-material/Restore";
import Autocomplete from "@mui/material/Autocomplete";

import { locationCoords } from "../data/locationCoords";
import { getLocalTaxiRate } from "../lib/getLocalTaxiRate";
import logger from "../logger";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || "";

const ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car";
const ORS_KEY = process.env.REACT_APP_ORS_API_KEY;

const ALL_LOCS = Object.keys(locationCoords).sort();

/* ------------------------ helpers ------------------------ */
function haversineKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const aa = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(aa));
}
function islandOf({ lat, lng }) {
  if (lat < 18.0) return "STX";
  return lng > -64.84 ? "STJ" : "STT";
}
function nearestNamed(point, islCode) {
  const all = Object.entries(locationCoords);
  let best = null;
  for (const [name, coords] of all) {
    const code = islandOf(coords);
    if (islCode && code !== islCode) continue;
    const d = haversineKm(point, coords);
    if (!best || d < best.dKm) best = { name, coords, dKm: d };
  }
  return best;
}
// guard for coordinates
function isLngLat(v) {
  return v && typeof v === "object" && Number.isFinite(v.lng) && Number.isFinite(v.lat);
}

const EMPTY_LINE = { type: "Feature", geometry: { type: "LineString", coordinates: [] } };

// tiny storage helper
const storage = {
  get(k, f = null) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : f;
    } catch {
      return f;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};
function pushRecent(fromName, toName) {
  const rec = storage.get("recentRoutes", []);
  const next = [
    { fromName, toName, ts: Date.now() },
    ...rec.filter((r) => !(r.fromName === fromName && r.toName === toName)),
  ].slice(0, 8);
  storage.set("recentRoutes", next);
  return next;
}

/* ------------------------ page ------------------------ */
export default function RoutePlannerPage() {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const aMarker = useRef(null);
  const bMarker = useRef(null);

  const [styleId, setStyleId] = useState(storage.get("mapStyle", "mapbox/streets-v12"));

  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [fromName, setFromName] = useState("");
  const [toName, setToName] = useState("");
  const [fare, setFare] = useState(null);
  const [duration, setDuration] = useState(null);
  const [distance, setDistance] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState(storage.get("recentRoutes", []));

  /* init / re-init map when style changes */
  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: `mapbox://styles/${styleId}`,
      center: [-64.93, 18.34],
      zoom: 12,
    });
    mapObj.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      if (!map.getSource("route")) {
        map.addSource("route", { type: "geojson", data: EMPTY_LINE });
      }
      if (!map.getLayer("route-line")) {
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#2563eb", "line-width": 5 },
        });
      }
    });

    map.on("error", (e) => logger?.warn?.("Mapbox:", e?.error));

    return () => map.remove();
  }, [styleId]);

  /* safe marker management */
  const clearRoute = (removeMarkers = true) => {
    try {
      mapObj.current?.getSource("route")?.setData(EMPTY_LINE);
    } catch {}
    setFare(null);
    setDuration(null);
    setDistance(null);
    if (removeMarkers) {
      aMarker.current?.remove();
      bMarker.current?.remove();
      aMarker.current = null;
      bMarker.current = null;
    }
  };

  // IMPORTANT: set coordinates BEFORE addTo(map) to avoid t.lng crash
  const ensureMarkers = () => {
    const map = mapObj.current;
    if (!map) return;

    // FROM
    if (isLngLat(from)) {
      if (!aMarker.current) {
        const m = new mapboxgl.Marker({ color: "#2563eb", draggable: true })
          .setLngLat([from.lng, from.lat]) // <-- set first
          .addTo(map);
        m.on("dragend", () => {
          const ll = m.getLngLat();
          const coords = { lng: ll.lng, lat: ll.lat };
          const n = nearestNamed(coords, islandOf(coords));
          setFrom(coords);
          setFromName(n?.name || "Custom");
          clearRoute(false);
        });
        aMarker.current = m;
      } else {
        aMarker.current.setLngLat([from.lng, from.lat]);
      }
    } else if (aMarker.current) {
      aMarker.current.remove();
      aMarker.current = null;
    }

    // TO
    if (isLngLat(to)) {
      if (!bMarker.current) {
        const m = new mapboxgl.Marker({ color: "#ef4444", draggable: true })
          .setLngLat([to.lng, to.lat]) // <-- set first
          .addTo(map);
        m.on("dragend", () => {
          const ll = m.getLngLat();
          const coords = { lng: ll.lng, lat: ll.lat };
          const n = nearestNamed(coords, islandOf(coords));
          setTo(coords);
          setToName(n?.name || "Custom");
          clearRoute(false);
        });
        bMarker.current = m;
      } else {
        bMarker.current.setLngLat([to.lng, to.lat]);
      }
    } else if (bMarker.current) {
      bMarker.current.remove();
      bMarker.current = null;
    }
  };

  useEffect(() => {
    ensureMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  /* map click to seed points */
  useEffect(() => {
    const map = mapObj.current;
    if (!map) return;
    const onClick = (e) => {
      const coords = { lng: e.lngLat.lng, lat: e.lngLat.lat };
      const nearest = nearestNamed(coords, islandOf(coords));
      if (!isLngLat(from)) {
        setFrom(coords);
        setFromName(nearest?.name || "Custom");
      } else if (!isLngLat(to)) {
        setTo(coords);
        setToName(nearest?.name || "Custom");
      }
    };
    map.on("click", onClick);
    return () => map.off("click", onClick);
  }, [from, to]);

  /* bounds helper */
  const fitTo = (coords) => {
    const map = mapObj.current;
    if (!map || !coords || !coords.length) return;

    const toPair = (c) => (Array.isArray(c) ? c : isLngLat(c) ? [c.lng, c.lat] : null);
    const first = toPair(coords[0]);
    if (!first) return;

    const bounds = new mapboxgl.LngLatBounds(first, first);
    for (let i = 1; i < coords.length; i++) {
      const p = toPair(coords[i]);
      if (p) bounds.extend(p);
    }
    map.fitBounds(bounds, { padding: 60, duration: 900 });
  };

  /* plan route */
  const planRoute = async () => {
    if (!isLngLat(from) || !isLngLat(to)) return;

    storage.set("lastRoute", { fromName, toName });
    setRecents(pushRecent(fromName, toName));
    setLoading(true);
    clearRoute(false);

    try {
      // fixed local taxi rate first
      let usedFixed = false;
      const nA = nearestNamed(from, islandOf(from));
      const nB = nearestNamed(to, islandOf(to));
      if (nA && nB) {
        try {
          const { fare: f, durationMin } = getLocalTaxiRate(nA.name, nB.name);
          setFare(f);
          setDuration(durationMin);
          setDistance(null);
          usedFixed = true;
        } catch {
          usedFixed = false;
        }
      }

      let line = null;
      let km = null;
      let min = null;

      // ORS
      if (!usedFixed && ORS_KEY) {
        try {
          const res = await fetch(ORS_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: ORS_KEY,
            },
            body: JSON.stringify({
              coordinates: [
                [from.lng, from.lat],
                [to.lng, to.lat],
              ],
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const feature = data.features?.[0];
            const coords = feature?.geometry?.coordinates;
            if (coords?.length) {
              line = coords;
              km = feature.properties.summary.distance / 1000;
              min = feature.properties.summary.duration / 60;
              mapObj.current?.getSource("route")?.setData(feature);
              fitTo(coords);
            }
          }
        } catch (e) {
          logger?.warn?.("ORS failed", e);
        }
      }

      // OSRM
      if (!usedFixed && !line) {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
          const r = await fetch(url);
          if (r.ok) {
            const j = await r.json();
            const route = j.routes?.[0];
            const coords = route?.geometry?.coordinates;
            if (coords?.length) {
              line = coords;
              km = route.distance / 1000;
              min = route.duration / 60;
              const feature = {
                type: "Feature",
                geometry: { type: "LineString", coordinates: coords },
              };
              mapObj.current?.getSource("route")?.setData(feature);
              fitTo(coords);
            }
          }
        } catch (e) {
          logger?.warn?.("OSRM failed", e);
        }
      }

      // straight-line fallback
      if (!usedFixed && !line) {
        line = [
          [from.lng, from.lat],
          [to.lng, to.lat],
        ];
        km = haversineKm(from, to);
        min = (km / 40) * 60;
        const feature = {
          type: "Feature",
          geometry: { type: "LineString", coordinates: line },
        };
        mapObj.current?.getSource("route")?.setData(feature);
        fitTo(line);
      }

      if (!usedFixed && km != null && min != null) {
        setDistance(`${km.toFixed(1)} km`);
        setDuration(Math.round(min));
        setFare(Math.round(km * 2));
      }

      setExpanded(true);
    } catch (err) {
      logger?.error?.("Route error", err);
    } finally {
      setLoading(false);
    }
  };

  /* deep link + last route restore */
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const f = sp.get("from");
    const t = sp.get("to");
    const last = storage.get("lastRoute", null);

    if (f && locationCoords[f]) {
      setFrom(locationCoords[f]);
      setFromName(f);
    }
    if (t && locationCoords[t]) {
      setTo(locationCoords[t]);
      setToName(t);
    }
    if (!f && !t && last) {
      if (last.fromName && locationCoords[last.fromName]) {
        setFrom(locationCoords[last.fromName]);
        setFromName(last.fromName);
      }
      if (last.toName && locationCoords[last.toName]) {
        setTo(locationCoords[last.toName]);
        setToName(last.toName);
      }
    }
  }, []);

  /* share link */
  const shareUrl = (() => {
    const u = new URL(typeof window !== "undefined" ? window.location.href : "https://app");
    if (fromName) u.searchParams.set("from", fromName);
    if (toName) u.searchParams.set("to", toName);
    return u.toString();
  })();
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "USVI Route",
          text: `${fromName || "A"} → ${toName || "B"}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {}
  };

  /* ------------------------ UI ------------------------ */
  return (
    <Box sx={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}>
      {/* Map */}
      <Box ref={mapRef} sx={{ position: "absolute", inset: 0 }} />

      {/* Drawer card */}
      <Box
        sx={{
          position: "absolute",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1,
          width: 440,
          maxWidth: "95vw",
        }}
      >
        <Card sx={{ borderRadius: "18px 18px 12px 12px", boxShadow: 8, overflow: "hidden" }}>
          <CardContent sx={{ pt: 1.5 }}>
            <Box
              sx={{
                width: 48,
                height: 5,
                bgcolor: "grey.400",
                borderRadius: 3,
                mx: "auto",
                mb: 1.5,
                cursor: "pointer",
              }}
              onClick={() => setExpanded((v) => !v)}
            />
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6" fontWeight={800}>
                🚖 Route Planning
              </Typography>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={styleId}
                onChange={(_, v) => {
                  if (v) {
                    setStyleId(v);
                    storage.set("mapStyle", v);
                  }
                }}
              >
                <ToggleButton value="mapbox/streets-v12">Streets</ToggleButton>
                <ToggleButton value="mapbox/satellite-streets-v12">Sat</ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            <Stack spacing={1.5}>
              <Autocomplete
                options={ALL_LOCS}
                value={fromName}
                onChange={(_, v) => {
                  if (v && locationCoords[v]) {
                    setFromName(v);
                    setFrom(locationCoords[v]);
                    clearRoute(false);
                  }
                }}
                renderInput={(p) => <TextField {...p} label="Starting point" />}
              />
              <Autocomplete
                options={ALL_LOCS}
                value={toName}
                onChange={(_, v) => {
                  if (v && locationCoords[v]) {
                    setToName(v);
                    setTo(locationCoords[v]);
                    clearRoute(false);
                  }
                }}
                renderInput={(p) => <TextField {...p} label="Destination" />}
              />

              {/* Recents */}
              {recents.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  <Chip icon={<RestoreIcon />} label="Recent" variant="outlined" />
                  {recents.map((r) => (
                    <Chip
                      key={`${r.fromName}-${r.toName}-${r.ts}`}
                      label={`${r.fromName} → ${r.toName}`}
                      onClick={() => {
                        if (locationCoords[r.fromName] && locationCoords[r.toName]) {
                          setFromName(r.fromName);
                          setFrom(locationCoords[r.fromName]);
                          setToName(r.toName);
                          setTo(locationCoords[r.toName]);
                          clearRoute(false);
                        }
                      }}
                    />
                  ))}
                </Stack>
              )}

              {expanded && (
                <Stack direction="row" justifyContent="space-around" alignItems="center" mt={1}>
                  <Chip
                    icon={<AccessTimeIcon />}
                    label={duration ? `${duration} min` : "--"}
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    icon={<AttachMoneyIcon />}
                    label={fare != null ? `$${fare}` : "--"}
                    color="success"
                    variant="outlined"
                  />
                  <Chip icon={<MapIcon />} label={distance || "--"} color="info" variant="outlined" />
                </Stack>
              )}

              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button
                  fullWidth
                  variant="contained"
                  disabled={!isLngLat(from) || !isLngLat(to) || loading}
                  onClick={planRoute}
                  sx={{
                    fontWeight: 800,
                    borderRadius: 2,
                    background: "linear-gradient(90deg,#2563eb,#3b82f6)",
                  }}
                >
                  {loading ? "PLANNING…" : "PLAN ROUTE"}
                </Button>

                <Tooltip title="Share">
                  <span>
                    <IconButton aria-label="Share route" onClick={handleShare} disabled={!fromName || !toName}>
                      <ShareIcon />
                    </IconButton>
                  </span>
                </Tooltip>

                <Button
                  variant="outlined"
                  onClick={() => {
                    setFrom(null);
                    setTo(null);
                    setFromName("");
                    setToName("");
                    clearRoute();
                  }}
                >
                  Reset
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}