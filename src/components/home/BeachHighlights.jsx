// src/components/home/RideShortcuts.tsx
import React from "react";
import { Link } from "react-router-dom";

const destinations = [
  { name: "Magens Bay", island: "STT", slug: "magens-bay", dropoffLabel: "Magens Bay Beach (STT)" },
  { name: "Trunk Bay", island: "STJ", slug: "trunk-bay", dropoffLabel: "Trunk Bay Beach (STJ)" },
  { name: "Buck Island", island: "STX", slug: "buck-island", dropoffLabel: "Buck Island Ferry (STX)" },
];

export default function RideShortcuts() {
  return (
    <section className="mt-4">
      <h2 className="h4 mb-2">Quick Rides</h2>
      <div className="usvi-grid usvi-grid-3">
        {destinations.map((d) => (
          <Link
            key={d.slug}
            to={`/ridesharing/request?dropoff=${encodeURIComponent(d.dropoffLabel)}&island=${d.island}`}
            className="usvi-card"
            style={{ textDecoration: "none" }}
          >
            <div className="usvi-card-body">
              <div className="h6">{d.name}</div>
              <p className="text-secondary" style={{ margin: "4px 0 0" }}>
                Book a ride to {d.name} ({d.island})
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}