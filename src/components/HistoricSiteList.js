import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Stack,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
  Chip,
  Divider,
  Typography,
  Button,
  Grid,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ShareIcon from "@mui/icons-material/Share";
import MapIcon from "@mui/icons-material/Map";
import SortByAlphaIcon from "@mui/icons-material/SortByAlpha";
import DownloadIcon from "@mui/icons-material/Download";

/* ------------------------- Defaults (safe) ------------------------- */
const defaultSites = [
  { id: 1, name: "Fort Christian", location: "Charlotte Amalie, St. Thomas", island: "STT" },
  { id: 2, name: "Estate Whim Plantation", location: "St. Croix", island: "STX" },
  { id: 3, name: "Cruz Bay Historic District", location: "Cruz Bay, St. John", island: "STJ" },
];

/* ---------------------------- Helpers ----------------------------- */
function useDebouncedValue(value, delay = 200) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const h = setTimeout(() => setV(value), delay);
    return () => clearTimeout(h);
  }, [value, delay]);
  return v;
}

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

// best-effort island inference if not provided on a site
function inferIsland(site) {
  const t = `${site.name} ${site.location}`.toLowerCase();
  if (/st\.?\s*thomas|charlotte amalie|red hook|havensight|magens|bolongo/.test(t)) return "STT";
  if (/st\.?\s*john|cruz bay|trunk|maho/.test(t)) return "STJ";
  if (/st\.?\s*croix|christiansted|frederiksted|whim/.test(t)) return "STX";
  return "UNK";
}

function scoreMatch(text, q) {
  // lightweight fuzzy scoring: substring >> token prefix >> token anywhere
  if (!q) return 0;
  const t = text.toLowerCase();
  const query = q.toLowerCase().trim();
  if (t.includes(query)) return 100 - t.indexOf(query);
  const tokens = query.split(/\s+/).filter(Boolean);
  let s = 0;
  for (const tok of tokens) {
    if (t.startsWith(tok)) s += 40;
    else if (t.includes(` ${tok}`)) s += 25;
    else if (t.includes(tok)) s += 10;
  }
  return s;
}

function highlight(text, query) {
  if (!query) return text;
  const q = query.trim();
  if (!q) return text;
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${esc(q)})`, "ig");
  const parts = text.split(re);
  return parts.map((p, i) =>
    re.test(p) ? (
      <mark key={i} style={{ background: "rgba(34,197,94,.25)", padding: "0 2px", borderRadius: 3 }}>
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

function mapsUrl(site) {
  if (site?.coords && Number.isFinite(site.coords.lat) && Number.isFinite(site.coords.lng)) {
    const { lat, lng } = site.coords;
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  const q = encodeURIComponent(`${site.name}, ${site.location}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/* --------------------------- Component ---------------------------- */
export default function HistoricSiteList({
  sites = defaultSites,
  title = "Historic Sites",
  onSelect, // optional: called with (site) when user clicks a chip/action
}) {
  const [query, setQuery] = useState("");
  const [island, setIsland] = useState(null); // STT | STJ | STX | null
  const [sort, setSort] = useState("az"); // 'az' | 'za'
  const [favs, setFavs] = useState(() => storage.get("favSites", []));

  const qDeb = useDebouncedValue(query, 180);

  const toggleFav = (id) => {
    setFavs((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      storage.set("favSites", next);
      return next;
    });
  };

  const normalized = useMemo(
    () =>
      sites.map((s) => ({
        ...s,
        island: s.island || inferIsland(s),
      })),
    [sites]
  );

  const filtered = useMemo(() => {
    const scored = normalized
      .filter((s) => !island || s.island === island)
      .map((s) => {
        const big = `${s.name} ${s.location}`;
        const score = Math.max(scoreMatch(s.name, qDeb), scoreMatch(big, qDeb));
        return { site: s, score };
      })
      .filter((x) => (qDeb ? x.score > 0 : true));

    scored.sort((a, b) => {
      if (qDeb && b.score !== a.score) return b.score - a.score;
      return sort === "az"
        ? a.site.name.localeCompare(b.site.name)
        : b.site.name.localeCompare(a.site.name);
    });

    return scored.map((x) => x.site);
  }, [normalized, island, qDeb, sort]);

  const exportCsv = () => {
    const rows = [["id", "name", "location", "island"]];
    filtered.forEach((s) => rows.push([s.id, s.name, s.location, s.island]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "historic-sites.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareSite = async (site) => {
    const url = mapsUrl(site);
    const text = `${site.name} — ${site.location}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: site.name, text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
      }
    } catch {}
  };

  return (
    <Box sx={{ py: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          border: "1px solid #e6eef7",
          background:
            "linear-gradient(180deg, rgba(247,251,255,.85) 0%, rgba(255,255,255,.85) 100%)",
          backdropFilter: "saturate(120%) blur(4px)",
        }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h5" fontWeight={900}>
              {title}
            </Typography>
            <Stack direction="row" spacing={1}>
              <ToggleButtonGroup
                size="small"
                value={island}
                exclusive
                onChange={(_, v) => setIsland(v)}
              >
                <ToggleButton value={null}>All</ToggleButton>
                <ToggleButton value="STT">STT</ToggleButton>
                <ToggleButton value="STJ">STJ</ToggleButton>
                <ToggleButton value="STX">STX</ToggleButton>
              </ToggleButtonGroup>
              <ToggleButtonGroup
                size="small"
                value={sort}
                exclusive
                onChange={(_, v) => v && setSort(v)}
              >
                <ToggleButton value="az" aria-label="Sort A to Z">
                  <SortByAlphaIcon fontSize="small" />
                </ToggleButton>
                <ToggleButton value="za" aria-label="Sort Z to A">
                  ZA
                </ToggleButton>
              </ToggleButtonGroup>
              <Tooltip title="Export CSV">
                <IconButton onClick={exportCsv} size="small">
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          <TextField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or location…"
            fullWidth
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <Divider />

          {/* Count + active filters */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Chip size="small" label={`${filtered.length} result${filtered.length === 1 ? "" : "s"}`} />
            {island && (
              <Chip
                size="small"
                label={`Island: ${island}`}
                onDelete={() => setIsland(null)}
                variant="outlined"
              />
            )}
            {!!query && (
              <Chip
                size="small"
                label={`Query: "${query}"`}
                onDelete={() => setQuery("")}
                variant="outlined"
              />
            )}
          </Stack>

          {/* Results */}
          {filtered.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
              <Typography>No sites match your search.</Typography>
            </Box>
          ) : (
            <Grid container spacing={1.25}>
              {filtered.map((site) => (
                <Grid item xs={12} md={6} key={site.id}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.25,
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight={800}
                        noWrap
                        title={site.name}
                      >
                        {highlight(site.name, qDeb)}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        noWrap
                        title={site.location}
                      >
                        {highlight(site.location, qDeb)}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <Chip size="small" label={site.island || inferIsland(site)} />
                        {site.tags?.slice(0, 3)?.map((t) => (
                          <Chip key={t} size="small" label={t} variant="outlined" />
                        ))}
                      </Stack>
                    </Box>

                    <Stack direction="row" spacing={0.5} sx={{ ml: "auto" }}>
                      <Tooltip title="Open in Maps">
                        <IconButton
                          size="small"
                          onClick={() => window.open(mapsUrl(site), "_blank", "noopener")}
                          aria-label={`Open ${site.name} in Maps`}
                        >
                          <MapIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Share">
                        <IconButton
                          size="small"
                          onClick={() => shareSite(site)}
                          aria-label={`Share ${site.name}`}
                        >
                          <ShareIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title={favs.includes(site.id) ? "Remove favorite" : "Add favorite"}>
                        <IconButton
                          size="small"
                          onClick={() => toggleFav(site.id)}
                          aria-label={
                            favs.includes(site.id) ? "Unfavorite site" : "Favorite site"
                          }
                        >
                          {favs.includes(site.id) ? (
                            <FavoriteIcon color="error" fontSize="small" />
                          ) : (
                            <FavoriteBorderIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>

                      {onSelect && (
                        <Tooltip title="Select">
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => onSelect(site)}
                            sx={{ ml: 0.5 }}
                          >
                            Select
                          </Button>
                        </Tooltip>
                      )}
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}