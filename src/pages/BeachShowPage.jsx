// src/pages/BeachShowPage.jsx
import React from "react";
import { useParams, Link as RouterLink, useLocation } from "react-router-dom";
import {
  Container,
  Box,
  Grid,
  Stack,
  Typography,
  Button,
  Chip,
  Paper,
  IconButton,
  Tooltip,
  Divider,
  Link,
  Rating,
  Avatar,
  LinearProgress,
  TextField,
} from "@mui/material";
import PlaceIcon from "@mui/icons-material/Place";
import ShareIcon from "@mui/icons-material/Share";
import DirectionsIcon from "@mui/icons-material/Directions";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import StarIcon from "@mui/icons-material/Star";
import ScubaDivingIcon from "@mui/icons-material/ScubaDiving";
import UmbrellaIcon from "@mui/icons-material/Umbrella";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import LunchDiningIcon from "@mui/icons-material/LunchDining";
import LocalParkingIcon from "@mui/icons-material/LocalParking";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DirectionsCarFilledRoundedIcon from "@mui/icons-material/DirectionsCarFilledRounded";
import InstantRideButton from "../components/InstantRideButton";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import ImageWithFallback from "../components/ImageWithFallback";
import BeachMapWithControls from "../components/BeachMapWithControls";
import PhotoStrip from "../components/Place/PhotoStrip";
import { useInstantRide } from "../hooks/useInstantRide";

/* ============================== helpers ============================== */
// tolerant lat/lng reader with USVI normalization
function getLatLng(b) {
  const gp =
    b?.geo ||
    b?.geopoint ||
    b?.geoPoint ||
    b?.location?.geopoint ||
    b?.location?.geo ||
    b?.coordinates ||
    b?.coords ||
    b?.position ||
    b?.loc;

  let lat =
    b?.lat ??
    b?.latitude ??
    (gp
      ? gp.lat ?? gp.latitude ?? (Array.isArray(gp) ? gp[0] : undefined)
      : undefined);

  let lng =
    b?.lng ??
    b?.lon ??
    b?.long ??
    b?.longitude ??
    (gp
      ? gp.lng ??
        gp.lon ??
        gp.long ??
        gp.longitude ??
        (Array.isArray(gp) ? gp[1] : undefined)
      : undefined);

  if (
    gp &&
    typeof gp.latitude === "number" &&
    typeof gp.longitude === "number"
  ) {
    lat = gp.latitude;
    lng = gp.longitude;
  }

  lat = Number(lat);
  lng = Number(lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  // Normalize into USVI box
  const BOX = { latMin: 17.5, latMax: 18.6, lngMin: -65.2, lngMax: -64.2 };
  const inBox = ({ lat, lng }) =>
    lat >= BOX.latMin &&
    lat <= BOX.latMax &&
    lng >= BOX.lngMin &&
    lng <= BOX.lngMax;

  let pos = { lat, lng };
  if (inBox(pos)) return pos;
  if (lng > 0 && inBox({ lat, lng: -lng })) return { lat, lng: -lng };
  if (inBox({ lat: lng, lng: lat })) return { lat: lng, lng: lat };
  if (inBox({ lat: lng, lng: -lat })) return { lat: lng, lng: -lat };
  if (lat < 0 && inBox({ lat: -lat, lng })) return { lat: -lat, lng };
  return pos;
}

function toDetailHash(id) {
  return `${window.location.origin}${window.location.pathname}#/beaches/${id}`;
}

function publicImageUrl(nameOrPath) {
  if (!nameOrPath) return null;
  const s = String(nameOrPath).trim();
  if (/^https?:\/\//i.test(s) || s.startsWith("//") || s.startsWith("/"))
    return s;
  const base = process.env.PUBLIC_URL || "";
  return `${base}/images/beaches/${encodeURIComponent(s)}`;
}

function tagSet(b) {
  const raw = Array.isArray(b?.tags) ? b.tags : [];
  const extra = [b?.category, b?.amenities, b?.features, b?.type].flatMap((x) =>
    Array.isArray(x) ? x : x ? [x] : []
  );
  return new Set(
    [...raw, ...extra].map((s) =>
      String(s || "")
        .toLowerCase()
        .trim()
    )
  );
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
    parking: b?.parking === true || has(T, "parking", "car park", "lot"),
    family: b?.family === true || has(T, "family", "kids", "children"),
    restrooms:
      b?.restrooms === true || has(T, "restrooms", "bathroom", "toilets", "wc"),
    lifeguard: b?.lifeguard === true || has(T, "lifeguard"),
    fee: b?.fee === true || has(T, "fee", "paid", "entry"),
  };
}

function Section({ id, title, action, children }) {
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
      <Stack direction="row" alignItems="center" sx={{ mb: 1 }} spacing={1}>
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

/* tiny sticky subnav */
function StickySubnav({ items = [], offsetTop = 80 }) {
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
        top: { xs: offsetTop - 8, md: offsetTop },
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

/* =========================== Reviews (beaches) =========================== */
function RatingSummary({ reviews = [], average = 0 }) {
  const counts = React.useMemo(() => {
    const c = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const k = Math.round(Number(r?.rating) || 0);
      if (k >= 1 && k <= 5) c[k]++;
    });
    return c;
  }, [reviews]);
  if (!reviews.length)
    return (
      <Typography variant="body2" color="text.secondary">
        No reviews yet.
      </Typography>
    );
  const total = reviews.length || 1;
  const Row = ({ star }) => {
    const pct = (counts[star] / total) * 100;
    return (
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography sx={{ width: 28 }} variant="body2" color="text.secondary">
          {star}★
        </Typography>
        <Box sx={{ flex: 1 }}>
          <LinearProgress variant="determinate" value={pct} />
        </Box>
        <Typography
          sx={{ width: 34, textAlign: "right" }}
          variant="caption"
          color="text.secondary"
        >
          {counts[star]}
        </Typography>
      </Stack>
    );
  };
  return (
    <Stack spacing={1}>
      <Typography variant="h4" fontWeight={900} lineHeight={1}>
        {Number(average || 0).toFixed(1)}{" "}
        <Typography component="span" variant="body2" color="text.secondary">
          / 5
        </Typography>
      </Typography>
      <Stack spacing={0.7}>
        {[5, 4, 3, 2, 1].map((s) => (
          <Row key={s} star={s} />
        ))}
      </Stack>
    </Stack>
  );
}

function BeachReviewsPanel({ beachId }) {
  const [reviews, setReviews] = React.useState([]);
  const [avg, setAvg] = React.useState(0);
  React.useEffect(() => {
    if (!beachId) return;
    const qy = query(
      collection(db, "beaches", beachId, "reviews"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(qy, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
      setReviews(arr);
      setAvg(
        arr.length
          ? arr.reduce((s, r) => s + Number(r.rating || 0), 0) / arr.length
          : 0
      );
    });
    return unsub;
  }, [beachId]);
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Typography variant="h6" fontWeight={800}>
            Reviews
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {reviews.length} review{reviews.length === 1 ? "" : "s"}
          </Typography>
          <RatingSummary reviews={reviews} average={avg} />
        </Grid>
        <Grid item xs={12} md={7}>
          <ReviewComposer beachId={beachId} />
        </Grid>
      </Grid>
      <Divider sx={{ my: 2 }} />
      <Stack spacing={2}>
        {reviews.map((r) => (
          <Stack
            key={r.id}
            direction="row"
            spacing={1.5}
            alignItems="flex-start"
          >
            <Avatar sx={{ bgcolor: "primary.main" }}>
              {(r.userName || "?").slice(0, 1).toUpperCase()}
            </Avatar>
            <div style={{ flex: 1 }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 0.25 }}
              >
                <Typography
                  fontWeight={700}
                  noWrap
                  title={r.userName || "Visitor"}
                >
                  {r.userName || "Visitor"}
                </Typography>
                <Rating
                  size="small"
                  value={Number(r.rating) || 0}
                  precision={0.5}
                  readOnly
                />
              </Stack>
              {r.title && <Typography fontWeight={700}>{r.title}</Typography>}
              {r.text && (
                <Typography variant="body2" sx={{ mt: 0.25 }}>
                  {r.text}
                </Typography>
              )}
              {r.createdAt?.toDate && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: "block" }}
                >
                  {r.createdAt.toDate().toLocaleString()}
                </Typography>
              )}
            </div>
          </Stack>
        ))}
        {!reviews.length && (
          <Typography variant="body2" color="text.secondary">
            Be the first to write a review.
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

function ReviewComposer({ beachId }) {
  const location = useLocation();
  const [rating, setRating] = React.useState(5);
  const [title, setTitle] = React.useState("");
  const [text, setText] = React.useState("");
  const canPost = true; // TODO: wire AuthContext

  const minChars = 20;
  const submit = async () => {
    if (!canPost || !beachId || text.trim().length < minChars) return;
    await addDoc(collection(db, "beaches", beachId, "reviews"), {
      userId: "anon",
      userName: "Visitor",
      rating: Number(rating) || 0,
      title: title.trim(),
      text: text.trim(),
      createdAt: serverTimestamp(),
    });
    setTitle("");
    setText("");
    setRating(5);
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
        Write a review
      </Typography>
      <Stack spacing={1}>
        <Rating value={rating} onChange={(e, v) => setRating(v || 5)} />
        <TextField
          label="Title (optional)"
          size="small"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <TextField
          label="Your experience"
          multiline
          minRows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="contained"
            onClick={submit}
            disabled={!canPost || text.trim().length < minChars}
          >
            Post review
          </Button>
          <Typography variant="caption" color="text.secondary">
            {Math.max(0, minChars - (text.trim().length || 0))} characters to go
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}

/* ============================ Nearby beaches ============================ */
function NearbyBeaches({ beach, max = 6 }) {
  const [items, setItems] = React.useState([]);
  React.useEffect(() => {
    let live = true;
    (async () => {
      try {
        const snap = await (
          await import("firebase/firestore")
        ).getDocs(
          (
            await import("firebase/firestore")
          ).query(
            (await import("firebase/firestore")).collection(db, "beaches")
          )
        );
        const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
        const list = all
          .filter((b) => b.id !== beach.id)
          .filter(
            (b) =>
              !beach.island ||
              String(b.island || "") === String(beach.island || "")
          )
          .slice(0, max);
        if (live) setItems(list);
      } catch {
        if (live) setItems([]);
      }
    })();
    return () => {
      live = false;
    };
  }, [beach, max]);

  if (!items.length) return null;

  return (
    <Grid container spacing={2}>
      {items.map((b) => (
        <Grid key={b.id} item xs={12} sm={6}>
          <Paper
            variant="outlined"
            sx={{ borderRadius: 2, overflow: "hidden" }}
          >
            <RouterLink
              to={`/beaches/${b.id}`}
              style={{
                textDecoration: "none",
                color: "inherit",
                display: "block",
              }}
            >
              <ImageWithFallback
                name={b.name || b.slug}
                explicitUrl={b.imageUrl}
                basePath="/images/beaches"
                placeholder="/images/placeholder-restaurant.jpg"
                alt={b.name}
                sx={{
                  display: "block",
                  width: "100%",
                  height: 116,
                  objectFit: "cover",
                }}
              />
              <Box sx={{ p: 1.25 }}>
                <Typography fontWeight={800} noWrap title={b.name}>
                  {b.name}
                </Typography>
                {b.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    noWrap
                    title={b.description}
                  >
                    {b.description}
                  </Typography>
                )}
              </Box>
            </RouterLink>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}

/* =============================== page =============================== */
export default function BeachShowPage() {
  const { id } = useParams();
  const [data, setData] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const { rideTo } = useInstantRide();

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "beaches", id));
        if (!cancelled) {
          if (snap.exists()) setData({ id: snap.id, ...(snap.data() || {}) });
          else setErr("Not found");
        }
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Error loading beach");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Typography>Loading…</Typography>
      </Container>
    );
  }
  if (err || !data) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Button
          component={RouterLink}
          to="/beaches"
          startIcon={<ArrowBackIosNewIcon />}
        >
          Back to Beaches
        </Button>
        <Typography sx={{ mt: 2 }} color="error">
          Error: {err || "Not found"}
        </Typography>
      </Container>
    );
  }

  const coords = getLatLng(data);
  const F = flags(data);
  const hero =
    publicImageUrl(data.imageUrl) || "/images/placeholder-restaurant.jpg";

  const photos = Array.isArray(data.photos)
    ? data.photos.map(publicImageUrl).filter(Boolean)
    : [];
  const distinctPhotos = photos.filter((u) => u !== hero);

  const directionsUrl = coords
    ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=driving`
    : data.address || data.name
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${data.name || ""} ${data.address || ""}`.trim()
      )}`
    : null;

  const share = async () => {
    const url = toDetailHash(data.id);
    const text = `Check out ${data.name} beach in the USVI!`;
    try {
      if (navigator.share)
        await navigator.share({ title: data.name, text, url });
      else await navigator.clipboard.writeText(`${text} ${url}`);
    } catch {}
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Button
        component={RouterLink}
        to="/beaches"
        startIcon={<ArrowBackIosNewIcon />}
        size="small"
        sx={{ mb: 1 }}
      >
        Back to Beaches
      </Button>

      {/* Hero */}
      <Box sx={{ borderRadius: 3, overflow: "hidden", position: "relative" }}>
        <ImageWithFallback
          name={data.name || data.slug}
          explicitUrl={hero}
          basePath="/images/beaches"
          placeholder="/images/placeholder-restaurant.jpg"
          alt={data.name}
          sx={{
            width: "100%",
            height: { xs: 220, md: 420 },
            objectFit: "cover",
            display: "block",
          }}
        />
        {/* overlay */}
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
            {data.name}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.75 }} flexWrap="wrap">
            {data.island && (
              <Chip
                size="small"
                icon={<BeachAccessIcon />}
                label={String(data.island).toUpperCase()}
              />
            )}
            {Number(data.rating) > 0 && (
              <Chip
                size="small"
                icon={<StarIcon />}
                label={Number(data.rating).toFixed(1)}
              />
            )}
            {F.snorkel && (
              <Chip size="small" icon={<ScubaDivingIcon />} label="Snorkel" />
            )}
            {F.calm && (
              <Chip size="small" icon={<PlaceIcon />} label="Calm water" />
            )}
            {F.shade && (
              <Chip size="small" icon={<UmbrellaIcon />} label="Shade" />
            )}
            {F.family && (
              <Chip size="small" icon={<FamilyRestroomIcon />} label="Family" />
            )}
            {F.food && (
              <Chip
                size="small"
                icon={<LunchDiningIcon />}
                label="Food nearby"
              />
            )}
            {F.parking && (
              <Chip size="small" icon={<LocalParkingIcon />} label="Parking" />
            )}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            {directionsUrl && (
              <Button
                size="small"
                variant="contained"
                startIcon={<DirectionsIcon />}
                component={Link}
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
              >
                Directions
              </Button>
            )}
            {coords && (
              <InstantRideButton
                to={{ lat: coords.lat, lng: coords.lng, label: data.name }}
                island={data.island} // "STT" | "STJ" | "STX"
              >
                Ride here
              </InstantRideButton>
            )}
            <Tooltip title="Share">
              <IconButton
                size="small"
                sx={{ bgcolor: "rgba(255,255,255,.9)" }}
                onClick={share}
              >
                <ShareIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </Box>

      {/* sticky subnav */}
      <StickySubnav
        offsetTop={80}
        items={[
          { id: "photos", label: "Photos" },
          { id: "overview", label: "Overview" },
          { id: "essentials", label: "Essentials" },
          { id: "map", label: "Map" },
          { id: "reviews", label: "Reviews" },
          { id: "nearby", label: "Nearby" },
        ]}
      />

      {/* Photos */}
      <Box id="photos" sx={{ mt: 1.5, scrollMarginTop: { xs: 72, md: 92 } }}>
        {distinctPhotos.length >= 1 ? (
          <PhotoStrip photos={distinctPhotos} main={hero} />
        ) : null}
      </Box>

      {/* Row 1: Overview + Essentials */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} md={8}>
          <Section id="overview" title="Overview">
            {data.description ? (
              <Typography variant="body1">{data.description}</Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No description.
              </Typography>
            )}
          </Section>
        </Grid>
        <Grid item xs={12} md={4}>
          <Section id="essentials" title="Essentials">
            <Stack spacing={1}>
              {data.bestTime && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <AccessTimeIcon fontSize="small" />
                  <Typography variant="body2">
                    <strong>Best time:</strong> {data.bestTime}
                  </Typography>
                </Stack>
              )}
              {data.address && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <PlaceIcon fontSize="small" />
                  <Typography variant="body2">{data.address}</Typography>
                </Stack>
              )}
              {data.notes && (
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <InfoOutlinedIcon fontSize="small" sx={{ mt: 0.3 }} />
                  <Typography variant="body2">{data.notes}</Typography>
                </Stack>
              )}
            </Stack>
          </Section>
        </Grid>
      </Grid>

      {/* Map */}
      <Box id="map" sx={{ mt: 2, scrollMarginTop: { xs: 72, md: 92 } }}>
        <Section
          title="Map"
          action={
            directionsUrl && (
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
            )
          }
        >
          <Box sx={{ mb: 1 }}>
            {coords ? (
              <Box sx={{ height: 300, borderRadius: 2, overflow: "hidden" }}>
                <BeachMapWithControls
                  markers={[
                    {
                      id: data.id,
                      name: data.name,
                      lat: Number(coords.lat),
                      lng: Number(coords.lng),
                    },
                  ]}
                  focus={{ lat: Number(coords.lat), lng: Number(coords.lng) }}
                  selectedId={data.id} // ← highlight THIS beach
                  focusZoom={16}
                  minZoom={10}
                  maxZoom={18}
                  fitPadding={80}
                />
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No coordinates.{" "}
                {directionsUrl ? "Open in Maps to navigate." : ""}
              </Typography>
            )}
          </Box>
          {data.address && (
            <Typography variant="body2" color="text.secondary">
              {data.address}
            </Typography>
          )}
        </Section>
      </Box>

      {/* Reviews */}
      <Box id="reviews" sx={{ mt: 2 }}>
        <BeachReviewsPanel beachId={data.id} />
      </Box>

      {/* Nearby */}
      <Box id="nearby" sx={{ mt: 2 }}>
        <Section title="Nearby beaches">
          <NearbyBeaches beach={data} />
        </Section>
      </Box>
    </Container>
  );
}
