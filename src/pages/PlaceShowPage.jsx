// src/pages/PlaceShowPage.jsx
import React from "react";
import { useParams, useLocation, Link as RouterLink } from "react-router-dom";
import {
  Container,
  Box,
  Grid,
  Stack,
  Typography,
  Button,
  Divider,
  Paper,
  IconButton,
  Tooltip,
  Link,
  Skeleton,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import PlaceIcon from "@mui/icons-material/Place";
import PublicIcon from "@mui/icons-material/Public";
import PhoneIcon from "@mui/icons-material/Phone";
import ShareIcon from "@mui/icons-material/Share";
import DirectionsIcon from "@mui/icons-material/Directions";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import PlaceMap from "../components/PlaceMap";
import PhotoStrip from "../components/Place/PhotoStrip";
import ReviewsPanel from "../components/Place/ReviewsPanel";
import NearbyGrid from "../components/Place/NearbyGrid";

/* ============== helpers (unchanged from your refined version) ============== */
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
function padTime(h, m) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function to24h(h, m, ap) {
  let hh = Number(h);
  const mm = String(m).padStart(2, "0");
  const a = (ap || "").toLowerCase();
  if (a === "pm" && hh < 12) hh += 12;
  if (a === "am" && hh === 12) hh = 0;
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
      const [, h1, m1 = "00", ap1, h2, m2 = "00", ap2] = m;
      return { start: to24h(h1, m1, ap1), end: to24h(h2, m2, ap2) };
    })
    .filter(Boolean);
}
function rangesForDay(p, d) {
  return Array.isArray(p?.openHours?.[d])
    ? p.openHours[d]
    : parseOpenField(p?.[`open${d}`]);
}
function isOpenNow(p, now = new Date()) {
  try {
    const day = now.getDay();
    const cur = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
    const ranges = rangesForDay(p, day);
    return ranges?.some((r) => cur >= r.start && cur <= r.end) || false;
  } catch {
    return false;
  }
}
function openNowLabel(p, now = new Date()) {
  const day = now.getDay();
  const cur = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;
  const ranges = rangesForDay(p, day);
  if (!ranges?.length) return null;
  const current = ranges.find((r) => cur >= r.start && cur <= r.end);
  if (current) return `Open now · until ${current.end}`;
  const next = ranges.find((r) => cur < r.start);
  return next ? `Opens at ${next.start}` : null;
}
function gmapsDirectionsUrl(p) {
  const c = getLatLng(p);
  if (c)
    return `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`;
  if (p?.address)
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      p.address
    )}`;
  return null;
}
function publicImageUrl(nameOrPath) {
  if (!nameOrPath) return null;
  let s = String(nameOrPath).trim();
  if (s.startsWith("/")) return s;
  if (/^https?:\/\//i.test(s) || s.startsWith("//")) return s;
  const base = process.env.PUBLIC_URL || "";
  const parts = s.split("/");
  const file = encodeURIComponent(parts.pop());
  const dir = parts.join("/");
  return `${base}/images/places/${dir ? `${dir}/` : ""}${file}`;
}
function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
function MultiSourceImage({ sources = [], fallback, alt, ...imgProps }) {
  const [i, setI] = React.useState(0);
  const src = sources[i] || fallback;
  const onError = () =>
    setI((prev) => (prev + 1 < sources.length ? prev + 1 : prev));
  return <img src={src} alt={alt} onError={onError} {...imgProps} />;
}
function Pill({ icon, children, muted = false }) {
  return (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      sx={{
        px: 1,
        py: 0.25,
        borderRadius: 1.5,
        border: (t) => `1px solid ${t.palette.divider}`,
        color: (t) =>
          muted ? t.palette.text.secondary : t.palette.text.primary,
        bgcolor: (t) =>
          t.palette.mode === "dark"
            ? "rgba(255,255,255,0.05)"
            : "rgba(0,0,0,0.03)",
        fontSize: 13,
      }}
    >
      {icon}
      <span>{children}</span>
    </Stack>
  );
}
function Section({ title, action, children, id }) {
  return (
    <Paper
      id={id}
      variant="outlined"
      sx={{
        scrollMarginTop: { xs: 72, md: 92 },
        p: 2,
        borderRadius: 3,
        border: (t) => `1px solid ${t.palette.divider}`,
        bgcolor: (t) =>
          t.palette.mode === "dark"
            ? "rgba(255,255,255,.02)"
            : "rgba(0,0,0,.015)",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="h6" fontWeight={800}>
          {title}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {action}
      </Stack>
      <Divider sx={{ mb: 1 }} />
      {children}
    </Paper>
  );
}

/* ----------------------------- Menu section ----------------------------- */
function MenuSection({ menu = [], menuUrl }) {
  // Normalize to [{section, items:[{name, price, desc}]}]
  const normalized = React.useMemo(() => {
    if (!Array.isArray(menu)) return [];
    if (menu.length && menu[0]?.items) {
      return menu.map((s) => ({
        section: String(s.section || "Menu"),
        items: Array.isArray(s.items) ? s.items : [],
      }));
    }
    return [{ section: "Menu", items: menu }];
  }, [menu]);

  const totalItems = normalized.reduce((n, s) => n + s.items.length, 0);
  const [expanded, setExpanded] = React.useState(totalItems <= 12);

  const fmtPrice = (v) => {
    if (v == null || v === "") return "";
    if (typeof v === "number") return `$${v.toFixed(2)}`;
    const n = Number(v);
    return Number.isFinite(n) ? `$${n.toFixed(2)}` : String(v);
  };

  if (!normalized.length || totalItems === 0) return null;

  return (
    <Section
      title="Menu"
      action={
        menuUrl ? (
          <Button
            size="small"
            component={Link}
            href={
              /^https?:\/\//i.test(menuUrl) ? menuUrl : `https://${menuUrl}`
            }
            target="_blank"
            rel="noreferrer"
          >
            View full menu
          </Button>
        ) : null
      }
    >
      <Stack spacing={2}>
        {normalized.map((sec, i) => {
          const items = expanded ? sec.items : sec.items.slice(0, 12);
          if (!items.length) return null;
          return (
            <Box key={i}>
              {!(
                normalized.length === 1 && (sec.section || "Menu") === "Menu"
              ) && (
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  sx={{ mb: 0.5 }}
                >
                  {sec.section || "Menu"}
                </Typography>
              )}
              <Stack
                component="ul"
                spacing={0.5}
                sx={{ listStyle: "none", pl: 0, m: 0 }}
              >
                {items.map((it, j) => (
                  <Stack
                    key={j}
                    component="li"
                    direction={{ xs: "column", sm: "row" }}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    justifyContent="space-between"
                    sx={{
                      py: 0.5,
                      borderBottom: (t) => `1px dashed ${t.palette.divider}`,
                    }}
                    gap={0.75}
                  >
                    <Stack spacing={0.25} sx={{ mr: 2, minWidth: 0 }}>
                      <Typography
                        fontWeight={700}
                        noWrap
                        title={it?.name || ""}
                      >
                        {it?.name || ""}
                      </Typography>
                      {it?.desc && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ maxWidth: 680 }}
                        >
                          {it.desc}
                        </Typography>
                      )}
                    </Stack>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      {fmtPrice(it?.price)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          );
        })}
        {totalItems > 12 && (
          <Box sx={{ display: "flex", justifyContent: "center", pt: 0.5 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "Show less" : `Show all (${totalItems})`}
            </Button>
          </Box>
        )}
      </Stack>
    </Section>
  );
}

/* ============================= page ============================= */
export default function PlaceShowPage() {
  const params = useParams();
  const location = useLocation();
  const id = React.useMemo(() => {
    const fromParams =
      params?.id && params.id !== "undefined" ? params.id : null;
    if (fromParams) return fromParams;
    const hash = location.hash || "";
    const path = location.pathname || "";
    const search = location.search || "";
    const pick = (s) =>
      s.match(/\/places\/([^/?#]+)/i)?.[1]
        ? decodeURIComponent(s.match(/\/places\/([^/?#]+)/i)[1])
        : null;
    return (
      pick(hash.replace(/^#/, "")) ||
      pick(path) ||
      new URLSearchParams(
        search || (hash.includes("?") ? hash.split("?")[1] : "")
      ).get("id")
    );
  }, [params, location]);

  const [data, setData] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!id) {
          if (!cancelled) {
            setErr("Missing place id");
            setLoading(false);
          }
          return;
        }
        const snap = await getDoc(doc(db, "places", id));
        if (!cancelled) {
          if (snap.exists()) setData({ id: snap.id, ...(snap.data() || {}) });
          else setErr("Not found");
        }
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Error loading place");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const coords = React.useMemo(() => getLatLng(data), [data]);
  const priceCode = React.useMemo(() => toPriceCode(data?.priceLevel), [data]);
  const openLabel = React.useMemo(
    () => (data ? openNowLabel(data) : null),
    [data]
  );
  const directionsUrl = React.useMemo(
    () => (data ? gmapsDirectionsUrl(data) : null),
    [data]
  );

  const placeholder =
    String(data?.kind).toLowerCase() === "stays"
      ? "/images/places/placeholder-stays.jpg"
      : String(data?.kind).toLowerCase() === "shops"
      ? "/images/places/placeholder-shop.jpg"
      : "/images/places/placeholder-restaurant.jpg";

  const heroSources = React.useMemo(() => {
    const srcs = [];
    if (data?.imageUrl) srcs.push(publicImageUrl(data.imageUrl));
    const slug = slugify(data?.imageSlug || data?.slug || data?.name);
    const islandDir = String(data?.island || "").toLowerCase();
    const base = process.env.PUBLIC_URL || "";
    if (slug) {
      const add = (p) => srcs.push(`${base}/images/places/${p}`);
      if (islandDir)
        ["jpg", "jpeg", "webp", "png"].forEach((ext) =>
          add(`${islandDir}/${slug}.${ext}`)
        );
      ["jpg", "jpeg", "webp", "png"].forEach((ext) => add(`${slug}.${ext}`));
    }
    const seen = new Set();
    return srcs.filter((u) => u && !seen.has(u) && (seen.add(u), true));
  }, [data]);

  const resolvedPhotos = React.useMemo(
    () =>
      Array.isArray(data?.photos)
        ? data.photos.map(publicImageUrl).filter(Boolean)
        : [],
    [data]
  );
  const mainPhoto = React.useMemo(
    () => publicImageUrl(data?.imageUrl) || heroSources[0] || null,
    [data, heroSources]
  );

  /* --------------------------- guarded renders --------------------------- */
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Skeleton variant="text" width={260} height={32} />
        <Skeleton variant="rounded" height={380} sx={{ my: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Skeleton variant="rounded" height={240} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rounded" height={240} />
          </Grid>
        </Grid>
      </Container>
    );
  }
  if (err) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Button
          component={RouterLink}
          to="/food"
          startIcon={<ArrowBackIosNewIcon />}
        >
          Back to Food &amp; Drink
        </Button>
        <Paper
          sx={{
            p: 2,
            mt: 2,
            borderRadius: 3,
            border: (t) => `1px solid ${t.palette.divider}`,
          }}
        >
          <Typography variant="h6" color="error" fontWeight={800} gutterBottom>
            Error
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
            {String(err)}
          </Typography>
        </Paper>
      </Container>
    );
  }
  if (!data) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Button
          component={RouterLink}
          to="/food"
          startIcon={<ArrowBackIosNewIcon />}
        >
          Back to Food &amp; Drink
        </Button>
        <Typography variant="h6" sx={{ mt: 2 }}>
          Not found.
        </Typography>
      </Container>
    );
  }

  /* ============================ layout ============================ */
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* back */}
      <Button
        component={RouterLink}
        to="/food"
        startIcon={<ArrowBackIosNewIcon />}
        size="small"
        sx={{ mb: 1 }}
      >
        Back to Food &amp; Drink
      </Button>

      {/* HERO */}
      <Box sx={{ position: "relative", borderRadius: 3, overflow: "hidden" }}>
        <MultiSourceImage
          sources={heroSources}
          fallback={placeholder}
          alt={data.name || "Place photo"}
          loading="lazy"
          decoding="async"
          style={{
            width: "100%",
            aspectRatio: "21 / 9",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
          }}
        />
        {/* scrim */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0) 48%, rgba(0,0,0,.45) 98%)",
          }}
        />
        {/* overlay */}
        <Box
          sx={{
            position: "absolute",
            left: { xs: 12, md: 16 },
            right: { xs: 12, md: 16 },
            bottom: { xs: 10, md: 14 },
            color: "#fff",
          }}
        >
          <Stack spacing={1}>
            <Typography
              variant="h4"
              fontWeight={900}
              sx={{ textShadow: "0 1px 3px rgba(0,0,0,.6)" }}
            >
              {data.name || "Untitled"}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
            >
              {typeof data.rating === "number" && (
                <Pill
                  icon={<StarIcon sx={{ fontSize: 16, color: "#FFD54F" }} />}
                >
                  {data.rating.toFixed(1)}
                </Pill>
              )}
              {priceCode && (
                <Pill icon={<AttachMoneyIcon sx={{ fontSize: 16 }} />}>
                  {priceCode}
                </Pill>
              )}
              <Pill muted>
                {openLabel || (isOpenNow(data) ? "Open now" : "Closed")}
              </Pill>
              <Box sx={{ flexGrow: 1 }} />
              <Stack direction="row" spacing={1}>
                {data.phone && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    sx={{ px: 1.5 }}
                    startIcon={<PhoneIcon />}
                    component={Link}
                    href={`tel:${String(data.phone).replace(/\s+/g, "")}`}
                  >
                    Call
                  </Button>
                )}
                {data.website && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    sx={{ px: 1.5 }}
                    startIcon={<PublicIcon />}
                    component={Link}
                    href={
                      /^https?:\/\//i.test(data.website)
                        ? data.website
                        : `https://${data.website}`
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    Website
                  </Button>
                )}
                {directionsUrl && (
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    sx={{ px: 1.5 }}
                    startIcon={<DirectionsIcon />}
                    component={Link}
                    href={directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Directions
                  </Button>
                )}
                <Tooltip title="Share">
                  <IconButton
                    size="small"
                    sx={{ bgcolor: "rgba(255,255,255,.9)" }}
                    onClick={async () => {
                      const url = window.location.href,
                        text = `Check out ${data.name} in the USVI!`;
                      try {
                        if (navigator.share)
                          await navigator.share({
                            title: data.name,
                            text,
                            url,
                          });
                        else
                          await navigator.clipboard.writeText(`${text} ${url}`);
                      } catch {}
                    }}
                  >
                    <ShareIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
          </Stack>
        </Box>
      </Box>

      {/* PhotoStrip under hero */}
      <Box sx={{ mt: 1.5 }}>
        <PhotoStrip photos={resolvedPhotos} main={mainPhoto} />
      </Box>

      {/* ROW 1: Overview + Menu (left) • Hours + Location (right) */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} md={8}>
          {data.description && (
            <Section id="overview" title="Overview">
              <Typography variant="body1">{data.description}</Typography>
            </Section>
          )}

          {(Array.isArray(data.menu) && data.menu.length) || data.menuUrl ? (
            <Box sx={{ mt: 2 }}>
              <MenuSection menu={data.menu || []} menuUrl={data.menuUrl} />
            </Box>
          ) : null}
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack
            spacing={2}
            sx={{ position: { md: "sticky" }, top: { md: 96 } }}
          >
            <Section id="hours" title="Hours">
              <Stack spacing={0.5}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (label, d) => {
                    const ranges = rangesForDay(data, d);
                    return (
                      <Stack
                        key={label}
                        direction="row"
                        justifyContent="space-between"
                      >
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ minWidth: 44 }}
                        >
                          {label}
                        </Typography>
                        <Typography variant="body2">
                          {ranges?.length
                            ? ranges
                                .map((r) => `${r.start}–${r.end}`)
                                .join(", ")
                            : "Closed"}
                        </Typography>
                      </Stack>
                    );
                  }
                )}
              </Stack>
            </Section>

            {(coords || data.address) && (
              <Section
                id="location"
                title="Location"
                action={
                  directionsUrl ? (
                    <Button
                      size="small"
                      startIcon={<DirectionsIcon />}
                      component={Link}
                      href={directionsUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open in Maps
                    </Button>
                  ) : null
                }
              >
                <Box
                  sx={{
                    mt: 1,
                    height: 240,
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  {coords ? (
                    <PlaceMap
                      markers={[
                        {
                          id: data.id,
                          name: data.name,
                          lat: coords.lat,
                          lng: coords.lng,
                        },
                      ]}
                      focus={{ lat: coords.lat, lng: coords.lng }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No coordinates
                    </Typography>
                  )}
                </Box>
                {data.address && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    {data.address}
                  </Typography>
                )}
              </Section>
            )}
          </Stack>
        </Grid>
      </Grid>

      {/* Reviews */}
      <Box sx={{ mt: 2 }}>
        <ReviewsPanel placeId={data.id} />
      </Box>

      {/* Nearby */}
      <Box sx={{ mt: 2 }}>
        <Section title="Nearby you might like">
          <NearbyGrid place={data} max={6} />
        </Section>
      </Box>

      {/* Mobile sticky CTA */}
      <Box
        sx={{
          position: { xs: "sticky", md: "static" },
          bottom: 0,
          zIndex: (t) => t.zIndex.appBar,
          display: { xs: "flex", md: "none" },
          gap: 1,
          p: 1,
          bgcolor: (t) => t.palette.background.paper,
          borderTop: (t) => `1px solid ${t.palette.divider}`,
        }}
      >
        {data.phone && (
          <Button
            size="small"
            fullWidth
            variant="outlined"
            component={Link}
            href={`tel:${String(data.phone).replace(/\s+/g, "")}`}
          >
            Call
          </Button>
        )}
        {directionsUrl && (
          <Button
            size="small"
            fullWidth
            variant="contained"
            color="success"
            component={Link}
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
          >
            Directions
          </Button>
        )}
        {data.website && (
          <Button
            size="small"
            fullWidth
            variant="outlined"
            component={Link}
            href={
              /^https?:\/\//i.test(data.website)
                ? data.website
                : `https://${data.website}`
            }
            target="_blank"
            rel="noreferrer"
          >
            Website
          </Button>
        )}
      </Box>
    </Container>
  );
}
