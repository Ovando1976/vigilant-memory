## [0.4.0] - 2025-08-31
### Added
- **Island toggle authority**: pickup/dropoff lists filtered per island (STT/STJ/STX); deep-link support; auto-correct invalid selections; swap/quick presets respect island.
- **Taxi rate preview hardening**: alias normalization, island-wide fallback scan, coordinate proximity matching.
- **Checkout flow improvements**: direct Stripe Checkout URL when possible; Stripe.js fallback; improved UX/error states.
- **Route preview map styling**: themed Google Maps look (light/dark), custom markers, branded polylines.
- **Seed & migration scripts**: `normalizeTaxiAliases.cjs`, `seedBeaches.cjs`, `seedDemoEvents.cjs`.

### Changed
- `/api/rides/price/preview` updated to robustly normalize names and prevent cross-island mismatches.
- HomePage booking form improved with island-safe dropdowns and better validation.

### Security
- 🔐 Removed accidentally committed `serviceAccountKey.json` and **purged from history**.
- Added `.gitignore` rule to prevent future commits.
- Reminder: rotate the exposed Firebase key in GCP and update env config.

### Fixed
- Confirm & Pay button now reliably redirects to Stripe Checkout.
- Map preview styled to match app; no more default Google styling.

---