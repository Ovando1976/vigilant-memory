import React from "react";
import {
  Container,
  Box,
  Grid,
  Paper,
  Stack,
  Typography,
  TextField,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Chip,
  IconButton,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import PlaceIcon from "@mui/icons-material/Place";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

// simple blue marker
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function getLatLng(b) {
  const gp =
    b?.geo ||
    b?.geopoint ||
    b?.geoPoint ||
    b?.coordinates ||
    b?.coords ||
    b?.loc ||
    b?.position ||
    b?.location?.geopoint ||
    b?.location?.geo;
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
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function ClickHandler({ onSet }) {
  useMapEvents({
    click(e) {
      onSet({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function BeachPinEditor() {
  const [items, setItems] = React.useState([]);
  const [filter, setFilter] = React.useState("");
  const [sel, setSel] = React.useState(null);
  const [pin, setPin] = React.useState(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    (async () => {
      const snap = await getDocs(
        query(collection(db, "beaches"), orderBy("name"))
      );
      const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
      if (!live) return;
      setItems(arr);
      if (arr.length) {
        const first = arr[0];
        setSel(first);
        setPin(getLatLng(first) || { lat: 18.34, lng: -64.93 }); // USVI center-ish
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const list = React.useMemo(() => {
    const t = filter.trim().toLowerCase();
    if (!t) return items;
    return items.filter((b) =>
      [b.name, b.slug, b.address, b.island]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(t))
    );
  }, [items, filter]);

  const select = (b) => {
    setSel(b);
    setPin(getLatLng(b) || { lat: 18.34, lng: -64.93 });
  };

  const save = async () => {
    if (!sel || !pin) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "beaches", sel.id), {
        lat: Number(pin.lat),
        lng: Number(pin.lng),
        updatedAt: (await import("firebase/firestore")).serverTimestamp(),
      });
      // optimistic update in UI
      setSel((prev) => (prev ? { ...prev, lat: pin.lat, lng: pin.lng } : prev));
      setItems((prev) =>
        prev.map((x) =>
          x.id === sel.id ? { ...x, lat: pin.lat, lng: pin.lng } : x
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <PlaceIcon />
        <Typography variant="h6" fontWeight={900}>
          Beach Pin Editor
        </Typography>
      </Stack>
      <Grid container spacing={2}>
        {/* Left: list */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 1.5, borderRadius: 3 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <SearchIcon sx={{ opacity: 0.6 }} />
              <TextField
                size="small"
                placeholder="Search beaches…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                fullWidth
              />
              <IconButton onClick={() => setFilter("")} title="Clear filter">
                <RefreshIcon />
              </IconButton>
            </Stack>
            <List
              dense
              sx={{
                maxHeight: { xs: 260, md: "calc(100vh - 220px)" },
                overflowY: "auto",
              }}
            >
              {list.map((b) => {
                const has = !!getLatLng(b);
                return (
                  <ListItemButton
                    key={b.id}
                    selected={sel?.id === b.id}
                    onClick={() => select(b)}
                  >
                    <ListItemText
                      primary={b.name || b.slug || b.id}
                      secondary={b.island ? String(b.island).toUpperCase() : ""}
                    />
                    <Chip
                      size="small"
                      label={has ? "has pin" : "missing"}
                      color={has ? "success" : "warning"}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Paper>
        </Grid>

        {/* Right: map + controls */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 1.5, borderRadius: 3 }}>
            {sel ? (
              <>
                <Typography variant="subtitle1" fontWeight={800}>
                  {sel.name || sel.slug}{" "}
                  {sel.island ? `• ${String(sel.island).toUpperCase()}` : ""}
                </Typography>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  sx={{ my: 1 }}
                >
                  <TextField
                    label="Latitude"
                    size="small"
                    value={pin?.lat ?? ""}
                    onChange={(e) =>
                      setPin((prev) => ({
                        ...(prev || {}),
                        lat: e.target.value,
                      }))
                    }
                    sx={{ maxWidth: 220 }}
                  />
                  <TextField
                    label="Longitude"
                    size="small"
                    value={pin?.lng ?? ""}
                    onChange={(e) =>
                      setPin((prev) => ({
                        ...(prev || {}),
                        lng: e.target.value,
                      }))
                    }
                    sx={{ maxWidth: 220 }}
                  />
                  <Box sx={{ flexGrow: 1 }} />
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={save}
                    disabled={
                      !pin ||
                      isNaN(Number(pin.lat)) ||
                      isNaN(Number(pin.lng)) ||
                      saving
                    }
                  >
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </Stack>

                <Box sx={{ height: 420, borderRadius: 2, overflow: "hidden" }}>
                  <MapContainer
                    center={[
                      Number(pin?.lat) || 18.34,
                      Number(pin?.lng) || -64.93,
                    ]}
                    zoom={12}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution="&copy; OpenStreetMap"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {pin && (
                      <Marker
                        position={[Number(pin.lat), Number(pin.lng)]}
                        icon={markerIcon}
                      />
                    )}
                    <ClickHandler onSet={setPin} />
                  </MapContainer>
                </Box>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Select a beach from the list.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
