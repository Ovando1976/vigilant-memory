import React from "react";
import {
  Box, Typography, Card, CardMedia, CardContent,
  Button, Chip, Stack, TextField, InputAdornment,
  ToggleButton, ToggleButtonGroup, Paper, IconButton,
  Menu, MenuItem, Tooltip, Divider, Switch, FormControlLabel
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ExploreOutlinedIcon from "@mui/icons-material/ExploreOutlined";
import AltRouteRoundedIcon from "@mui/icons-material/AltRouteRounded";
import TuneIcon from "@mui/icons-material/Tune";
import SortIcon from "@mui/icons-material/Sort";
import { Link, useSearchParams } from "react-router-dom";
import useDebouncedValue from "../hooks/useDebouncedValue";
import EmptyState from "../components/EmptyState";

// NOTE: import WITHOUT an extension
import siteDataRaw from "../data/siteData";

// -------- helpers --------
const PLACEHOLDER_IMG = "/images/placeholder-beach.jpg";
const ISLANDS = [
  { id: "ALL", label: "ALL" },
  { id: "STT", label: "ST. THOMAS" },
  { id: "STJ", label: "ST. JOHN" },
  { id: "STX", label: "ST. CROIX" },
];

const toParams = (obj) => new URLSearchParams(obj).toString();

function normalizeEntries(raw) {
  const d = raw && typeof raw === "object" ? raw : {};
  return Object.entries(d).map(([key, site]) => ({ key, ...site }));
}

function getEraBuckets(entries) {
  const counts = new Map();
  for (const e of entries) {
    if (!e.era) continue;
    const k = String(e.era).trim();
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  // only show eras that appear >=2 times (prevents noise)
  return [...counts.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => a[0].localeCompare(b[0]));
}

function hasPhoto(site) {
  return Boolean(
    (site.thumbnail && site.thumbnail !== PLACEHOLDER_IMG) ||
      site.hero ||
      (Array.isArray(site.ai_recreations) && site.ai_recreations[0]) ||
      (Array.isArray(site.photos) && site.photos[0])
  );
}

// ---------------------------------------------------------------------
export default function ExplorePage() {
  const [params, setParams] = useSearchParams();

  // URL-backed state
  const [q, setQ] = React.useState(params.get("q") || "");
  const [island, setIsland] = React.useState(params.get("island") || "ALL");
  const [sort, setSort] = React.useState(params.get("sort") || "name_asc");
  const [era, setEra] = React.useState(params.get("era") || "");
  const [onlyPhotos, setOnlyPhotos] = React.useState(params.get("photos") === "1");

  // Search focus shortcut `/`
  const searchRef = React.useRef(null);
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Keep URL in sync (debounced for q)
  const debouncedQ = useDebouncedValue(q, 250);
  React.useEffect(() => {
    const next = new URLSearchParams(params);
    debouncedQ ? next.set("q", debouncedQ) : next.delete("q");
    island && island !== "ALL" ? next.set("island", island) : next.delete("island");
    sort && sort !== "name_asc" ? next.set("sort", sort) : next.delete("sort");
    era ? next.set("era", era) : next.delete("era");
    onlyPhotos ? next.set("photos", "1") : next.delete("photos");
    setParams(next, { replace: true });
  }, [debouncedQ, island, sort, era, onlyPhotos]); // eslint-disable-line

  // Data
  const entries = React.useMemo(() => {
    const list = normalizeEntries(siteDataRaw);
    // eras for filter chips
    return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, []);
  const eraBuckets = React.useMemo(() => getEraBuckets(entries), [entries]);

  // Filtering
  const filtered = React.useMemo(() => {
    const term = debouncedQ.trim().toLowerCase();
    let list = entries;

    if (island !== "ALL") {
      list = list.filter((e) => String(e.island || "").toUpperCase() === island);
    }
    if (era) {
      list = list.filter((e) => String(e.era || "").trim() === era);
    }
    if (onlyPhotos) {
      list = list.filter((e) => hasPhoto(e));
    }
    if (term) {
      list = list.filter((e) => {
        const hay = `${e.name || ""} ${e.era || ""} ${e.description || ""}`.toLowerCase();
        return hay.includes(term);
      });
    }

    // sort
    switch (sort) {
      case "name_desc":
        list = [...list].sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        break;
      case "era_asc":
        list = [...list].sort((a, b) => String(a.era || "").localeCompare(String(b.era || "")));
        break;
      case "era_desc":
        list = [...list].sort((a, b) => String(b.era || "").localeCompare(String(a.era || "")));
        break;
      default:
        // name_asc (already sorted earlier)
        list = [...list];
    }

    return list;
  }, [entries, debouncedQ, island, era, onlyPhotos, sort]);

  // Sort menu
  const [anchorEl, setAnchorEl] = React.useState(null);
  const openSort = Boolean(anchorEl);
  const handleSortClose = (val) => {
    setAnchorEl(null);
    if (val) setSort(val);
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Hero */}
      <Box
        sx={{
          py: 4,
          color: "white",
          background: "linear-gradient(135deg, #0ea5e9 0%, #22d3ee 40%, #60a5fa 100%)",
          boxShadow: "0 8px 24px rgba(0,0,0,.15)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ px: { xs: 2, md: 6 } }}>
          <Stack spacing={1.2}>
            <Stack direction="row" spacing={1.2} alignItems="center">
              <ExploreOutlinedIcon />
              <Typography variant="h4" fontWeight={900} letterSpacing={0.4}>
                Explore Historic Sites
              </Typography>
            </Stack>
            <Typography sx={{ opacity: 0.9, maxWidth: 900 }}>
              Browse landmarks across the USVI. Tap a card to open the route planner,
              filter by era, or search by name and description. Press <kbd>/</kbd> to search.
            </Typography>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} sx={{ pt: 1 }} alignItems="center">
              <TextField
                inputRef={searchRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, era, or description…"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "inherit" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  backgroundColor: "rgba(255,255,255,.14)",
                  borderRadius: 2,
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,.35)" },
                  width: { xs: "100%", md: 460 },
                }}
              />

              <ToggleButtonGroup
                exclusive
                value={island}
                onChange={(_, v) => v && setIsland(v)}
                size="small"
                sx={{
                  backgroundColor: "rgba(255,255,255,.10)",
                  borderRadius: 999,
                  "& .MuiToggleButton-root": { color: "white", border: 0, px: 2 },
                }}
              >
                {ISLANDS.map((i) => (
                  <ToggleButton key={i.id} value={i.id}>{i.label}</ToggleButton>
                ))}
              </ToggleButtonGroup>

              <Box sx={{ flex: 1 }} />

              {/* Sort + Filters */}
              <Tooltip title="Sort">
                <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
                  <SortIcon />
                </IconButton>
              </Tooltip>
              <Menu anchorEl={anchorEl} open={openSort} onClose={() => handleSortClose(null)}>
                <MenuItem selected={sort === "name_asc"} onClick={() => handleSortClose("name_asc")}>
                  Name (A → Z)
                </MenuItem>
                <MenuItem selected={sort === "name_desc"} onClick={() => handleSortClose("name_desc")}>
                  Name (Z → A)
                </MenuItem>
                <MenuItem selected={sort === "era_asc"} onClick={() => handleSortClose("era_asc")}>
                  Era (A → Z)
                </MenuItem>
                <MenuItem selected={sort === "era_desc"} onClick={() => handleSortClose("era_desc")}>
                  Era (Z → A)
                </MenuItem>
              </Menu>

              <Tooltip title="More filters">
                <span>
                  <TuneIcon />
                </span>
              </Tooltip>

              <Button
                component={Link}
                to="/routes"
                startIcon={<AltRouteRoundedIcon />}
                variant="contained"
                sx={{
                  fontWeight: 800,
                  borderRadius: 2,
                  background: "linear-gradient(90deg, #22c55e 0%, #16a34a 50%, #22c55e 100%)",
                  boxShadow: "0 10px 25px rgba(34,197,94,.35)",
                }}
              >
                Explore on Map
              </Button>
            </Stack>

            {/* Era chips and toggles */}
            <Stack direction="row" spacing={1} sx={{ pt: 1, flexWrap: "wrap" }} alignItems="center">
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={onlyPhotos}
                    onChange={(e) => setOnlyPhotos(e.target.checked)}
                  />
                }
                label="Photos only"
              />
              <Divider flexItem sx={{ mx: 1, opacity: 0.25 }} />
              {eraBuckets.map(([label, count]) => (
                <Chip
                  key={label}
                  label={`${label} (${count})`}
                  onClick={() => setEra(era === label ? "" : label)}
                  color={era === label ? "primary" : "default"}
                  size="small"
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>
          </Stack>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ px: { xs: 2, md: 6 }, py: 3, flex: 1 }}>
        <Paper
          variant="outlined"
          sx={{ mb: 2, p: 1.2, borderRadius: 2, display: "inline-flex", alignItems: "center", gap: 1 }}
        >
          <Chip size="small" label={`Total: ${entries.length}`} />
          <Chip size="small" color="primary" label={`Showing: ${filtered.length}`} />
          {island !== "ALL" && <Chip size="small" label={`Island: ${island}`} sx={{ textTransform: "uppercase" }} />}
          {era && <Chip size="small" label={`Era: ${era}`} />}
          {onlyPhotos && <Chip size="small" label="Photos only" />}
        </Paper>

        {filtered.length === 0 ? (
          <EmptyState
            title="No sites match your filters"
            subtitle="Try clearing the era filter or turning off 'Photos only'."
            to="/home"
            cta="Back to Home"
          />
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
              gap: 3,
            }}
          >
            {filtered.map((site) => {
              const img =
                site.thumbnail ||
                site.hero ||
                (Array.isArray(site.ai_recreations) && site.ai_recreations[0]) ||
                (Array.isArray(site.photos) && site.photos[0]) ||
                PLACEHOLDER_IMG;

              // Pre-build map deep link
              const mapQuery = toParams({
                focus: site.name,
                lat: site.mapFocus?.center?.[0] ?? "",
                lng: site.mapFocus?.center?.[1] ?? "",
                z: site.mapFocus?.zoom ?? 16,
              });

              return (
                <Card
                  key={site.key}
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: 2.5,
                    overflow: "hidden",
                    boxShadow: "0 10px 24px rgba(2,12,27,.06)",
                    transition: "transform .2s ease, box-shadow .2s ease",
                    "&:hover": { transform: "translateY(-3px)", boxShadow: "0 16px 38px rgba(2,12,27,.12)" },
                  }}
                >
                  <CardMedia
                    component="img"
                    image={img}
                    alt={site.name}
                    loading="lazy"
                    decoding="async"
                    sx={{
                      aspectRatio: "16 / 9",
                      width: "100%",
                      objectFit: "cover",
                      background:
                        "linear-gradient(90deg, rgba(255,255,255,.08), rgba(255,255,255,.18), rgba(255,255,255,.08))",
                      backgroundSize: "200% 100%",
                      animation: "mui-shimmer 1.2s ease-in-out infinite",
                      "@keyframes mui-shimmer": {
                        from: { backgroundPosition: "200% 0" },
                        to: { backgroundPosition: "-200% 0" },
                      },
                    }}
                    onError={(e) => {
                      const t = e.currentTarget;
                      if (t && t.src !== PLACEHOLDER_IMG) t.src = PLACEHOLDER_IMG;
                    }}
                    onLoad={(e) => {
                      // remove shimmer on load
                      e.currentTarget.style.animation = "none";
                      e.currentTarget.style.background = "transparent";
                    }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Stack spacing={1}>
                      <Typography variant="h6" component="h2" fontWeight={800}>
                        {site.name}
                      </Typography>

                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {site.era && <Chip size="small" label={site.era} variant="outlined" />}
                        {site.island && <Chip size="small" label={String(site.island).toUpperCase()} />}
                      </Stack>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 0.5,
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {site.description}
                      </Typography>

                      <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          component={Link}
                          to={`/routes?${mapQuery}`}
                        >
                          View on Map →
                        </Button>
                        <Button
                          size="small"
                          component={Link}
                          to={`/sites#${site.key}`}
                        >
                          Details
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}