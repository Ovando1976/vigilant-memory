// src/pages/SiteShowPage.jsx
import * as React from "react";
import { useEffect, useState } from "react";
import { useLocation, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Container,
  Grid,
  Stack,
  Typography,
  Button,
  Chip,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  Link,
  Alert,
} from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import PlaceIcon from "@mui/icons-material/Place";
import ShareIcon from "@mui/icons-material/Share";
import DirectionsIcon from "@mui/icons-material/Directions";
import HistoryEduIcon from "@mui/icons-material/HistoryEdu";
import MapIcon from "@mui/icons-material/Map";
import DirectionsCarFilledRoundedIcon from "@mui/icons-material/DirectionsCarFilledRounded";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PersonIcon from "@mui/icons-material/Person";

import { loadSiteEpochs } from "../lib/loadSiteEpochs";
import HistoryTimeline from "../components/HistoryTimeline";
import ImageWithFallback from "../components/ImageWithFallback";
import BeachMapWithControls from "../components/BeachMapWithControls";
import PhotoStrip from "../components/Place/PhotoStrip";
import { useInstantRide } from "../hooks/useInstantRide";

// NEW: people grid
import PeopleGrid from "../components/Site/PeopleGrid";

// static dataset (no extension)
import siteDataRaw from "../data/siteData";

const PLACEHOLDER = "/images/placeholder-beach.jpg";

/* ----------------------------- helpers ----------------------------- */
const normalizeEntries = (raw) =>
  Object.entries(raw || {}).map(([key, site]) => ({ key, ...site }));

const sites = normalizeEntries(siteDataRaw);

const getByKeyOrSlug = (hash) => {
  const k = decodeURIComponent(
    String(hash || "")
      .replace(/^#/, "")
      .trim()
  );
  if (!k) return null;
  let s = sites.find((x) => x.key === k);
  if (s) return s;
  s = sites.find(
    (x) =>
      String(x.slug || "")
        .toLowerCase()
        .replace(/\W+/g, "-") === k ||
      String(x.name || "")
        .toLowerCase()
        .replace(/\W+/g, "-") === k
  );
  return s || null;
};

const toPublicImg = (url, baseDir = "/images/sites") => {
  if (!url) return null;
  const s = String(url);
  if (/^https?:\/\//i.test(s) || s.startsWith("/")) return s;
  return `${baseDir}/${encodeURIComponent(s)}`;
};

const islandCode = (s) =>
  String(s || "")
    .trim()
    .toUpperCase(); // STT | STJ | STX

const coordsFromSite = (site) => {
  const c = site?.mapFocus?.center;
  if (Array.isArray(c) && c.length === 2) {
    const lat = Number(c[0]);
    const lng = Number(c[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const lat = Number(site?.lat ?? site?.coordinates?.lat);
  const lng = Number(site?.lng ?? site?.coordinates?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return null;
};

/* ----------------------------- UI shells ----------------------------- */
function Section({ id, title, icon, action, children }) {
  return (
    <Paper
      id={id}
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 3,
        border: (t) => `1px solid ${t.palette.divider}`,
        bgcolor: (t) =>
          t.palette.mode === "dark"
            ? "rgba(255,255,255,.02)"
            : "rgba(0,0,0,.015)",
        scrollMarginTop: { xs: 72, md: 90 },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        {icon}
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

function StickySubnav({ items = [], offsetTop = 76 }) {
  const [active, setActive] = React.useState(items[0]?.id);
  React.useEffect(() => {
    if (!items.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const v = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          )[0];
        if (v?.target?.id) setActive(v.target.id);
      },
      { rootMargin: `-${offsetTop + 8}px 0px -60% 0px` }
    );
    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [items, offsetTop]);

  const go = (id) =>
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (!items.length) return null;
  return (
    <Paper
      elevation={0}
      sx={{
        position: "sticky",
        top: offsetTop,
        zIndex: (t) => t.zIndex.appBar,
        px: 1,
        py: 0.5,
        mb: 1,
        borderRadius: 2,
        border: (t) => `1px solid ${t.palette.divider}`,
        backdropFilter: "saturate(160%) blur(8px)",
        bgcolor: (t) =>
          t.palette.mode === "dark"
            ? "rgba(20,20,20,.6)"
            : "rgba(255,255,255,.6)",
      }}
    >
      <Stack direction="row" spacing={1} sx={{ overflowX: "auto" }}>
        {items.map(({ id, label }) => (
          <Button
            key={id}
            size="small"
            onClick={() => go(id)}
            color={active === id ? "primary" : "inherit"}
            sx={{ textTransform: "none", px: 1.25 }}
          >
            {label}
          </Button>
        ))}
      </Stack>
    </Paper>
  );
}

/* ---------------------------- Content blocks ---------------------------- */
function QuickFacts({ site }) {
  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {site.island && (
          <Chip
            size="small"
            label={islandCode(site.island)}
            icon={<PlaceIcon />}
          />
        )}
        {site.era && <Chip size="small" label={site.era} />}
        {Array.isArray(site.tags) &&
          site.tags
            .slice(0, 6)
            .map((t) => <Chip key={t} size="small" label={t} />)}
      </Stack>
      {site.location && (
        <Typography variant="body2" color="text.secondary">
          <b>Location:</b> {site.location}
        </Typography>
      )}
      {site.timeline && (
        <Typography variant="body2" color="text.secondary">
          <b>Timeline:</b> {site.timeline}
        </Typography>
      )}
      {site.significance && (
        <Typography variant="body2" color="text.secondary">
          <b>Why it matters:</b> {site.significance}
        </Typography>
      )}
    </Stack>
  );
}

function Timeline({ items = [] }) {
  if (!items.length) return null;
  return (
    <Stack spacing={1.2}>
      {items.map((ev, i) => (
        <Stack key={i} direction="row" spacing={1.2} alignItems="flex-start">
          <Chip label={ev.year || ev.when || "—"} size="small" />
          <Typography variant="body2">{ev.text || ev.event}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function ReadingList({ links = [] }) {
  if (!links.length) return null;
  return (
    <Stack spacing={1}>
      {links.map((r, i) => (
        <Typography key={i} variant="body2">
          <Link href={r.url} target="_blank" rel="noreferrer">
            {r.title || r.url}
          </Link>
          {r.note ? <em> — {r.note}</em> : null}
        </Typography>
      ))}
    </Stack>
  );
}

/* ------------------------------- Page ------------------------------- */
export default function SiteShowPage() {
  // If you scope epochs by island, pass the right key; st_thomas used here
  const siteKey = "st_thomas";
  const [epochs, setEpochs] = useState(null);
  const [people, setPeople] = useState([]);
  const { hash } = useLocation();
  const { rideTo } = useInstantRide();

  useEffect(() => {
    let live = true;
    (async () => {
      const data = await loadSiteEpochs(siteKey);
      if (live) setEpochs(data || null);
      // load people file co-located with epochs if you created it
      try {
        const r = await fetch(`/data/sites/${siteKey}/people.json`);
        if (live && r.ok) setPeople(await r.json());
      } catch {
        /* ignore */
      }
    })();
    return () => {
      live = false;
    };
  }, [siteKey]);

  const site = React.useMemo(() => getByKeyOrSlug(hash), [hash]);

  if (!site) {
    return (
      <Container sx={{ py: 4 }}>
        <Button
          component={RouterLink}
          to="/explore"
          startIcon={<ArrowBackIosNewIcon />}
        >
          Back to Explore
        </Button>
        <Alert severity="error" sx={{ mt: 2 }}>
          Sorry, we couldn’t find that site.
        </Alert>
      </Container>
    );
  }

  // Images
  const hero =
    toPublicImg(site.hero, "/images/sites") ||
    toPublicImg(site.thumbnail, "/images/sites") ||
    PLACEHOLDER;

  const gallery = Array.isArray(site.photos)
    ? site.photos.map((p) => toPublicImg(p, "/images/sites")).filter(Boolean)
    : [];

  const coords = coordsFromSite(site);
  const canRide = Boolean(coords);
  const dirUrl = coords
    ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=driving`
    : null;

  const stripPhotos = hero
    ? [hero, ...gallery.filter((g) => g !== hero)]
    : gallery;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Button
        component={RouterLink}
        to="/explore"
        startIcon={<ArrowBackIosNewIcon />}
        size="small"
        sx={{ mb: 1 }}
      >
        Back to Explore
      </Button>

      {/* Hero */}
      <Box sx={{ position: "relative", borderRadius: 3, overflow: "hidden" }}>
        <ImageWithFallback
          name={site.name || site.key}
          explicitUrl={hero}
          basePath="/images/sites"
          placeholder={PLACEHOLDER}
          alt={site.name}
          sx={{
            width: "100%",
            height: { xs: 220, md: 420 },
            objectFit: "cover",
            display: "block",
          }}
        />
        {/* overlay controls */}
        <Box
          sx={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 12,
            color: "#fff",
            textShadow: "0 1px 3px rgba(0,0,0,.6)",
          }}
        >
          <Typography variant="h4" fontWeight={900}>
            {site.name}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
            {site.island && (
              <Chip
                size="small"
                icon={<PlaceIcon />}
                label={islandCode(site.island)}
              />
            )}
            {site.era && <Chip size="small" label={site.era} />}
            {Array.isArray(site.tags) &&
              site.tags
                .slice(0, 4)
                .map((t) => <Chip key={t} size="small" label={t} />)}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            {dirUrl && (
              <Button
                size="small"
                variant="contained"
                startIcon={<DirectionsIcon />}
                component={Link}
                href={dirUrl}
                target="_blank"
                rel="noreferrer"
              >
                Directions
              </Button>
            )}
            {canRide && (
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<DirectionsCarFilledRoundedIcon />}
                onClick={() =>
                  rideTo(
                    { lat: coords.lat, lng: coords.lng, label: site.name },
                    { island: islandCode(site.island) }
                  )
                }
              >
                Ride here
              </Button>
            )}
            <Tooltip title="Share">
              <IconButton
                size="small"
                sx={{ bgcolor: "rgba(255,255,255,.9)" }}
                onClick={async () => {
                  const url = `${window.location.origin}${
                    window.location.pathname
                  }#${encodeURIComponent(site.key)}`;
                  const text = `Explore ${site.name} — a historic site in the USVI`;
                  try {
                    if (navigator.share)
                      await navigator.share({ title: site.name, text, url });
                    else await navigator.clipboard.writeText(`${text} ${url}`);
                  } catch {}
                }}
              >
                <ShareIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </Box>

      {/* Subnav */}
      <StickySubnav
        offsetTop={80}
        items={[
          { id: "photos", label: "Photos" },
          { id: "overview", label: "Overview" },
          { id: "timeline", label: "Timeline" },
          { id: "map", label: "Map" },
          { id: "people", label: "People" },
          { id: "readings", label: "Readings" },
          { id: "today", label: "Today" },
        ]}
      />

      {/* Photos */}
      {stripPhotos.length > 0 && (
        <Box id="photos" sx={{ mt: 1.5 }}>
          <PhotoStrip photos={stripPhotos.slice(1)} main={stripPhotos[0]} />
        </Box>
      )}

      {/* Overview + Quick facts */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} md={8}>
          <Section id="overview" title="Overview" icon={<HistoryEduIcon />}>
            {site.description ? (
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                {site.description}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No description available.
              </Typography>
            )}
          </Section>
        </Grid>
        <Grid item xs={12} md={4}>
          <Section id="facts" title="Quick facts" icon={<CameraAltIcon />}>
            <QuickFacts site={site} />
          </Section>
        </Grid>
      </Grid>

      {/* Timeline */}
      <Box sx={{ mt: 2 }}>
        <Section
          id="timeline"
          title="Historical timeline"
          icon={<HistoryEduIcon />}
        >
          <Timeline items={site.events || site.timelineItems || []} />
          {!site.events && !site.timelineItems && (
            <Typography variant="body2" color="text.secondary">
              No timeline available for this site yet.
            </Typography>
          )}
        </Section>
      </Box>

      {/* Map */}
      <Box sx={{ mt: 2 }}>
        <Section
          id="map"
          title="Map"
          icon={<MapIcon />}
          action={
            dirUrl ? (
              <Button
                size="small"
                startIcon={<DirectionsIcon />}
                component={Link}
                href={dirUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open in Maps
              </Button>
            ) : null
          }
        >
          {coords ? (
            <Box sx={{ height: 320, borderRadius: 2, overflow: "hidden" }}>
              <BeachMapWithControls
                markers={[
                  {
                    id: site.key,
                    name: site.name,
                    lat: coords.lat,
                    lng: coords.lng,
                  },
                ]}
                focus={{ lat: coords.lat, lng: coords.lng }}
                focusZoom={16}
                minZoom={10}
                maxZoom={18}
                fitPadding={80}
              />
            </Box>
          ) : (
            <Alert severity="info">
              No coordinates recorded for this site.
            </Alert>
          )}
        </Section>
      </Box>

      {/* People */}
      {people?.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Section id="people" title="People" icon={<PersonIcon />}>
            <PeopleGrid people={people} />
          </Section>
        </Box>
      )}

      {/* Reading list / sources */}
      <Box sx={{ mt: 2 }}>
        <Section id="readings" title="Further reading" icon={<MenuBookIcon />}>
          <ReadingList
            links={
              site.reading || site.sources || epochs?.readings?.links || []
            }
          />
          {!site.reading && !site.sources && !epochs?.readings?.links && (
            <Typography variant="body2" color="text.secondary">
              No reading list provided yet.
            </Typography>
          )}
        </Section>
      </Box>

      {/* Today / Founding / Eras from epochs */}
      {epochs?.today && (
        <Box sx={{ mt: 2 }}>
          <Section id="today" title={epochs.today.title} icon={<PlaceIcon />}>
            <Typography variant="body1" sx={{ whiteSpace: "pre-line" }}>
              {epochs.today.body}
            </Typography>
          </Section>
        </Box>
      )}

      {epochs?.erik && (
        <Box sx={{ mt: 2 }}>
          <Section
            id="founding"
            title={epochs.erik.title}
            icon={<HistoryEduIcon />}
          >
            {epochs.erik.background && (
              <Typography sx={{ mb: 1 }}>{epochs.erik.background}</Typography>
            )}
            {epochs.erik.timeline && (
              <HistoryTimeline items={epochs.erik.timeline} />
            )}
            {epochs.erik.collapse && (
              <Typography sx={{ mt: 1.5 }}>{epochs.erik.collapse}</Typography>
            )}
            {epochs.erik.themes?.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Historical Significance
                </Typography>
                {epochs.erik.themes.map((t, i) => (
                  <Typography key={i} variant="body2">
                    • {t}
                  </Typography>
                ))}
              </Box>
            )}
          </Section>
        </Box>
      )}

      {epochs?.danish && (
        <Box sx={{ mt: 2 }}>
          <Section
            id="danish"
            title={epochs.danish.title}
            icon={<HistoryEduIcon />}
          >
            <HistoryTimeline items={epochs.danish.events} />
          </Section>
        </Box>
      )}

      {epochs?.us && (
        <Box sx={{ mt: 2, mb: 4 }}>
          <Section
            id="us-era"
            title={epochs.us.title}
            icon={<HistoryEduIcon />}
          >
            <HistoryTimeline items={epochs.us.events} />
          </Section>
        </Box>
      )}
    </Container>
  );
}
