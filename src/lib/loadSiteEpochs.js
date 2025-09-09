export async function loadSiteEpochs(siteKey) {
  const base = `/src/data/sites/${siteKey}`;
  // vite/codespaces static import fallback + dynamic
  async function safeJson(path) {
    try {
      const mod = await import(/* @vite-ignore */ `${path}`, {
        assert: { type: "json" },
      });
      return mod.default || mod;
    } catch {
      try {
        const r = await fetch(path.replace("/src", "")); // server static
        if (!r.ok) return null;
        return await r.json();
      } catch {
        return null;
      }
    }
  }
  const [today, erik, danish, us, readings] = await Promise.all([
    safeJson(`${base}/today.json`),
    safeJson(`${base}/erik_smit.json`),
    safeJson(`${base}/danish_era.json`),
    safeJson(`${base}/us_era.json`),
    safeJson(`${base}/readings.json`),
  ]);
  return { today, erik, danish, us, readings };
}
