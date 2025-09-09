// src/pages/BeachesPage.jsx
import { useEffect, useState, useMemo } from "react";
import {
  Box,
  Container,
  Grid,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Paper,
  Button,
  Tooltip,
} from "@mui/material";

import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import SearchIcon from "@mui/icons-material/Search";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import PlaceIcon from "@mui/icons-material/Place";
import RefreshIcon from "@mui/icons-material/Refresh";
import ShareIcon from "@mui/icons-material/Share";
import DirectionsIcon from "@mui/icons-material/Directions";
import StarIcon from "@mui/icons-material/Star";
import ScubaDivingIcon from "@mui/icons-material/ScubaDiving";
import UmbrellaIcon from "@mui/icons-material/Umbrella";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import LunchDiningIcon from "@mui/icons-material/LunchDining";
import LocalParkingIcon from "@mui/icons-material/LocalParking";

import ImageWithFallback from "../components/ImageWithFallback";
import BeachMapWithControls from "../components/BeachMapWithControls";

import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Link as RouterLink } from "react-router-dom";

/* ----------------------------- helpers ---------------------------------- */
function getLatLng(b) {
  const lat = Number(b?.lat ?? b?.latitude ?? b?.coordinates?.lat);
  const lng = Number(b?.lng ?? b?.longitude ?? b?.coordinates?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}
function tagSet(b) {
  const raw = Array.isArray(b?.tags) ? b.tags : [];
  const extra = [b?.category, b?.amenities, b?.features, b?.type].flatMap((x) =>
    Array.isArray(x) ? x : x ? [x] : []
  );
  const all = [...raw, ...extra].map((s) =>
    String(s || "")
      .toLowerCase()
      .trim()
  );
  return new Set(all);
}
function has(T, ...names) {
  return names.some((n) => T.has(String(n).toLowerCase()));
}
function flags(b) {
  const T = tagSet(b);
  return {
    snorkel: b?.snorkel === true || has(T, "snorkel", "reef", "coral"),
    calm: b?.calm === true || has(T, "calm", "sheltered", "protected"),
    shade: b?.shade === true || has(T, "shade", "shady", "palms", "trees"),
    food: b?.food === true || has(T, "food", "restaurant", "bar", "cafe"),
    lifeguard: b?.lifeguard === true || has(T, "lifeguard", "guard"),
    restrooms:
      b?.restrooms === true || has(T, "restrooms", "bathroom", "toilets", "wc"),
    parking: b?.parking === true || has(T, "parking", "car park", "lot"),
    family: b?.family === true || has(T, "family", "kids", "children"),
  };
}

/* HashRouter-friendly URL (/#/beaches/:id) */
function toDetailHash(id) {
  return `${window.location.origin}${window.location.pathname}#/beaches/${id}`;
}

/* ------------------------------- page ----------------------------------- */
export default function BeachesPage() {
  const [beaches, setBeaches] = useState(null);
  const [island, setIsland] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedBeach, setSelectedBeach] = useState(null);
  const [favorites, setFavorites] = useState(new Set());

  // quick filters + sort
  const [quick, setQuick] = useState({
    snorkel: false,
    calm: false,
    shade: false,
    family: false,
    food: false,
  });
  const [sortBy, setSortBy] = useState("top");

  // Load beaches
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "beaches"));
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
        if (live) setBeaches(items);
      } catch (e) {
        console.error("Failed to fetch beaches", e);
        if (live) setBeaches([]);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  /* ----------------------------- filtering -------------------------------- */
  const baseFiltered = useMemo(() => {
    if (!beaches) return null;
    const term = search.trim().toLowerCase();
    return (
      beaches
        // normalize island values (handles "STX ", " stt", etc.)
        .filter(
          (b) =>
            island === "ALL" ||
            String(b.island || "")
              .trim()
              .toUpperCase() === island
        )
        .filter((b) =>
          term
            ? [b.name, b.description, b.address]
                .filter(Boolean)
                .some((s) => String(s).toLowerCase().includes(term))
            : true
        )
    );
  }, [beaches, island, search]);

  const visible = useMemo(() => {
    if (!baseFiltered) return null;
    let list = baseFiltered;

    const applyQuick = (key, pred) => {
      if (quick[key]) list = list.filter((b) => pred(flags(b)));
    };
    applyQuick("snorkel", (F) => F.snorkel);
    applyQuick("calm", (F) => F.calm);
    applyQuick("shade", (F) => F.shade);
    applyQuick("family", (F) => F.family);
    applyQuick("food", (F) => F.food);

    list = [...list];
    const score = (b) => (Number.isFinite(+b.rating) ? +b.rating : 0);
    const flagScore = (b, k) => (flags(b)[k] ? 1 : 0);

    list.sort((a, b) => {
      if (sortBy === "az")
        return String(a.name || "").localeCompare(String(b.name || ""));
      if (sortBy === "calm")
        return (
          flagScore(b, "calm") - flagScore(a, "calm") ||
          score(b) - score(a) ||
          String(a.name || "").localeCompare(String(b.name || ""))
        );
      if (sortBy === "shade")
        return (
          flagScore(b, "shade") - flagScore(a, "shade") ||
          score(b) - score(a) ||
          String(a.name || "").localeCompare(String(b.name || ""))
        );
      // top
      return (
        score(b) - score(a) ||
        String(a.name || "").localeCompare(String(b.name || ""))
      );
    });

    return list;
  }, [baseFiltered, quick, sortBy]);

  // Build map markers
  const markers = useMemo(
    () =>
      (visible || [])
        .map((b) => ({ b, coords: getLatLng(b) }))
        .filter((x) => !!x.coords)
        .map(({ b, coords }) => ({ id: b.id, name: b.name, ...coords })),
    [visible]
  );

  const focus = selectedBeach ? getLatLng(selectedBeach) : null;

  /* ------------------------------ handlers -------------------------------- */
  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleQuick = (k) => setQuick((q) => ({ ...q, [k]: !q[k] }));

  /* --------------------------------- UI ----------------------------------- */
  const summaryCount = visible === null ? beaches?.length ?? 0 : visible.length;

  return (
    <Container maxWidth="lg" sx={{ py: 4, overflow: "visible" }}>
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
            "linear-gradient(135deg, rgba(14,165,233,.12) 0%, rgba(59,130,246,.10) 60%, rgba(16,185,129,.08) 100%)",
          border: (t) => `1px solid ${t.palette.divider}`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <BeachAccessIcon />
          <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: 0.2 }}>
            Beaches
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Find the best spots to swim, snorkel, and relax. Tap a card to open
          details — or use Focus map.
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
            "linear-gradient(180deg, rgba(255,255,255,.88), rgba(255,255,255,.80))",
          border: "1px solid rgba(0,0,0,.06)",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems="center"
        >
          <Select
            size="small"
            value={island}
            onChange={(e) => setIsland(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="ALL">All islands</MenuItem>
            <MenuItem value="STT">St. Thomas</MenuItem>
            <MenuItem value="STJ">St. John</MenuItem>
            <MenuItem value="STX">St. Croix</MenuItem>
          </Select>

          <TextField
            size="small"
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 260, flex: 1 }}
          />

          <TextField
            size="small"
            select
            label="Sort by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="top">Top rated</MenuItem>
            <MenuItem value="calm">Calmest water</MenuItem>
            <MenuItem value="shade">Most shade</MenuItem>
            <MenuItem value="az">A → Z</MenuItem>
          </TextField>
        </Stack>

        {/* quick filters */}
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
          <FilterChip
            label="Snorkel"
            icon={<ScubaDivingIcon fontSize="small" />}
            active={quick.snorkel}
            onClick={() => toggleQuick("snorkel")}
          />
          <FilterChip
            label="Calm water"
            icon={<PlaceIcon fontSize="small" />}
            active={quick.calm}
            onClick={() => toggleQuick("calm")}
          />
          <FilterChip
            label="Shade"
            icon={<UmbrellaIcon fontSize="small" />}
            active={quick.shade}
            onClick={() => toggleQuick("shade")}
          />
          <FilterChip
            label="Family friendly"
            icon={<FamilyRestroomIcon fontSize="small" />}
            active={quick.family}
            onClick={() => toggleQuick("family")}
          />
          <FilterChip
            label="Food nearby"
            icon={<LunchDiningIcon fontSize="small" />}
            active={quick.food}
            onClick={() => toggleQuick("food")}
          />
          <Box sx={{ ml: "auto", display: { xs: "none", md: "block" } }}>
            <ResultsSummary count={summaryCount} island={island} />
          </Box>
        </Stack>
      </Paper>

      {/* Two-column layout with sticky map (md+) */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems="flex-start"
        sx={{ width: "100%", overflow: "visible" }}
      >
        {/* LIST */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {visible === null ? (
            <Grid container spacing={2}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Grid item xs={12} sm={6} key={i}>
                  <Skeleton variant="rounded" height={220} />
                </Grid>
              ))}
            </Grid>
          ) : visible.length === 0 ? (
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
                No beaches found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Try a different island, adjust quick filters, or clear search.
              </Typography>
              <Button
                variant="contained"
                onClick={() => {
                  setSearch("");
                  setIsland("ALL");
                  setQuick({
                    snorkel: false,
                    calm: false,
                    shade: false,
                    family: false,
                    food: false,
                  });
                  setSortBy("top");
                }}
              >
                Clear filters
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {visible.map((b) => (
                <Grid item xs={12} sm={6} key={b.id}>
                  <BeachCard
                    beach={b}
                    favorite={favorites.has(b.id)}
                    onFavorite={() => toggleFavorite(b.id)}
                    onFocus={() => setSelectedBeach(b)}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        {/* MAP (sticky on md+) */}
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
                onClick={() => setSelectedBeach(null)}
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
              <BeachMapWithControls
                onSelect={(b) => setSelectedBeach(b)}
                focus={focus}
                markers={markers}
                island={island}
                query={search}
              />
            </Box>
          </Paper>
        </Box>
      </Stack>
    </Container>
  );
}

/* ----------------------------- subcomponents ----------------------------- */

function ResultsSummary({ count, island }) {
  return (
    <Typography variant="caption" color="text.secondary">
      {count} {count === 1 ? "beach" : "beaches"}
      {island !== "ALL" ? ` • ${island}` : ""}
    </Typography>
  );
}

function FilterChip({ label, icon, active, onClick }) {
  return (
    <Chip
      size="small"
      icon={icon}
      label={label}
      onClick={onClick}
      color={active ? "primary" : "default"}
      variant={active ? "filled" : "outlined"}
      sx={{ mr: 0.5 }}
    />
  );
}

function AmenityChips({ b }) {
  const F = flags(b);
  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
      {b.island && <Chip size="small" label={String(b.island).toUpperCase()} />}
      {Number(b.rating) > 0 && (
        <Chip
          size="small"
          icon={<StarIcon />}
          label={Number(b.rating).toFixed(1)}
        />
      )}
      {F.snorkel && (
        <Chip size="small" icon={<ScubaDivingIcon />} label="Snorkel" />
      )}
      {F.calm && <Chip size="small" icon={<PlaceIcon />} label="Calm" />}
      {F.shade && <Chip size="small" icon={<UmbrellaIcon />} label="Shade" />}
      {F.family && (
        <Chip size="small" icon={<FamilyRestroomIcon />} label="Family" />
      )}
      {F.food && <Chip size="small" icon={<LunchDiningIcon />} label="Food" />}
      {F.parking && (
        <Chip size="small" icon={<LocalParkingIcon />} label="Parking" />
      )}
    </Stack>
  );
}

/* ----------------------------- BeachCard --------------------------------- */
function BeachCard({ beach: b, favorite, onFavorite, onFocus }) {
  const coords = getLatLng(b);
  const detailHref = `/beaches/${b.id}`;
  const shareUrl = toDetailHash(b.id);

  const share = async (e) => {
    e?.stopPropagation?.();
    const text = `Check out ${b.name} beach in the USVI!`;
    try {
      if (navigator.share)
        await navigator.share({ title: b.name, text, url: shareUrl });
      else await navigator.clipboard.writeText(`${text} ${shareUrl}`);
    } catch {}
  };

  const directions = (e) => {
    e?.stopPropagation?.();
    if (!coords) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=driving`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

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
      {/* Entire card navigates to details (link); secondary actions stop propagation */}
      <CardActionArea
        component={RouterLink}
        to={detailHref}
        sx={{ display: "block" }}
      >
        {/* Image + overlay + actions */}
        <Box sx={{ position: "relative" }}>
          <ImageWithFallback
            name={b.name || b.slug}
            explicitUrl={b.imageUrl}
            basePath="/images/beaches"
            placeholder="/images/placeholder-restaurant.jpg"
            alt={b.name}
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
            {b.island && (
              <Chip
                size="small"
                label={String(b.island).toUpperCase()}
                sx={{ bgcolor: "rgba(0,0,0,.55)", color: "#fff" }}
              />
            )}
            {Number(b.rating) > 0 && (
              <Chip
                size="small"
                icon={<StarIcon sx={{ color: "#FFD54F !important" }} />}
                label={Number(b.rating).toFixed(1)}
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
                onClick={(e) => {
                  e.stopPropagation();
                  share(e);
                }}
                sx={{
                  bgcolor: "rgba(255,255,255,.92)",
                  "&:hover": { bgcolor: "white" },
                }}
              >
                <ShareIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Directions">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  directions(e);
                }}
                sx={{
                  bgcolor: "rgba(255,255,255,.92)",
                  "&:hover": { bgcolor: "white" },
                }}
              >
                <DirectionsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* Content */}
        <CardContent sx={{ p: 2 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography
              variant="h6"
              fontWeight={800}
              noWrap
              title={b.name}
              sx={{ mb: 0.25 }}
            >
              {b.name}
            </Typography>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                onFavorite?.();
              }}
              size="small"
              aria-label={favorite ? "Remove favorite" : "Add favorite"}
            >
              {favorite ? (
                <FavoriteIcon color="error" />
              ) : (
                <FavoriteBorderIcon />
              )}
            </IconButton>
          </Stack>

          {b.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              title={b.description}
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                minHeight: 36,
              }}
            >
              {b.description}
            </Typography>
          )}

          <Box sx={{ mt: 1 }}>
            <AmenityChips b={b} />
          </Box>

          {/* explicit secondary actions */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
            <Button
              size="small"
              variant="outlined"
              component={RouterLink}
              to={detailHref}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Open ${b.name} details`}
            >
              Open
            </Button>
            {coords && (
              <Button
                size="small"
                variant="text"
                onClick={(e) => {
                  e.stopPropagation();
                  onFocus?.(b);
                }}
              >
                Focus map
              </Button>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
