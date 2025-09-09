import * as React from "react";
import { Box, ImageList, ImageListItem, Dialog } from "@mui/material";

export default function PhotoStrip({ photos = [], main }) {
  const imgs = React.useMemo(() => {
    const arr = Array.isArray(photos) ? photos.slice() : [];
    if (main) {
      const i = arr.indexOf(main);
      if (i > -1) arr.splice(i, 1);
      arr.unshift(main);
    }
    // de-dupe, keep first 6
    const seen = new Set();
    return arr
      .filter((u) => u && !seen.has(u) && (seen.add(u), true))
      .slice(0, 6);
  }, [photos, main]);

  const [open, setOpen] = React.useState(false);
  const [src, setSrc] = React.useState(null);

  // 👈 only render when there are at least 2 images (hero + at least 1 more)
  if (!imgs || imgs.length < 2) return null;

  const cols = Math.min(imgs.length, 3);

  return (
    <>
      <ImageList cols={cols} gap={8} sx={{ m: 0 }}>
        {imgs.map((url, i) => (
          <ImageListItem
            key={i}
            sx={{ cursor: "zoom-in", borderRadius: 2, overflow: "hidden" }}
          >
            <img
              src={url}
              alt={`photo ${i + 1}`}
              loading="lazy"
              onClick={() => {
                setSrc(url);
                setOpen(true);
              }}
              onError={(e) => (e.currentTarget.style.display = "none")}
              style={{
                width: "100%",
                height: 180,
                objectFit: "cover",
                display: "block",
              }}
            />
          </ImageListItem>
        ))}
      </ImageList>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="lg">
        <Box sx={{ p: 0, bgcolor: "black" }}>
          {src && (
            <img
              src={src}
              alt="preview"
              style={{
                maxWidth: "90vw",
                maxHeight: "85vh",
                display: "block",
                margin: "auto",
                objectFit: "contain",
              }}
            />
          )}
        </Box>
      </Dialog>
    </>
  );
}
