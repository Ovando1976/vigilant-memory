import * as React from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Chip,
  Stack,
  Typography,
  Tooltip,
  Button,
} from "@mui/material";

function InitialBadge({ name }) {
  const ch = (name || "?").slice(0, 1).toUpperCase();
  return (
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: 12,
        background: "linear-gradient(135deg,#0ea5e9,#22c55e)",
        display: "grid",
        placeItems: "center",
        color: "white",
        fontWeight: 900,
        fontSize: 28,
      }}
    >
      {ch}
    </div>
  );
}

export default function PeopleGrid({ people = [] }) {
  if (!people.length) return null;
  return (
    <Stack spacing={2}>
      <Typography variant="h6" fontWeight={900}>
        People
      </Typography>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
          gap: 16,
        }}
      >
        {people.map((p, i) => (
          <Card
            key={i}
            sx={{
              borderRadius: 3,
              overflow: "hidden",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {p.img ? (
              <CardMedia
                component="img"
                image={p.img}
                alt={p.name}
                sx={{ height: 168, objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  height: 168,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(0,0,0,.04)",
                }}
              >
                <InitialBadge name={p.name} />
              </div>
            )}
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" fontWeight={800}>
                {p.name}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                sx={{ my: 0.5, flexWrap: "wrap" }}
              >
                {p.dates && <Chip label={p.dates} size="small" />}
                {(p.roles || []).slice(0, 2).map((r, idx) => (
                  <Chip key={idx} label={r} size="small" variant="outlined" />
                ))}
              </Stack>
              {p.summary && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {p.summary}
                </Typography>
              )}
              {!!(p.links && p.links.length) && (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mt: 1, flexWrap: "wrap" }}
                >
                  {p.links.map((l, j) => (
                    <Tooltip title={l.url} key={j}>
                      <Button
                        size="small"
                        component="a"
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        variant="text"
                      >
                        {l.label}
                      </Button>
                    </Tooltip>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </Stack>
  );
}
