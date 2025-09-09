// src/pages/HomePage.js
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  Chip,
  Container,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
  Stack,
  Divider,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  ToggleButton,
  ToggleButtonGroup,
  Collapse,
  Alert,
  Slide,
  useScrollTrigger,
} from "@mui/material";

import SwapVertIcon from "@mui/icons-material/SwapVert";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import GpsFixedIcon from "@mui/icons-material/GpsFixed";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import DirectionsCarFilledRoundedIcon from "@mui/icons-material/DirectionsCarFilledRounded";
import BugReportIcon from "@mui/icons-material/BugReport";
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded";
import AltRouteRoundedIcon from "@mui/icons-material/AltRouteRounded";
import BeachAccessRoundedIcon from "@mui/icons-material/BeachAccessRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";

import EventLog from "../components/EventLog";
import SessionControls from "../components/SessionControls";
import ToolPanel from "../components/ToolPanel";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";

import HomeMap from "../components/HomeMap";
import { auth, db } from "../lib/firebase";
import { locationCoords } from "../data/locationCoords";
import { createRideRequest } from "../lib/createRideRequest";
import { resolveRoute } from "../lib/resolveRoute";
import logger from "../logger";
import useSnackbar from "../hooks/useSnackbar";

/* ------------------ env toggle: backend on/off ------------------ */
const BACKEND_ENABLED = process.env.REACT_APP_ENABLE_BACKEND === "1";

/* ----------------------- Local estimate (UI only) ----------------------- */
function computeFareLocal({ pickup, dropoff, pax }) {
  if (!pickup || !dropoff || pickup === dropoff) return null;
  const a = locationCoords[pickup];
  const b = locationCoords[dropoff];
  if (!a || !b) return null;

  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const aa = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  const km = 2 * R * Math.asin(Math.sqrt(aa));

  const base = 10; // base per party
  const per = 6; // extra pax
  const included = 1;
  const extras = Math.max(0, pax - included);
  const durationMin = Math.max(10, Math.round((km / 28) * 60)); // ~28 km/h

  return { fare: base + per * extras, durationMin };
}

const hasCoords = (name) => !!locationCoords?.[name];
const allLocationNames = Object.keys(locationCoords);

/* --------------------- local resolver fallback --------------------- */
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
function localResolveRoute(pickup, dropoff) {
  const from = locationCoords[pickup];
  const to = locationCoords[dropoff];
  if (!from || !to) {
    const err = new Error("location_not_found");
    err.code = "location_not_found";
    throw err;
  }
  const islFrom = islandOf(from);
  const islTo = islandOf(to);
  if (islFrom !== islTo) {
    const err = new Error("cross_island_not_supported");
    err.code = "cross_island_not_supported";
    throw err;
  }
  const dKm = haversineKm(from, to);
  const durationMin = Math.max(8, Math.round((dKm / 28) * 60));
  const routeId = `${pickup}__${dropoff}`.toLowerCase().replace(/\W+/g, "_").slice(0, 80);

  return {
    from: { name: pickup, lat: from.lat, lng: from.lng },
    to: { name: dropoff, lat: to.lat, lng: to.lng },
    island: islFrom,
    durationMin,
    routeId,
  };
}

/* ----------------------- Small helpers ----------------------- */
function HideOnScroll({ children }) {
  const trigger = useScrollTrigger({ threshold: 24 });
  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  );
}

// ---------- NEW: island helpers ----------
const toCodeQuick = (v) => {
  const s = String(v || "").trim().toUpperCase().replace(/\./g, "").replace(/\s+/g, " ");
  if (["STT", "STJ", "STX"].includes(s)) return s;
  if (s === "ST THOMAS") return "STT";
  if (s === "ST JOHN") return "STJ";
  if (s === "ST CROIX") return "STX";
  return null;
};
function sameIsland(name, isl) {
  const c = locationCoords?.[name];
  if (!c) return false;
  return islandOf(c) === isl;
}

/* ----------------------------------------------------------------------- */

export default function HomePage() {
  const navigate = useNavigate();
  const { showSnackbar, SnackbarComponent } = useSnackbar();
  const { search } = useLocation();
  const [island, setIsland] = useState("STT");

  // form state
  const [pickup, setPickup] = useState("Bolongo");
  const [dropoff, setDropoff] = useState("Charlotte Amalie");
  const [passengers, setPassengers] = useState("1");
  const [promo, setPromo] = useState("");
  const [pickupTime, setPickupTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [busy, setBusy] = useState(false);

  const pax = Math.max(1, parseInt(passengers || "1", 10));

  // deep links /?island=STT&from=Foo&to=Bar
  useEffect(() => {
    const sp = new URLSearchParams(search);
    const f = sp.get("from");
    const t = sp.get("to");
    const i = toCodeQuick(sp.get("island"));
    if (i) setIsland(i);
    if (f && locationCoords[f]) setPickup(f);
    if (t && locationCoords[t]) setDropoff(t);
  }, [search]);

  // per-island filtered list
  const islandLocations = useMemo(
    () => allLocationNames.filter((n) => sameIsland(n, island)).sort(),
    [island]
  );

  // auto-correct selections that don’t belong to current island
  useEffect(() => {
    const candidates = islandLocations;
    if (!candidates.length) return;
    if (pickup && !sameIsland(pickup, island)) {
      const next = candidates.includes("Charlotte Amalie") ? "Charlotte Amalie" : candidates[0];
      setPickup(next);
    }
    if (dropoff && !sameIsland(dropoff, island)) {
      const next = candidates.includes("Cyril E. King Airport") ? "Cyril E. King Airport" : candidates[0];
      setDropoff(next);
    }
    if (!pickup) setPickup(candidates[0]);
    if (!dropoff) setDropoff(candidates[1] || candidates[0]);
  }, [island, islandLocations, pickup, dropoff]); 

  /* --------------------- Resolve route (canonicalize) -------------------- */
  const [resolved, setResolved] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeErr, setRouteErr] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    setResolved(null);
    setRouteErr(null);
    if (!pickup || !dropoff || pickup === dropoff) return;
    // keep effects island-safe
    if (!sameIsland(pickup, island) || !sameIsland(dropoff, island)) return;

    const ac = new AbortController();
    (async () => {
      setRouteLoading(true);
      try {
        let rr = null;

        if (BACKEND_ENABLED) {
          const pickupCoords = locationCoords[pickup];
          const dropoffCoords = locationCoords[dropoff];
          try {
            rr = await resolveRoute({
              pickup,
              dropoff,
              pickupCoords,
              dropoffCoords,
              island,
              signal: ac.signal,
            });
          } catch (e) {
            logger.warn?.("resolveRoute server failed; using local fallback", e);
          }
        }

        if (!rr) rr = localResolveRoute(pickup, dropoff);

        setResolved(rr);
      } catch (e) {
        if (e?.name === "AbortError") return;
        setRouteErr(e?.code || "resolve_failed");
        setResolved(null);
      } finally {
        setRouteLoading(false);
      }
    })();

    return () => ac.abort();
  }, [pickup, dropoff, island]);

  /* ---------------------- Server price (authoritative) ------------------- */
  const [serverPrice, setServerPrice] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceErr, setPriceErr] = useState(null);

  useEffect(() => {
    setServerPrice(null);
    setPriceErr(null);
    if (!pickup || !dropoff || pickup === dropoff) return;
    if (!BACKEND_ENABLED) return;
    // prevent cross-island preview calls
    if (!sameIsland(pickup, island) || !sameIsland(dropoff, island)) return;

    const ac = new AbortController();
    (async () => {
      setPriceLoading(true);
      try {
        const body = resolved
          ? {
              pickup: resolved.from.name,
              dropoff: resolved.to.name,
              island: resolved.island,
              passengerCount: pax,
              pickupCoords: { lat: resolved.from.lat, lng: resolved.from.lng },
              dropoffCoords: { lat: resolved.to.lat, lng: resolved.to.lng },
            }
          : { pickup, dropoff, island, passengerCount: pax };

        const r = await fetch("/api/rides/price/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          credentials: "include",
          signal: ac.signal,
        });

        const j = await r.json().catch(() => ({}));
        if (!r.ok || !Number.isFinite(j?.amountCents)) {
          throw Object.assign(new Error("preview_failed"), { code: j?.error || "preview_failed", detail: j });
        }
        setServerPrice({
          fare: j.amountCents / 100,
          durationMin: j.durationMin ?? resolved?.durationMin ?? 15,
          rateId: j.rateId,
          estimated: !!j.estimated,
        });
      } catch (e) {
        if (e?.name !== "AbortError") setPriceErr(e?.code || "preview_failed");
      } finally {
        setPriceLoading(false);
      }
    })();

    return () => ac.abort();
  }, [pickup, dropoff, pax, island, resolved]);

  /* ----------------------- Local fallback (UI only) ---------------------- */
  const localEstimate = useMemo(() => {
    if (!pickup || !dropoff || pickup === dropoff) return null;
    return computeFareLocal({ pickup, dropoff, pax });
  }, [pickup, dropoff, pax]);

  const fareInfo = serverPrice || localEstimate;
  const fareNum = Number.isFinite(+fareInfo?.fare) ? +fareInfo.fare : null;

  /* ------------------------------ Handlers ------------------------------- */
  const handleSwap = () => {
    // swap only when both belong to the active island
    if (sameIsland(pickup, island) && sameIsland(dropoff, island)) {
      setPickup(dropoff);
      setDropoff(pickup);
    }
  };

  const quickSet = (from, to) => {
    // align island to the route's origin so quick chips never cross islands
    const isl = islandOf(locationCoords[from] || {});
    if (isl && isl !== island) setIsland(isl);
    setPickup(from);
    setDropoff(to);
    const el = document.getElementById("booking-card");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const canBook =
    pickup &&
    dropoff &&
    pickup !== dropoff &&
    hasCoords(pickup) &&
    hasCoords(dropoff) &&
    !busy &&
    !routeLoading &&
    !priceLoading &&
    !(routeErr && (routeErr === "cross_island_not_supported" || routeErr === "location_not_found"));

  const ensureSignedIn = async () => {
    if (auth.currentUser) return auth.currentUser;
    try {
      const cred = await signInAnonymously(auth);
      return cred.user;
    } catch (e) {
      logger.error("Anonymous sign-in failed", e);
      throw new Error("sign_in_failed");
    }
  };

  const handleBook = async () => {
    if (!canBook) {
      showSnackbar("Please complete the form to continue.", "warning");
      return;
    }
    setBusy(true);
    try {
      const user = await ensureSignedIn();
      const useIsland = resolved?.island || island;
      const puName = resolved?.from?.name || pickup;
      const doName = resolved?.to?.name || dropoff;
      const puCoords = resolved ? { lat: resolved.from.lat, lng: resolved.from.lng } : locationCoords[pickup];
      const doCoords = resolved ? { lat: resolved.to.lat, lng: resolved.to.lng } : locationCoords[dropoff];

      const rideId = await createRideRequest({
        pickup: puName,
        dropoff: doName,
        pickupCoords: puCoords,
        dropoffCoords: doCoords,
        passengerCount: pax,
        scheduledAt: new Date(pickupTime),
        promo: promo || undefined,
        ownerId: user?.uid,
        island: useIsland,
      });
      navigate(`/ridesharing/review/${rideId}`);
    } catch (err) {
      logger.error("createRideRequest failed", err);
      showSnackbar("Could not create ride. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------ Realtime (polished container) ------------------------------- */
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);

  async function startSession() {
    const tokenResponse = await fetch("/token");
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.value;

    const pc = new RTCPeerConnection();
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);

    const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
    pc.addTrack(ms.getTracks()[0]);

    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime/calls";
    const model = "gpt-realtime";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    const sdp = await sdpResponse.text();
    const answer = { type: "answer", sdp };
    await pc.setRemoteDescription(answer);

    peerConnection.current = pc;
  }

  function stopSession() {
    if (dataChannel) dataChannel.close();
    if (peerConnection.current) {
      peerConnection.current.getSenders().forEach((s) => s.track && s.track.stop());
      peerConnection.current.close();
    }
    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
  }

  function sendClientEvent(message) {
    if (!dataChannel) {
      console.error("No data channel", message);
      return;
    }
    const timestamp = new Date().toLocaleTimeString();
    message.event_id = message.event_id || crypto.randomUUID();
    dataChannel.send(JSON.stringify(message));
    if (!message.timestamp) message.timestamp = timestamp;
    setEvents((prev) => [message, ...prev]);
  }

  function sendTextMessage(message) {
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: message }],
      },
    };
    sendClientEvent(event);
    sendClientEvent({ type: "response.create" });
  }

  useEffect(() => {
    if (!dataChannel) return;
    const onMsg = (e) => {
      const event = JSON.parse(e.data);
      if (!event.timestamp) event.timestamp = new Date().toLocaleTimeString();
      setEvents((prev) => [event, ...prev]);
    };
    const onOpen = () => {
      setIsSessionActive(true);
      setEvents([]);
    };
    dataChannel.addEventListener("message", onMsg);
    dataChannel.addEventListener("open", onOpen);
    return () => {
      dataChannel.removeEventListener("message", onMsg);
      dataChannel.removeEventListener("open", onOpen);
    };
  }, [dataChannel]);

  /* ------------------------------ Render -------------------------------- */
  const islandLabel = island === "STT" ? "St. Thomas" : island === "STJ" ? "St. John" : "St. Croix";
  const ctaBtn = { fontWeight: 800, borderRadius: 2, textTransform: "none" };

  // High-contrast input styling for the glass card
  const inputSx = {
    "& .MuiInputBase-input": { color: "rgba(255,255,255,0.98)" },
    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.85)" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#fff" },
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.35)" },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.55)" },
    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#fff" },
    "& .MuiSvgIcon-root, & .MuiInputAdornment-root, & .MuiSelect-icon": {
      color: "rgba(255,255,255,0.9)",
    },
  };

  return (
    <>
      {/* Top AppBar (elevates on scroll) */}
      <HideOnScroll>
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            background: "rgba(5, 16, 32, 0.35)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid rgba(255,255,255,.08)",
          }}
        >
          <Toolbar sx={{ gap: 2 }}>
            <img src="/openai-logomark.svg" width={26} height={26} alt="App logo" style={{ borderRadius: 6 }} />
            <Typography fontWeight={900} sx={{ letterSpacing: 1 }}>
              USVI EXPLORER
            </Typography>

            <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
              <Button onClick={() => navigate("/routes")} color="inherit" startIcon={<AltRouteRoundedIcon />}>
                Routes
              </Button>
              <Button onClick={() => navigate("/beaches")} color="inherit" startIcon={<BeachAccessRoundedIcon />}>
                Beaches
              </Button>
              <Button onClick={() => navigate("/events")} color="inherit" startIcon={<EventAvailableRoundedIcon />}>
                Events
              </Button>
            </Stack>
          </Toolbar>
        </AppBar>
      </HideOnScroll>
      <Toolbar />{/* spacer */}

      {/* Hero */}
      <Box
        sx={{
          position: "relative",
          background:
            "radial-gradient(1200px 640px at 10% -10%, rgba(255,255,255,.20), transparent 60%), radial-gradient(1200px 640px at 90% -20%, rgba(255,255,255,.15), transparent 60%), linear-gradient(135deg, #00192e 0%, #03496c 45%, #0ea5e9 100%)",
          color: "white",
          pb: { xs: 10, md: 14 },
          pt: { xs: 6, md: 10 },
          overflow: "hidden",
        }}
      >
        {/* glow accents */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: -300,
            background:
              "radial-gradient(800px 360px at 15% -10%, rgba(255,255,255,.25), transparent 60%), radial-gradient(800px 360px at 85% -10%, rgba(255,255,255,.2), transparent 60%)",
            filter: "blur(40px)",
            opacity: 0.5,
          }}
        />

        <Container maxWidth="lg" sx={{ position: "relative" }}>
          <Stack spacing={2} alignItems="center">
            {/* Island toggle */}
            <ToggleButtonGroup
              exclusive
              value={island}
              onChange={(_, v) => v && setIsland(v)}
              color="secondary"
              sx={{
                bgcolor: "rgba(255,255,255,0.08)",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,.3)",
                "& .MuiToggleButton-root": { border: 0, px: 2.2, py: 0.7, fontWeight: 800, color: "white" },
              }}
            >
              <ToggleButton value="STT">St. Thomas</ToggleButton>
              <ToggleButton value="STJ">St. John</ToggleButton>
              <ToggleButton value="STX">St. Croix</ToggleButton>
            </ToggleButtonGroup>

            <Typography
              variant="h2"
              align="center"
              sx={{ fontWeight: 900, letterSpacing: 1, textShadow: "0 6px 40px rgba(0,0,0,.5)" }}
            >
              Book trusted rides across {islandLabel}
            </Typography>
            <Typography align="center" sx={{ opacity: 0.95, maxWidth: 820 }}>
              Real-time routes, transparent pricing, and hand-picked highlights across the USVI.
            </Typography>

            {/* Booking Card */}
            <Paper
              id="booking-card"
              elevation={0}
              sx={{
                mt: 3,
                mx: "auto",
                width: "100%",
                maxWidth: 980,
                borderRadius: 4,
                p: { xs: 2, md: 3 },
                backdropFilter: "saturate(150%) blur(10px)",
                backgroundColor: "rgba(9,20,40,.32)",
                border: "1px solid rgba(255,255,255,.18)",
                boxShadow: "0 18px 45px rgba(0,0,0,.45)",
              }}
            >
              <Grid container spacing={1.5} alignItems="center">
                {/* Pickup */}
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    fullWidth
                    label="Pickup"
                    value={pickup}
                    sx={inputSx}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (sameIsland(v, island)) setPickup(v);
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <GpsFixedIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  >
                    {islandLocations.map((loc) => (
                      <MenuItem key={loc} value={loc}>
                        {loc}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* Swap */}
                <Grid item xs={12} md="auto" sx={{ display: "flex", justifyContent: "center" }}>
                  <Tooltip title="Swap">
                    <span>
                      <IconButton onClick={handleSwap} size="small" sx={{ color: "white" }}>
                        <SwapVertIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Grid>

                {/* Dropoff */}
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    fullWidth
                    label="Dropoff"
                    value={dropoff}
                    sx={inputSx}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (sameIsland(v, island)) setDropoff(v);
                    }}
                  >
                    {islandLocations.map((loc) => (
                      <MenuItem key={loc} value={loc}>
                        {loc}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* Pax */}
                <Grid item xs={6} md={1.5}>
                  <TextField
                    type="number"
                    label="Pax"
                    value={passengers}
                    sx={inputSx}
                    onChange={(e) => setPassengers(e.target.value)}
                    inputProps={{ min: 1, max: 10 }}
                    fullWidth
                  />
                </Grid>

                {/* Pickup time */}
                <Grid item xs={12} md={2.5}>
                  <TextField
                    fullWidth
                    label="Pickup time"
                    type="datetime-local"
                    value={pickupTime}
                    sx={inputSx}
                    onChange={(e) => setPickupTime(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                {/* Promo + Book */}
                <Grid item xs={12} md={12} mt={{ xs: 1, md: 2 }}>
                  {!!routeErr && (
                    <Alert severity="warning" sx={{ mb: 1 }}>
                      {routeErr === "cross_island_not_supported"
                        ? "Pickup and dropoff are on different islands. Please choose locations on the same island."
                        : "We couldn’t snap your locations to a known pickup/dropoff point. Try another nearby landmark."}
                    </Alert>
                  )}

                  {resolved && (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Chip
                        size="small"
                        label={`Route: ${resolved.routeId}`}
                        variant="outlined"
                        sx={{ color: "#fff", borderColor: "rgba(255,255,255,.4)" }}
                      />
                      <Chip
                        size="small"
                        label={`Island: ${resolved.island}`}
                        variant="outlined"
                        sx={{ color: "#fff", borderColor: "rgba(255,255,255,.4)" }}
                      />
                      <Chip
                        size="small"
                        label={`ETA: ~${resolved.durationMin} min`}
                        variant="outlined"
                        sx={{ color: "#fff", borderColor: "rgba(255,255,255,.4)" }}
                      />
                      <Tooltip title="Show route debug">
                        <IconButton size="small" onClick={() => setShowDebug((v) => !v)} sx={{ color: "white" }}>
                          <BugReportIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )}

                  <Grid container alignItems="center" spacing={1.5}>
                    <Grid item xs>
                      <TextField
                        fullWidth
                        label="Promo code"
                        value={promo}
                        sx={inputSx}
                        onChange={(e) => setPromo(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <LocalOfferIcon fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item>
                      <Button
                        variant="contained"
                        onClick={handleBook}
                        disabled={!canBook}
                        sx={{
                          fontWeight: 800,
                          px: 3.2,
                          py: 1.6,
                          borderRadius: 2,
                          background: "linear-gradient(90deg, #22c55e 0%, #16a34a 50%, #22c55e 100%)",
                          boxShadow: "0 10px 25px rgba(34,197,94,.35), inset 0 -2px 0 rgba(0,0,0,.2)",
                          ":disabled": { background: "rgba(255,255,255,.14)", color: "white" },
                        }}
                      >
                        {busy
                          ? "BOOKING…"
                          : priceLoading || routeLoading
                          ? "Fetching price…"
                          : fareNum != null
                          ? `BOOK • $${fareNum.toFixed(2)}${serverPrice ? "" : " (est)"}`
                          : "BOOK"}
                      </Button>
                    </Grid>
                    <Grid item>
                      <Chip
                        icon={<BoltRoundedIcon />}
                        label="Usually quick pickup"
                        size="small"
                        variant="outlined"
                        sx={{ color: "white", borderColor: "rgba(255,255,255,.4)" }}
                      />
                    </Grid>
                  </Grid>

                  {BACKEND_ENABLED && !!priceErr && (
                    <Typography sx={{ mt: 1.2 }} color="error">
                      Price preview unavailable. You can still book; the price will be confirmed on the next screen.
                    </Typography>
                  )}

                  <Collapse in={showDebug} unmountOnExit>
                    <Paper sx={{ mt: 1, p: 1.5, background: "rgba(255,255,255,.08)" }} variant="outlined">
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        <strong>Resolved</strong>: {resolved?.from?.name} → {resolved?.to?.name} ({resolved?.island})
                        <br />
                        <strong>routeId</strong>: {resolved?.routeId}
                        <br />
                        <strong>serverPrice</strong>:{" "}
                        {serverPrice ? `$${serverPrice.fare.toFixed(2)} (est:${serverPrice.estimated ? "yes" : "no"})` : "—"}
                      </Typography>
                    </Paper>
                  </Collapse>
                </Grid>
              </Grid>
            </Paper>
          </Stack>
        </Container>

        {/* Wave divider */}
        <WaveDivider />
      </Box>

      {/* USVI: This Week + Ride Shortcuts */}
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <EventStrip island={island} onAll={() => navigate("/events")} />
        <RideShortcuts island={island} onQuickSet={quickSet} />
      </Container>

      {/* Map preview — Explore scroll target */}
      <Container id="explore-section" maxWidth="lg" sx={{ mt: 4 }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            p: 2,
            border: "1px solid #e6eef7",
            backgroundColor: "#f7fbff",
          }}
        >
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 800, color: "#0b2a4a" }}>
            Explore your route
          </Typography>
          <Box sx={{ height: { xs: 280, md: 420 }, borderRadius: 2, overflow: "hidden" }}>
            <HomeMap
              island={island}
              onIslandChange={setIsland}
              pickupCoords={locationCoords[pickup]}
              dropoffCoords={locationCoords[dropoff]}
            />
          </Box>
        </Paper>

        {/* Featured Beaches */}
        <BeachHighlights island={island} onAll={() => navigate("/beaches")} />

        {/* Trust badges */}
        <Grid container spacing={2} mt={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2.2, borderRadius: 2, textAlign: "center" }}>
              <ShieldRoundedIcon />
              <Typography fontWeight={700} mt={0.5}>
                Trusted Drivers
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Licensed & vetted professionals.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2.2, borderRadius: 2, textAlign: "center" }}>
              <DirectionsCarFilledRoundedIcon />
              <Typography fontWeight={700} mt={0.5}>
                Reliable Rides
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Clean, comfortable vehicles.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2.2, borderRadius: 2, textAlign: "center" }}>
              <BoltRoundedIcon />
              <Typography fontWeight={700} mt={0.5}>
                Lightning-Fast Booking
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tap, confirm, you’re set.
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Realtime Console (sleek card, not full-screen) */}
        <Paper
          elevation={0}
          sx={{
            mt: 4,
            p: 2,
            borderRadius: 3,
            border: "1px solid #e6eef7",
            background: "linear-gradient(180deg, rgba(2,6,23,0.03), rgba(2,6,23,0.04))",
          }}
        >
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <Box sx={{ flex: 1, minHeight: 200, maxHeight: 360, overflowY: "auto" }}>
              <EventLog events={events} />
            </Box>
            <Box sx={{ width: { xs: "100%", md: 360 }, display: "grid", gap: 1 }}>
              <SessionControls
                startSession={startSession}
                stopSession={stopSession}
                sendClientEvent={sendClientEvent}
                sendTextMessage={sendTextMessage}
                events={events}
                isSessionActive={isSessionActive}
              />
              <ToolPanel
                sendClientEvent={sendClientEvent}
                sendTextMessage={sendTextMessage}
                events={events}
                isSessionActive={isSessionActive}
              />
            </Box>
          </Stack>
        </Paper>

        {/* Footer */}
        <Box mt={6} mb={4} textAlign="center" color="text.secondary">
          <Typography variant="body2">© {new Date().getFullYear()} VIBER · Terms · Privacy · Contact</Typography>
        </Box>
      </Container>

      <SnackbarComponent />
    </>
  );
}

/* ----------------------- Inline components ----------------------- */

function WaveDivider() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      style={{
        display: "block",
        width: "100%",
        height: 120,
        position: "absolute",
        left: 0,
        right: 0,
        bottom: -1,
        opacity: 0.98,
      }}
    >
      <path d="M0,40 C240,100 480,0 720,40 C960,80 1200,20 1440,60 L1440,120 L0,120 Z" fill="#F7FBFC" />
    </svg>
  );
}

function EventStrip({ island, onAll }) {
  const [mode, setMode] = useState("week"); // 'today' | 'week' | 'all'
  const [loading, setLoading] = useState(true);
  const [eventsAsc, setEventsAsc] = useState([]);   // startDate asc (future-ish)
  const [eventsDesc, setEventsDesc] = useState([]); // startDate desc (recent past)
  const [refreshKey, setRefreshKey] = useState(0);

  const toDate = (ts) => {
    if (!ts) return null;
    if (typeof ts.toDate === "function") return ts.toDate();
    if (ts.seconds) return new Date(ts.seconds * 1000);
    try { return new Date(ts); } catch { return null; }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);

        // Small future window (ordered asc)
        const qAsc = query(
          collection(db, "events"),
          orderBy("startDate", "asc"),
          limit(60)
        );
        const ascSnap = await getDocs(qAsc);
        const asc = ascSnap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));

        // Small recent-past window (ordered desc) – used as fallback
        const qDesc = query(
          collection(db, "events"),
          orderBy("startDate", "desc"),
          limit(40)
        );
        const descSnap = await getDocs(qDesc);
        const desc = descSnap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));

        if (!active) return;
        setEventsAsc(asc);
        setEventsDesc(desc);
      } catch (e) {
        if (!active) return;
        console.error("EventStrip fetch failed:", e);
        setEventsAsc([]);
        setEventsDesc([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [refreshKey]);

  const visible = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);

    const matchIsland = (ev) => !island || (ev.island || "").toUpperCase() === island;
    const s = (ev) => toDate(ev.startDate);
    const e = (ev) => toDate(ev.endDate) || s(ev);

    const isToday = (ev) => {
      const d = s(ev); return d && d.toDateString() === now.toDateString();
    };
    const isWeek = (ev) => {
      const d = s(ev); return d && d >= now && d <= weekEnd;
    };
    const isUpcoming = (ev) => {
      const end = e(ev); return end && end >= now;
    };

    // prefer future list first
    let base = eventsAsc;
    let filtered;
    if (mode === "today") filtered = base.filter((ev) => matchIsland(ev) && isToday(ev));
    else if (mode === "week") filtered = base.filter((ev) => matchIsland(ev) && isWeek(ev));
    else /* all */ filtered = base.filter((ev) => matchIsland(ev) && isUpcoming(ev));

    // If empty for today/week/all-upcoming, fall back to recent past
    if (filtered.length === 0 && mode !== "all") {
      filtered = eventsDesc
        .filter((ev) => {
          const end = e(ev);
          return matchIsland(ev) && end && end < now;
        })
        .slice(0, 6);
      return filtered;
    }

    return filtered.slice(0, 6);
  }, [mode, island, eventsAsc, eventsDesc]);

  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: "background.paper",
        borderRadius: 3,
        px: { xs: 2, md: 3 },
        py: 2,
        boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
        border: "1px solid #e6eef7",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2} sx={{ flexWrap: "wrap" }}>
        <Typography variant="h6" fontWeight={800}>
          This Week in the USVI
        </Typography>

        {/* Tabs: Today / Week / All */}
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, v) => v && setMode(v)}
          size="small"
          sx={{ ml: 1, "& .MuiToggleButton-root": { px: 1.4, py: 0.3, border: 0 } }}
        >
          <ToggleButton value="today">Today</ToggleButton>
          <ToggleButton value="week">This Week</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
        </ToggleButtonGroup>

        <Divider orientation="vertical" flexItem />

        {loading ? (
          <Skeleton variant="text" width={220} />
        ) : visible.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No events to show.
          </Typography>
        ) : (
          visible.map((ev) => {
            const start = ev.startDate?.toDate ? ev.startDate.toDate() : new Date(ev.startDate);
            const label = `${start?.toLocaleDateString()} • ${ev.title} (${(ev.island || "").toUpperCase()})`;
            return <Chip key={ev.id} label={label} size="small" sx={{ mr: 1, mb: 1 }} />;
          })
        )}

        <Stack direction="row" sx={{ ml: "auto" }} spacing={1}>
          <Chip onClick={onAll} clickable label="All events" variant="outlined" />
          <Tooltip title="Refresh">
            <IconButton onClick={() => setRefreshKey((k) => k + 1)} size="small">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
}

/** Ride shortcuts with alias support */
function RideShortcuts({ island, onQuickSet }) {
  const firstKnown = (names) => (Array.isArray(names) ? names.find(hasCoords) : hasCoords(names) ? names : null);

  const ROUTES = [
    // STT
    {
      island: "STT",
      from: ["Cyril E. King Airport", "Airport (STT)"],
      to: ["Charlotte Amalie", "Charlotte Amalie (Town)"],
      label: "Airport → Town",
    },
    {
      island: "STT",
      from: ["Havensight Cruise Port", "Yacht Haven - Havensight", "Yacht Haven Grande"],
      to: ["Magens Bay"],
      label: "Havensight → Magens",
    },
    // STJ
    {
      island: "STJ",
      from: ["Cruz Bay Ferry", "Cruz Bay"],
      to: ["Maho Bay"],
      label: "Cruz Bay → Maho",
    },
    {
      island: "STJ",
      from: ["Red Hook Ferry", "Red Hook"],
      to: ["Trunk Bay"],
      label: "Red Hook → Trunk Bay",
    },
    // STX
    {
      island: "STX",
      from: ["Christiansted"],
      to: ["Frederiksted"],
      label: "Christiansted → Frederiksted",
    },
  ];

  const filtered = ROUTES.filter((r) => (!island || r.island === island))
    .map((r) => {
      const from = firstKnown(r.from);
      const to = firstKnown(r.to);
      return from && to ? { ...r, from, to } : null;
    })
    .filter(Boolean)
    .slice(0, 6);

  if (filtered.length === 0) return null;

  return (
    <Box sx={{ mt: 2.5, mb: 1, display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
      <Typography variant="subtitle1" sx={{ mr: 1, fontWeight: 800, color: "#0b2a4a" }}>
        Quick rides:
      </Typography>
      {filtered.map((s) => (
        <Chip
          key={`${s.from}-${s.to}`}
          label={`${s.label} (${s.island})`}
          onClick={() => onQuickSet(s.from, s.to)}
          size="small"
          clickable
        />
      ))}
    </Box>
  );
}

function BeachHighlights({ island, onAll }) {
  const [beaches, setBeaches] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!db) throw new Error("Firestore not initialized");
        const col = collection(db, "beaches");
        const qFeatured = query(col, limit(12));
        const snap = await getDocs(qFeatured);
        let items = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
        items = items.filter((b) => b.featured === true);
        if (island) items = items.filter((b) => (b.island || "").toUpperCase() === island);
        if (items.length === 0) {
          let any = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
          if (island) any = any.filter((b) => (b.island || "").toUpperCase() === island);
          items = any.slice(0, 6);
        } else {
          items = items.slice(0, 6);
        }
        if (active) setBeaches(items);
      } catch {
        if (active) setBeaches([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [island]);

  return (
    <Box sx={{ py: { xs: 4, md: 6 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>
          Featured Beaches
        </Typography>
        <Chip label="See all" onClick={onAll} clickable />
      </Stack>
      <Grid container spacing={3}>
        {beaches === null
          ? Array.from({ length: 6 }).map((_, i) => (
              <Grid key={i} item xs={12} sm={6} md={4}>
                <Skeleton variant="rounded" height={260} />
              </Grid>
            ))
          : beaches.length === 0
          ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  No beaches found yet. Add some to your Firestore <code>beaches</code> collection with fields:{" "}
                  <code>name, island, imageUrl, description, featured, slug</code>.
                </Typography>
              </Paper>
            </Grid>
            )
          : beaches.map((b) => (
              <Grid key={b.id} item xs={12} sm={6} md={4}>
                <Card sx={{ height: "100%" }}>
                  <CardActionArea onClick={onAll}>
                    <CardMedia
                      component="img"
                      height="180"
                      src={
                        b.imageUrl ||
                        `/images/${(b.slug || b.name || "beach")
                          .toString()
                          .toLowerCase()
                          .replace(/\s+/g, "-")}.jpg`
                      }
                      alt={b.name || "Beach"}
                      onError={(e) => {
                        e.currentTarget.src = "/images/placeholder-beach.jpg";
                      }}
                    />
                    <CardContent>
                      <Stack spacing={0.5}>
                        <Typography variant="h6" fontWeight={800}>
                          {b.name || "Untitled Beach"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {b.description || "A perfect spot to swim, snorkel, and relax."}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
                          <Chip size="small" label={(b.island || "").toUpperCase()} />
                          <Chip size="small" label="Swim" variant="outlined" />
                          <Chip size="small" label="Snorkel" variant="outlined" />
                        </Stack>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
      </Grid>
    </Box>
  );
}