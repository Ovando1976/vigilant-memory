// src/pages/StaysPage.jsx
import React from "react";
import {
  collection,
  query,
  where,
  limit,
  getDocs,
  startAfter,
} from "firebase/firestore";
import PlacesPage from "./PlacesPage";
import { db } from "../lib/firebase";

/* ------------------------ helpers ------------------------ */
function normalizeFilters({ pageSize = 24 } = {}) {
  return { pageSize: Math.max(1, Math.min(50, Number(pageSize) || 24)) };
}

// Heuristic classifier for "stays" when docs aren't labeled correctly
function isStayDoc(p = {}) {
  const kind = String(p.kind || "").toLowerCase();
  if (
    [
      "stays",
      "stay",
      "lodging",
      "hotel",
      "resort",
      "accommodations",
      "accommodation",
    ].includes(kind)
  ) {
    return true;
  }
  const hay = [
    p.name,
    p.description,
    Array.isArray(p.tags) ? p.tags.join(" ") : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // hotel / resort / villa / condo / guesthouse / inn / b&b / suites / lodge / apartment
  return /\b(hotel|resort|villa|condo|guest\s?house|guesthouse|inn|b\s*&\s*b|bed\s*&\s*breakfast|lodg(e|ing)|suite[s]?|apartment|apart|hostel)\b/.test(
    hay
  );
}

/* ---------------------- data loading --------------------- */
/**
 * Attempts:
 *   1) Query places where kind == "stays"
 *   2) If empty (or very few), fall back to scanning general places and classify client-side
 */
async function loadPlacesPage(filters, afterDoc = null, opts = {}) {
  const { oversample = !afterDoc } = opts; // oversample only on first page
  const col = collection(db, "places");

  // First: the ideal query (fast, minimal reads)
  const parts = [where("kind", "==", "stays")];
  if (afterDoc) parts.push(startAfter(afterDoc));
  parts.push(limit(filters.pageSize));
  let snap = await getDocs(query(col, ...parts));
  let docs = snap.docs;

  // If nothing (common when seed data mislabels kind), scan a larger page and classify
  let fallbackUsed = false;
  if (docs.length === 0) {
    const partsAny = [];
    if (afterDoc) partsAny.push(startAfter(afterDoc));
    partsAny.push(limit(Math.max(filters.pageSize, oversample ? 96 : 32))); // oversample first page for better results
    const snapAny = await getDocs(query(col, ...partsAny));
    docs = snapAny.docs;
    fallbackUsed = true;
  }

  // Map & (optionally) classify
  let items = docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
  if (fallbackUsed) items = items.filter(isStayDoc);

  // Stable client-side sort
  items.sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""))
  );

  const lastDoc = docs.length ? docs[docs.length - 1] : null;
  console.debug(
    "[StaysPage] fetched:",
    items.length,
    "| fallback:",
    fallbackUsed,
    "| lastDoc:",
    !!lastDoc
  );
  return { items, lastDoc, fallbackUsed };
}

/* ------------------------- page -------------------------- */
export default function StaysPage() {
  const [initialItems, setInitialItems] = React.useState(null); // null while loading
  const [cursor, setCursor] = React.useState(null);
  const [filters] = React.useState(() => normalizeFilters({ pageSize: 24 }));
  const seenIdsRef = React.useRef(new Set()); // avoid duplicates across pages

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items, lastDoc } = await loadPlacesPage(filters, null, {
          oversample: true,
        });
        if (!cancelled) {
          setInitialItems(items);
          setCursor(lastDoc);
          // remember what we've already delivered
          const s = new Set(items.map((i) => i.id));
          seenIdsRef.current = s;
        }
      } catch (e) {
        console.error("loadPlaces initial error:", e?.code, e?.message);
        if (!cancelled) {
          setInitialItems([]);
          setCursor(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const loadMore = React.useCallback(async () => {
    if (!cursor) return { items: [], done: true };
    const { items, lastDoc } = await loadPlacesPage(filters, cursor);
    // de-dupe across pages
    const seen = seenIdsRef.current;
    const fresh = items.filter((i) => !seen.has(i.id));
    fresh.forEach((i) => seen.add(i.id));
    setCursor(lastDoc);
    return { items: fresh, done: !lastDoc };
  }, [cursor, filters]);

  return (
    <PlacesPage
      kind="stays"
      initialItems={initialItems}
      onLoadMore={loadMore}
    />
  );
}
