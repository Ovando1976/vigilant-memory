import React, { useEffect, useMemo, useRef, useState } from "react";
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
  CardMedia,
  CardContent,
  Chip,
  Divider,
  Skeleton,
  Button,
  IconButton,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EventIcon from "@mui/icons-material/Event";
import PlaceIcon from "@mui/icons-material/Place";
import RefreshIcon from "@mui/icons-material/Refresh";
import ShareIcon from "@mui/icons-material/Share";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
} from "firebase/firestore";
import { db } from "../lib/firebase";

const ISLANDS = [
  { code: "ALL", label: "All islands" },
  { code: "STT", label: "St. Thomas" },
  { code: "STJ", label: "St. John" },
  { code: "STX", label: "St. Croix" },
];

const WHEN = [
  { code: "upcoming", label: "Upcoming" },
  { code: "today", label: "Today" },
  { code: "week", label: "This week" },
  { code: "past", label: "Past" },
  { code: "all", label: "All" }, // NEW
];

const PAGE_SIZE = 18;

function toDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  try {
    return new Date(ts);
  } catch {
    return null;
  }
}

function formatDateRange(start, end) {
  if (!start) return "—";
  const s = start.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  if (!end) return s;
  const sameDay = start.toDateString() === end.toDateString();
  const e = end.toLocaleString(undefined, {
    dateStyle: sameDay ? undefined : "medium",
    timeStyle: "short",
  });
  return sameDay
    ? `${s} – ${end.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })}`
    : `${s} – ${e}`;
}

function useEvents() {
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paging, setPaging] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const lastDoc = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadFirst = async () => {
    setLoading(true);
    try {
      const col = collection(db, "events");
      const qy = query(col, orderBy("startDate", "asc"), limit(PAGE_SIZE));
      const snap = await getDocs(qy);
      const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
      setItems(docs);
      lastDoc.current = snap.docs[snap.docs.length - 1] || null;
      setHasMore(Boolean(lastDoc.current));
    } catch (e) {
      console.error("events load failed", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!lastDoc.current) return;
    setPaging(true);
    try {
      const col = collection(db, "events");
      const qy = query(
        col,
        orderBy("startDate", "asc"),
        startAfter(lastDoc.current),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(qy);
      const more = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
      setItems((prev) => [...prev, ...more]);
      lastDoc.current = snap.docs[snap.docs.length - 1] || null;
      setHasMore(Boolean(lastDoc.current));
    } catch (e) {
      console.error("events more failed", e);
    } finally {
      setPaging(false);
    }
  };

  useEffect(() => {
    loadFirst(); /* eslint-disable-next-line */
  }, [refreshKey]);

  return {
    items,
    loading,
    hasMore,
    paging,
    loadMore,
    refresh: () => setRefreshKey((k) => k + 1),
  };
}

function EventCard({ ev }) {
  const start = toDate(ev.startDate);
  const end = toDate(ev.endDate);
  const when = formatDateRange(start, end);
  const img =
    ev.imageUrl ||
    `/images/${(ev.slug || ev.title || "event")
      .toString()
      .toLowerCase()
      .replace(/\s+/g, "-")}.jpg`;

  return (
    <Card
      sx={{
        height: "100%",
        borderRadius: 3,
        overflow: "hidden",
        transition: "all .25s",
        "&:hover": { transform: "translateY(-3px)", boxShadow: 6 },
      }}
    >
      <CardActionArea>
        <CardMedia
          component="img"
          height="150"
          src={img}
          alt={ev.title}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = "/images/placeholder-beach.jpg";
          }}
        />
        <CardContent>
          <Stack spacing={0.5}>
            <Typography variant="h6" fontWeight={800} noWrap title={ev.title}>
              {ev.title || "Untitled event"}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ flexWrap: "wrap" }}
            >
              <Chip size="small" label={(ev.island || "").toUpperCase()} />
              {Array.isArray(ev.tags) &&
                ev.tags
                  .slice(0, 3)
                  .map((t) => (
                    <Chip key={t} size="small" label={t} variant="outlined" />
                  ))}
            </Stack>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ color: "text.secondary" }}
            >
              <CalendarMonthIcon fontSize="small" />
              <Typography variant="body2">{when}</Typography>
            </Stack>
            {!!ev.location && (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ color: "text.secondary" }}
              >
                <PlaceIcon fontSize="small" />
                <Typography variant="body2" noWrap title={ev.location}>
                  {ev.location}
                </Typography>
              </Stack>
            )}
            {!!ev.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                noWrap
                title={ev.description}
              >
                {ev.description}
              </Typography>
            )}
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
              <Tooltip title="Share">
                <IconButton
                  size="small"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const url = window.location.origin + "/events";
                    const text = `${ev.title} — ${when}`;
                    if (navigator.share)
                      await navigator
                        .share({ title: ev.title, text, url })
                        .catch(() => {});
                    else
                      await navigator.clipboard
                        .writeText(`${text} ${url}`)
                        .catch(() => {});
                  }}
                >
                  <ShareIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default function EventsPage() {
  const [island, setIsland] = useState("ALL");
  const [when, setWhen] = useState("upcoming");
  const [search, setSearch] = useState("");

  const { items, loading, hasMore, paging, loadMore, refresh } = useEvents();

  // helper to run a specific time-mode filter
  const computeFiltered = useMemo(
    () => (list, mode) => {
      if (!list) return null;
      const now = new Date();
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const term = search.trim().toLowerCase();

      const out = list
        .filter(
          (ev) => island === "ALL" || (ev.island || "").toUpperCase() === island
        )
        .filter((ev) => {
          const s = toDate(ev.startDate);
          const e = toDate(ev.endDate) || s;
          if (!s) return false;
          if (mode === "today") return s.toDateString() === now.toDateString();
          if (mode === "week") return s >= now && s <= weekEnd;
          if (mode === "past") return e < now;
          if (mode === "all") return true;
          return e >= now; // upcoming
        })
        .filter((ev) =>
          term
            ? [ev.title, ev.description, ev.location, (ev.tags || []).join(" ")]
                .filter(Boolean)
                .some((f) => String(f).toLowerCase().includes(term))
            : true
        );

      return out;
    },
    [island, search]
  ); // ✅ correctly close here

  // primary view based on selected "when"
  const filteredPrimary = useMemo(
    () => computeFiltered(items || [], when),
    [items, when, computeFiltered]
  );

  // fallback to past when asking for a future window and nothing matches
  const filtered = useMemo(() => {
    if (!filteredPrimary) return null;
    if (filteredPrimary.length > 0 || ["past", "all"].includes(when))
      return filteredPrimary;
    return computeFiltered(items || [], "past");
  }, [filteredPrimary, items, when, computeFiltered]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={900} gutterBottom>
        Events
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
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
            label="When"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            size="small"
            sx={{ minWidth: 180 }}
          >
            {WHEN.map((w) => (
              <MenuItem key={w.code} value={w.code}>
                {w.label}
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

          <Stack direction="row" spacing={1} sx={{ ml: { md: "auto" } }}>
            <Tooltip title="Refresh">
              <IconButton onClick={refresh}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      {/* List */}
      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 9 }).map((_, i) => (
            <Grid key={i} item xs={12} sm={6} md={4}>
              <Skeleton variant="rounded" height={230} />
            </Grid>
          ))}
        </Grid>
      ) : filtered?.length ? (
        <>
          <Grid container spacing={2}>
            {filtered.map((ev) => (
              <Grid key={ev.id} item xs={12} sm={6} md={4}>
                <EventCard ev={ev} />
              </Grid>
            ))}
          </Grid>
          <Box display="flex" justifyContent="center" mt={2}>
            <Button
              onClick={loadMore}
              disabled={!hasMore || paging}
              variant="outlined"
            >
              {paging ? "Loading…" : hasMore ? "Load more" : "No more"}
            </Button>
          </Box>
        </>
      ) : (
        <Paper sx={{ p: 2 }}>
          <Typography color="text.secondary">
            No events match your filters.
          </Typography>
        </Paper>
      )}
    </Container>
  );
}
