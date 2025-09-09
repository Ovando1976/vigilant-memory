// src/pages/ShopsPage.jsx
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

const normalizeFilters = ({ pageSize = 24 } = {}) => ({
  pageSize: Math.max(1, Math.min(50, Number(pageSize) || 24)),
});

const isShopDoc = (p = {}) => {
  const kind = String(p.kind || "").toLowerCase();
  if (/(shop|shops|shopping|store|boutique|market)/.test(kind)) return true;

  const hay = [
    p.name,
    p.description,
    Array.isArray(p.tags) ? p.tags.join(" ") : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /\b(shop|store|boutique|market|mall|gift|souvenir|duty\s*free|jewel?lery|pharmacy|grocery|supermarket|outfitter|dive\s*shop|surf\s*shop|beachwear)\b/.test(
    hay
  );
};

async function loadPlacesPage(
  filters,
  afterDoc = null,
  { oversample = !afterDoc } = {}
) {
  const col = collection(db, "places");

  const parts = [where("kind", "==", "shops")];
  if (afterDoc) parts.push(startAfter(afterDoc));
  parts.push(limit(filters.pageSize));
  let snap = await getDocs(query(col, ...parts));
  let docs = snap.docs;

  let fallbackUsed = false;
  if (docs.length === 0) {
    const anyParts = [];
    if (afterDoc) anyParts.push(startAfter(afterDoc));
    anyParts.push(limit(Math.max(filters.pageSize, oversample ? 96 : 32)));
    const snapAny = await getDocs(query(col, ...anyParts));
    docs = snapAny.docs;
    fallbackUsed = true;
  }

  let items = docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
  if (fallbackUsed) items = items.filter(isShopDoc);

  items.sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""))
  );
  const lastDoc = docs.length ? docs[docs.length - 1] : null;

  console.debug(
    "[ShopsPage] project:",
    db.app.options?.projectId,
    "| fetched:",
    items.length,
    "| fallback:",
    fallbackUsed,
    "| more:",
    !!lastDoc
  );
  return { items, lastDoc };
}

export default function ShopsPage() {
  const [initialItems, setInitialItems] = React.useState(null);
  const [cursor, setCursor] = React.useState(null);
  const [filters] = React.useState(() => normalizeFilters({ pageSize: 24 }));
  const seenIdsRef = React.useRef(new Set());

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
          seenIdsRef.current = new Set(items.map((i) => i.id));
        }
      } catch (e) {
        console.error("[ShopsPage] initial load error:", e?.code, e?.message);
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
    const seen = seenIdsRef.current;
    const fresh = items.filter((i) => !seen.has(i.id));
    fresh.forEach((i) => seen.add(i.id));
    setCursor(lastDoc);
    return { items: fresh, done: !lastDoc };
  }, [cursor, filters]);

  return (
    <PlacesPage
      kind="shops"
      initialItems={initialItems}
      onLoadMore={loadMore}
      getItemHref={(item) => `/places/${item.id}`}
    />
  );
}
