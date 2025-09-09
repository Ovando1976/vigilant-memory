import * as React from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Typography,
} from "@mui/material";
import { Link } from "react-router-dom";

export default function NearbyGrid({ place, max = 6 }) {
  const [items, setItems] = React.useState([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!place?.island) {
          setItems([]);
          return;
        }
        const col = collection(db, "places");
        const q = query(
          col,
          where("island", "==", String(place.island)),
          limit(48)
        );
        const snap = await getDocs(q);
        let all = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));

        // exclude the current place
        all = all.filter((p) => p.id !== place.id);

        // simple tag match (if tags exist)
        const filtered =
          Array.isArray(place.tags) && place.tags.length
            ? all.filter((p) => {
                const tags = new Set((p.tags || []).map(String));
                return place.tags.some((t) => tags.has(String(t)));
              })
            : all;

        const list = filtered.slice(0, Number(max) || 6);
        if (!cancelled) setItems(list);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [place, max]);

  if (!items.length) return null;

  return (
    <Grid container spacing={2}>
      {items.map((p) => (
        <Grid key={p.id} item xs={12} sm={6}>
          <Card sx={{ borderRadius: 2 }}>
            <CardActionArea component={Link} to={`/places/${p.id}`}>
              <CardContent sx={{ minHeight: 76 }}>
                <Typography
                  fontWeight={800}
                  noWrap
                  title={p.name || "Untitled"}
                >
                  {p.name || "Untitled"}
                </Typography>
                {p.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    noWrap
                    title={p.description}
                  >
                    {p.description}
                  </Typography>
                )}
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
