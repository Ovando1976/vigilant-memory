// src/pages/RideShortcutsPage.tsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { locationCoords } from "../../data/locationCoords";
import "../styles/usvi-ui.css"; // ensure this exists (see CSS section)

const HAS = (name) => (name ? Boolean(locationCoords[name]) : true);

const ALL_SHORTCUTS = [
  // STT
  { id: "stt-airport-town", island: "STT", from: "Cyril E. King Airport", to: "Charlotte Amalie", label: "Airport → Town", subtitle: "Fastest way into town", category: "Airport" },
  { id: "stt-havensight-magens", island: "STT", from: "Havensight Cruise Port", to: "Magens Bay", label: "Cruise Port → Magens Bay", subtitle: "Beach day favorite", category: "Beach" },
  { id: "stt-redhook-magens", island: "STT", from: "Red Hook Ferry", to: "Magens Bay", label: "Red Hook → Magens Bay", category: "Beach" },

  // STJ
  { id: "stj-cruzbay-maho", island: "STJ", from: "Cruz Bay Ferry", to: "Maho Bay", label: "Cruz Bay → Maho Bay", category: "Beach" },
  { id: "stj-cruzbay-trunk", island: "STJ", from: "Cruz Bay Ferry", to: "Trunk Bay", label: "Cruz Bay → Trunk Bay", category: "Beach" },

  // STX
  { id: "stx-christiansted-frederiksted", island: "STX", from: "Christiansted", to: "Frederiksted", label: "Christiansted → Frederiksted", category: "Town" },
  { id: "stx-christiansted-buck", island: "STX", from: "Christiansted", to: "Buck Island Ferry (STX)", label: "Christiansted → Buck Island Ferry", category: "Ferry" },
];

function buildRequestLink(s) {
  const params = new URLSearchParams();
  if (s.from) params.set("pickup", s.from);
  params.set("dropoff", s.to);
  params.set("island", s.island);
  return `/ridesharing/request?${params.toString()}`;
}

export default function RideShortcutsPage() {
  const [island, setIsland] = useState<IslandKey | "ALL">("ALL");
  const [category, setCategory] = useState<"All" | Category>("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return ALL_SHORTCUTS
      // hide any without coords
      .filter((s) => HAS(s.from) && HAS(s.to))
      // island filter
      .filter((s) => (island === "ALL" ? true : s.island === island))
      // category filter
      .filter((s) => (category === "All" ? true : s.category === category))
      // text search
      .filter((s) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          s.label.toLowerCase().includes(q) ||
          (s.subtitle || "").toLowerCase().includes(q) ||
          (s.from || "").toLowerCase().includes(q) ||
          s.to.toLowerCase().includes(q)
        );
      });
  }, [island, category, query]);

  return (
    <main className="usvi-container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <header className="usvi-stack">
        <h1 className="h4" style={{ fontSize: "2rem" }}>Ride Shortcuts</h1>
        <p className="text-secondary" style={{ maxWidth: 760 }}>
          One-tap routes to popular U.S. Virgin Islands spots. Tap a card to prefill your booking form.
        </p>

        {/* Toolbar */}
        <div className="usvi-toolbar">
          {/* Island toggle */}
          <div className="usvi-toggle" role="group" aria-label="Filter by island">
            {["ALL", "STT", "STJ", "STX"].map((k) => (
              <button
                key={k}
                aria-pressed={island === k}
                onClick={() => setIsland(k)}
              >
                {k === "ALL" ? "All Islands" : k === "STT" ? "St. Thomas" : k === "STJ" ? "St. John" : "St. Croix"}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            className="usvi-input"
            type="text"
            placeholder="Search destination…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Category pills */}
        <div className="usvi-row">
          {["All", "Airport", "Beach", "Ferry", "Town", "Sight"].map((c) => (
            <button
              key={c}
              className={`pill ${category === c ? "active" : ""}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </header>

      {/* Grid */}
      <section className="usvi-grid usvi-grid-3 mt-4">
        {filtered.length === 0 ? (
          <div className="usvi-section center" style={{ gridColumn: "1/-1" }}>
            <p className="text-secondary">No shortcuts match your filters.</p>
          </div>
        ) : (
          filtered.map((s) => (
            <Link
              key={s.id}
              to={buildRequestLink(s)}
              className="usvi-card"
              style={{ textDecoration: "none" }}
            >
              <div className="usvi-card-body">
                <div className="h6">{s.label}</div>
                <p className="text-secondary" style={{ margin: "4px 0 0" }}>
                  {s.from ? `${s.from} → ${s.to}` : `To ${s.to}`} • {s.island}
                  {s.subtitle ? ` — ${s.subtitle}` : ""}
                </p>
                <div className="usvi-row mt-2">
                  <span className="chip">{s.island}</span>
                  <span className="chip chip-outline">{s.category}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}