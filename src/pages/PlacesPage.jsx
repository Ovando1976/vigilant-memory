// src/pages/PlacesPage.jsx
import React from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  Stack,
  TextField,
  MenuItem,
  InputAdornment,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Skeleton,
  Button,
  IconButton,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import LocalDiningIcon from "@mui/icons-material/LocalDining";
import HotelIcon from "@mui/icons-material/Hotel";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import PlaceIcon from "@mui/icons-material/Place";
import RefreshIcon from "@mui/icons-material/Refresh";
import ShareIcon from "@mui/icons-material/Share";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import PlaceMap from "../components/PlaceMap";
import ImageWithFallback from "../components/ImageWithFallback";
import { Link as RouterLink } from "react-router-dom";

/* ------------------------------- constants -------------------------------- */
const ISLANDS = [
  { code: "ALL", label: "All islands" },
  { code: "STT", label: "St. Thomas" },
  { code: "STJ", label: "St. John" },
  { code: "STX", label: "St. Croix" },
];
const PRICE = [
  { code: "ALL", label: "Any" },
  { code: "$", label: "$" },
  { code: "$$", label: "$$" },
  { code: "$$$", label: "$$$" },
  { code: "$$$$", label: "$$$$" },
];
const RATING = [
  { code: "ALL", label: "Any" },
  { code: 3, label: "3.0+" },
  { code: 3.5, label: "3.5+" },
  { code: 4, label: "4.0+" },
  { code: 4.5, label: "4.5+" },
];

const WIDE_LIMIT = 250; // scan once (safe across browsers)
const GET_TIMEOUT = 7000; // avoid Safari hangs

/* ----------------------------- helpers ---------------------------------- */
const withTimeout = (promise, ms, label = "timeout") =>
  new Promise((resolve, reject) => {
    const t = setTimeout(
      () =>
        reject(
          Object.assign(new Error(`${label} after ${ms}ms`), {
            code: "timeout",
          })
        ),
      ms
    );
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });

function getLatLng(p) {
  const lat = Number(p?.lat ?? p?.latitude ?? p?.coordinates?.lat);
  const lng = Number(p?.lng ?? p?.longitude ?? p?.coordinates?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}
function toPriceCode(val) {
  if (val == null) return null;
  if (typeof val === "number") {
    const n = Math.max(1, Math.min(4, Math.floor(val)));
    return "$".repeat(n);
  }
  const s = String(val).trim();
  if (/^\$+$/.test(s)) return s.slice(0, 4);
  const n = Number(s);
  return Number.isFinite(n) ? "$".repeat(Math.max(1, Math.min(4, n))) : null;
}
function priceMatches(docVal, filterCode) {
  if (filterCode === "ALL") return true;
  return toPriceCode(docVal) === filterCode;
}
function padTime(h, m) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function to24h(h, m, ampm) {
  let hh = Number(h);
  const mm = String(m).padStart(2, "0");
  const ap = (ampm || "").toLowerCase();
  if (ap === "pm" && hh < 12) hh += 12;
  if (ap === "am" && hh === 12) hh = 0;
  return `${String(hh).padStart(2, "0")}:${mm}`;
}
function parseOpenField(v) {
  if (!v) return [];
  const s = String(v).trim();
  if (!s || /^closed$/i.test(s)) return [];
  return s
    .split(/[;,]/)
    .map((chunk) => {
      const norm = chunk.replace(/[–—−]/g, "-").trim();
      const m = norm.match(
        /(\d{1,2})(?::?(\d{2}))?\s*(am|pm)?\s*-\s*(\d{1,2})(?::?(\d{2}))?\s*(am|pm)?/i
      );
      if (!m) {
        const m24 = norm.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
        if (!m24) return null;
        return { start: padTime(m24[1], m24[2]), end: padTime(m24[3], m24[4]) };
      }
      const [, h1, min1 = "00", ap1, h2, min2 = "00", ap2] = m;
      return { start: to24h(h1, min1, ap1), end: to24h(h2, min2, ap2) };
    })
    .filter(Boolean);
}
function isOpenNow(place, now = new Date()) {
  try {
    const day = now.getDay();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const cur = `${hh}:${mm}`;
    const ranges = Array.isArray(place?.openHours?.[day])
      ? place.openHours[day]
      : parseOpenField(place?.[`open${day}`]);
    if (!ranges?.length) return false;
    return ranges.some(
      (r) => r?.start && r?.end && cur >= r.start && cur <= r.end
    );
  } catch {
    return false;
  }
}

/** classify kind so mislabeled docs still show up */
function classify(kind, p = {}) {
  const k = String(kind || "").toLowerCase();
  const dk = String(p.kind || "").toLowerCase();
  if (dk) {
    if (dk === k) return true;
    if (
      k === "food" &&
      ["restaurant", "bar", "cafe", "café", "coffee", "bakery"].includes(dk)
    )
      return true;
    if (k === "shops" && ["shop", "shopping", "store"].includes(dk))
      return true;
    if (k === "stays" && ["hotel", "resort", "lodging"].includes(dk))
      return true;
  }
  const hay = [
    p.name,
    p.description,
    Array.isArray(p.tags) ? p.tags.join(" ") : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (k === "food")
    return /\b(restaurant|cafe|café|coffee|bar|grill|cantina|taqueria|bistro|deli|diner|pizz?eria|pizza|taco?s|sushi|bakery|pub|brew(ery|pub)|distiller(y|ie)|lounge|bbq|steakhouse|seafood|ice\s?cream)\b/.test(
      hay
    );
  if (k === "stays")
    return /\b(hotel|resort|villa|condo|guest\s?house|inn|lodge|bnb|bed\s*&?\s*breakfast)\b/.test(
      hay
    );
  if (k === "shops")
    return /\b(shop|shopping|store|market|boutique|gift|gallery|jewel|souvenir|mall)\b/.test(
      hay
    );
  return true;
}

/** Build a same-origin URL for images stored under public/images/places */
function publicImageUrl(nameOrPath) {
  if (!nameOrPath) return null;
  let s = String(nameOrPath).trim();

  // Already an absolute app path, leave as-is
  if (s.startsWith("/")) return s;

  // If someone put a full http(s) URL in Firestore, just return it
  if (/^https?:\/\//i.test(s) || s.startsWith("//")) return s;

  // Treat as file or subpath inside /images/places
  const base = process.env.PUBLIC_URL || "";
  const parts = s.split("/");
  const file = encodeURIComponent(parts.pop());
  const dir = parts.join("/");
  return `${base}/images/places/${dir ? `${dir}/` : ""}${file}`;
}

/* -------------------- Component (SAFE self-loading) --------------------- */
export default function PlacesPage({ kind = "food", getItemHref }) {
  const getHref = React.useCallback(
    (item) =>
      typeof getItemHref === "function"
        ? getItemHref(item)
        : `/places/${item.id}`,
    [getItemHref]
  );

  const [items, setItems] = React.useState(null);
  const [island, setIsland] = React.useState("ALL");
  const [price, setPrice] = React.useState("ALL");
  const [rating, setRating] = React.useState("ALL");
  const [search, setSearch] = React.useState("");
  const [openNowFlag, setOpenNowFlag] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [focus, setFocus] = React.useState(null);

  // HUD toggle: add ?debug=1 to the hash, e.g. #/food?debug=1
  const debug = React.useMemo(() => {
    try {
      return (
        new URLSearchParams(
          (window.location.hash || "").split("?")[1] || ""
        ).get("debug") === "1"
      );
    } catch {
      return false;
    }
  }, []);
  const [dbg, setDbg] = React.useState({
    wide: 0,
    shown: 0,
    project: db?.app?.options?.projectId,
  });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setItems(null);
      try {
        const snap = await withTimeout(
          getDocs(query(collection(db, "places"), limit(WIDE_LIMIT))),
          GET_TIMEOUT,
          "wide getDocs"
        );

        let all = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));

        // client-side island filter
        if (island !== "ALL") {
          all = all.filter(
            (p) => String(p.island || "").toUpperCase() === island
          );
        }

        // client-side classification
        const classified = all.filter((p) => classify(kind, p));

        // if classifier yields 0 but Firestore returned docs, show raw list
        let list = classified.length > 0 ? classified : all;

        // stable sort
        list.sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || ""))
        );

        if (!cancelled) {
          setItems(list);
          setDbg({
            wide: snap.size,
            shown: list.length,
            project: db?.app?.options?.projectId,
          });
        }
      } catch (e) {
        console.error(
          "[PlacesPage] wide scan failed:",
          e?.code || e?.message || e
        );
        if (!cancelled) {
          setItems([]); // show “No results” instead of blank
          setDbg({ wide: 0, shown: 0, project: db?.app?.options?.projectId });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, island, refreshKey]);

  /* ----------------------------- filtering -------------------------------- */
  const visible = React.useMemo(() => {
    if (!Array.isArray(items)) return null;
    const term = search.trim().toLowerCase();
    const now = new Date();
    return items
      .filter((p) => priceMatches(p.priceLevel, price))
      .filter((p) =>
        rating === "ALL" ? true : Number(p.rating || 0) >= Number(rating)
      )
      .filter((p) => (openNowFlag ? isOpenNow(p, now) : true))
      .filter((p) =>
        term
          ? [
              p.name,
              p.description,
              Array.isArray(p.tags) ? p.tags.join(" ") : "",
              p.address,
            ]
              .filter(Boolean)
              .some((s) => String(s).toLowerCase().includes(term))
          : true
      );
  }, [items, price, rating, search, openNowFlag]);

  const markers = React.useMemo(
    () =>
      (visible || [])
        .map((p) => ({ ...getLatLng(p), id: p.id, name: p.name }))
        .filter(Boolean),
    [visible]
  );

  const toHashUrl = (appPath) => {
    const path = appPath.startsWith("/") ? appPath : `/${appPath}`;
    return `${window.location.origin}${window.location.pathname}#${path}`;
  };

  const placeholderForKind =
    kind === "stays"
      ? "/images/places/placeholder-stays.jpg"
      : kind === "shops"
      ? "/images/places/placeholder-shop.jpg"
      : "/images/places/placeholder-restaurant.jpg";

  return (
    <Container maxWidth="lg" sx={{ py: 4, overflow: "visible" }}>
      {debug && (
        <Box
          sx={{
            position: "fixed",
            top: 8,
            left: 8,
            zIndex: 9999,
            bgcolor: "rgba(0,0,0,.6)",
            color: "#fff",
            px: 1,
            py: 0.5,
            borderRadius: 1,
            fontSize: 12,
          }}
        >
          <div>
            <b>proj:</b> {dbg.project || "?"}
          </div>
          <div>
            <b>wide:</b> {dbg.wide} <b>shown:</b> {dbg.shown}
          </div>
          <div>
            <b>kind:</b> {kind} <b>island:</b> {island}
          </div>
        </Box>
      )}

      {/* Hero */}
      <Box
        sx={{
          position: "relative",
          borderRadius: 4,
          overflow: "hidden",
          mb: 2,
          px: { xs: 2, md: 3 },
          py: { xs: 2, md: 3 },
          background:
            "linear-gradient(135deg, rgba(2,132,199,.10) 0%, rgba(124,58,237,.10) 100%)",
          border: (t) => `1px solid ${t.palette.divider}`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          {kind === "stays" ? (
            <HotelIcon />
          ) : kind === "shops" ? (
            <StorefrontIcon />
          ) : (
            <LocalDiningIcon />
          )}
          <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: 0.2 }}>
            {kind === "stays"
              ? "Accommodations"
              : kind === "shops"
              ? "Shopping"
              : "Food & Drink"}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Discover local favorites and island classics. Filter and tap a card to
          focus the map — or open details.
        </Typography>
      </Box>

      {/* Sticky filter bar */}
      <Paper
        elevation={6}
        sx={{
          position: "sticky",
          top: { xs: 8, md: 12 },
          zIndex: (t) => t.zIndex.appBar + 1,
          p: 2,
          mb: 2,
          borderRadius: 3,
          backdropFilter: "blur(10px)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,.86), rgba(255,255,255,.78))",
          border: "1px solid rgba(0,0,0,.06)",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems="center"
        >
          <TextField
            select
            label="Island"
            value={island}
            onChange={(e) => setIsland(e.target.value)}
            size="small"
            sx={{ minWidth: 180 }}
          >
            {ISLANDS.map((i) => (
              <MenuItem key={i.code} value={i.code}>
                {i.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            size="small"
            sx={{ minWidth: 120 }}
          >
            {PRICE.map((p) => (
              <MenuItem key={p.code} value={p.code}>
                {p.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Rating"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            size="small"
            sx={{ minWidth: 120 }}
          >
            {RATING.map((r) => (
              <MenuItem key={r.code} value={r.code}>
                {r.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Search"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 260 }}
          />
          <Chip
            label={openNowFlag ? "Open now" : "Any time"}
            color={openNowFlag ? "primary" : "default"}
            onClick={() => setOpenNowFlag((v) => !v)}
            variant={openNowFlag ? "filled" : "outlined"}
            sx={{ ml: { md: "auto" } }}
          />
          <Tooltip title="Refresh">
            <IconButton onClick={() => setRefreshKey((k) => k + 1)}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {/* List + Map */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems="flex-start"
        sx={{ width: "100%", overflow: "visible" }}
      >
        {/* LIST */}
        <Box sx={{ flex: 1, minWidth: 0, overflow: "visible" }}>
          {items === null ? (
            <Grid container spacing={2}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Grid key={i} item xs={12} sm={6}>
                  <Skeleton variant="rounded" height={220} />
                </Grid>
              ))}
            </Grid>
          ) : (visible || []).length === 0 ? (
            <Paper
              sx={{
                p: 4,
                borderRadius: 4,
                textAlign: "center",
                bgcolor: "background.default",
                border: (t) => `1px dashed ${t.palette.divider}`,
              }}
            >
              <Typography variant="h6" fontWeight={800} gutterBottom>
                No results
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Try a different island, lower the rating, or clear filters.
              </Typography>
              <Button
                variant="contained"
                onClick={() => {
                  setSearch("");
                  setPrice("ALL");
                  setRating("ALL");
                  setIsland("ALL");
                }}
              >
                Clear filters
              </Button>
            </Paper>
          ) : (
            <>
              <Grid container spacing={2}>
                {(visible || []).map((p) => (
                  <Grid key={p.id} item xs={12} sm={6}>
                    <PlaceCard
                      place={p}
                      onFocus={setFocus}
                      href={
                        typeof getItemHref === "function"
                          ? getItemHref(p)
                          : `/places/${p.id}`
                      }
                      placeholder={
                        kind === "stays"
                          ? "/images/places/placeholder-stays.jpg"
                          : kind === "shops"
                          ? "/images/places/placeholder-shop.jpg"
                          : "/images/places/placeholder-restaurant.jpg"
                      }
                      toHashUrl={(appPath) =>
                        `${window.location.origin}${window.location.pathname}#${
                          appPath.startsWith("/") ? appPath : `/${appPath}`
                        }`
                      }
                    />
                  </Grid>
                ))}
              </Grid>
              <Box display="flex" justifyContent="center" mt={2}>
                <Button disabled variant="outlined">
                  No more
                </Button>
              </Box>
            </>
          )}
        </Box>

        {/* MAP */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            position: { xs: "static", md: "sticky" },
            top: { md: 112 },
            alignSelf: "flex-start",
            overflow: "visible",
          }}
        >
          <Paper
            sx={{
              height: { xs: 360, md: "calc(100vh - 132px)" },
              p: 1.25,
              display: "flex",
              flexDirection: "column",
              borderRadius: 4,
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ px: 1, pb: 1 }}
            >
              <PlaceIcon />
              <Typography fontWeight={700}>Map</Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Button
                size="small"
                variant="outlined"
                onClick={() => setFocus(null)}
                startIcon={<RefreshIcon />}
              >
                Reset view
              </Button>
            </Stack>
            <Box
              sx={{
                position: "relative",
                flex: 1,
                minHeight: 300,
                width: "100%",
                "& > *": { width: "100%", height: "100%" },
                "& .gm-style": {
                  width: "100% !important",
                  height: "100% !important",
                },
              }}
            >
              <PlaceMap
                markers={(visible || [])
                  .map((p) => ({ ...getLatLng(p), id: p.id, name: p.name }))
                  .filter(Boolean)}
                focus={focus}
              />
            </Box>
          </Paper>
        </Box>
      </Stack>
    </Container>
  );
}

/* ----------------------------- card ----------------------------- */
function PlaceCard({ place, onFocus, href, placeholder, toHashUrl }) {
  const coords = getLatLng(place);
  const detailTo = href ? (href.startsWith("/") ? href : `/${href}`) : null;

  // Use public/images/places/* for local assets
  const imgUrl = React.useMemo(
    () => publicImageUrl(place.imageUrl),
    [place.imageUrl]
  );

  return (
    <Card
      elevation={6}
      sx={{
        height: "100%",
        borderRadius: 4,
        overflow: "hidden",
        bgcolor: "background.paper",
        transition: "transform .25s ease, box-shadow .25s ease",
        "&:hover": { transform: "translateY(-4px)", boxShadow: 12 },
      }}
    >
      <CardActionArea
        onClick={() => coords && onFocus?.(coords)}
        disableRipple
        sx={{ height: "100%", alignItems: "stretch" }}
      >
        <Box sx={{ position: "relative" }}>
          <ImageWithFallback
            name={place.name || place.slug}
            explicitUrl={imgUrl}
            basePath="/images/places"
            placeholder={placeholder}
            alt={place.name}
            sx={{
              display: "block",
              width: "100%",
              height: 180,
              objectFit: "cover",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0) 58%, rgba(0,0,0,.35) 92%)",
              pointerEvents: "none",
            }}
          />
          <Stack
            direction="row"
            spacing={1}
            sx={{ position: "absolute", top: 8, left: 8 }}
          >
            {place.island && (
              <Chip
                size="small"
                label={String(place.island).toUpperCase()}
                sx={{ bgcolor: "rgba(0,0,0,.55)", color: "#fff" }}
              />
            )}
            {Number(place.rating) > 0 && (
              <Chip
                size="small"
                icon={<StarIcon sx={{ color: "#FFD54F !important" }} />}
                label={Number(place.rating).toFixed(1)}
                sx={{ bgcolor: "rgba(0,0,0,.55)", color: "#fff" }}
              />
            )}
            {toPriceCode(place.priceLevel) && (
              <Chip
                size="small"
                icon={
                  <AttachMoneyIcon sx={{ color: "success.light !important" }} />
                }
                label={toPriceCode(place.priceLevel)}
                sx={{ bgcolor: "rgba(0,0,0,.55)", color: "#fff" }}
              />
            )}
          </Stack>
          <Stack
            direction="row"
            spacing={1}
            sx={{ position: "absolute", top: 8, right: 8 }}
          >
            <Tooltip title="Share">
              <IconButton
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,.92)",
                  "&:hover": { bgcolor: "white" },
                }}
                onClick={async (e) => {
                  e.stopPropagation();
                  const url = detailTo
                    ? `${window.location.origin}${window.location.pathname}#${detailTo}`
                    : window.location.origin +
                      window.location.pathname +
                      window.location.hash;
                  const text = `Check out ${place.name} in the USVI!`;
                  try {
                    if (navigator.share)
                      await navigator.share({ title: place.name, text, url });
                    else await navigator.clipboard.writeText(`${text} ${url}`);
                  } catch {}
                }}
                aria-label={`Share ${place.name}`}
              >
                <ShareIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        <CardContent sx={{ p: 2, width: "100%" }}>
          <Typography
            variant="h6"
            fontWeight={800}
            noWrap
            title={place.name}
            sx={{ mb: 0.5, pr: 5 }}
          >
            {detailTo ? (
              <RouterLink
                to={detailTo}
                onClick={(e) => e.stopPropagation()}
                style={{ color: "inherit", textDecoration: "none" }}
                aria-label={`Open details for ${place.name}`}
              >
                {place.name}
              </RouterLink>
            ) : (
              place.name
            )}
          </Typography>

          {place.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              title={place.description}
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                minHeight: 36,
              }}
            >
              {place.description}
            </Typography>
          )}

          {place.address && (
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              title={place.address}
              sx={{ display: "block", mt: 0.5 }}
            >
              {place.address}
            </Typography>
          )}

          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
            {coords && (
              <Button
                size="small"
                variant="text"
                startIcon={<CenterFocusStrongIcon fontSize="inherit" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onFocus?.(coords);
                }}
              >
                Focus map
              </Button>
            )}
            {detailTo && (
              <Button
                size="small"
                variant="outlined"
                component={RouterLink}
                to={detailTo}
                onClick={(e) => e.stopPropagation()}
                endIcon={<OpenInNewIcon fontSize="inherit" />}
              >
                Open
              </Button>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
