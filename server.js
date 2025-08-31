// server.js  — CommonJS, CRA proxy friendly, no Vite, no ESM
// -----------------------------------------------------------------------------
require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Readable } = require("node:stream");


//Node 18+ has global fetch & FormData. If FormData is missing, try require('form-data').
const fetch = global.fetch || ((...a) => require('node-fetch')(...a)); // only used if really needed
let FormDataCtor = global.FormData;
try { if (!FormDataCtor) FormDataCtor = require('form-data'); } catch { /* optional */ }

const logger = (() => {
  try {
    // If you have a custom logger module, use it; else console.
    // eslint-disable-next-line global-require
    return require("./logger");
  } catch {
    return console;
  }
})();

/* ----------------------------- Strict config ------------------------------ */
const PORT = Number(process.env.PORT || 5001);
const BASE_CLIENT_URL = process.env.BASE_CLIENT_URL || "http://localhost:3000";
const MIN_CHARGE_CENTS = 50;
const DEV_NO_STRICT_DB = process.env.NODE_ENV !== "production";
const WRITE_ESTIMATED_RATES =
  String(process.env.WRITE_ESTIMATED_RATES || "false").toLowerCase() === "true";

/* -------------------------------- Stripe --------------------------------- */
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  logger.error("STRIPE_SECRET_KEY is not defined.");
  process.exit(1);
}
if (!/^sk_(test|live)_/.test(STRIPE_SECRET_KEY)) {
  logger.error(
    `[Stripe] STRIPE_SECRET_KEY must start with sk_test_ or sk_live_. Got: ${
      STRIPE_SECRET_KEY ? STRIPE_SECRET_KEY.slice(0, 8) + "…" : "(empty)"
    }`
  );
  process.exit(1);
}
const stripe = require("stripe")(STRIPE_SECRET_KEY);

/* -------------------------------- OpenAI --------------------------------- */
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  logger.warn("⚠️  OPENAI_API_KEY is not defined; /api/chat* will return 500.");
}
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/* ----------------------------- Firebase Admin ----------------------------- */
let db = null;
let adminInfo = {
  initialized: false,
  credSource: "unknown",
  projectId: null,
  database: "(default)",
};

try {
  const admin = require("firebase-admin");

  const svcJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const svcB64 =
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ||
    process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  const gacPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  let projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    null;

  let credential = null;

  if (svcJson) {
    const parsed = JSON.parse(svcJson);
    credential = admin.credential.cert(parsed);
    adminInfo.credSource = "env:json";
    projectId ||= parsed.project_id || null;
    logger.info("Firebase Admin: using FIREBASE_SERVICE_ACCOUNT_JSON");
  } else if (svcB64) {
    const parsed = JSON.parse(Buffer.from(svcB64, "base64").toString("utf8"));
    credential = admin.credential.cert(parsed);
    adminInfo.credSource = "env:base64";
    projectId ||= parsed.project_id || null;
    logger.info("Firebase Admin: using FIREBASE_SERVICE_ACCOUNT_BASE64");
  } else if (gacPath && fs.existsSync(gacPath)) {
    let parsed = null;
    try {
      parsed = JSON.parse(fs.readFileSync(gacPath, "utf8"));
    } catch {}
    if (parsed?.type === "service_account") {
      credential = admin.credential.cert(parsed);
      projectId ||= parsed.project_id || null;
    } else {
      credential = admin.credential.applicationDefault();
    }
    adminInfo.credSource = `file:${gacPath}`;
    logger.info(
      `Firebase Admin: using GOOGLE_APPLICATION_CREDENTIALS at ${gacPath}`
    );
  } else {
    credential = admin.credential.applicationDefault();
    adminInfo.credSource = "adc";
    logger.warn("Firebase Admin: relying on ADC/GCP.");
  }

  const initOpts = credential ? { credential } : {};
  if (projectId) initOpts.projectId = projectId;
  admin.initializeApp(initOpts);

  db = admin.firestore();
  adminInfo.initialized = true;
  adminInfo.projectId = projectId || admin.app().options?.projectId || null;
  try {
    adminInfo.database = db?._databaseId?.database || "(default)";
  } catch {}
  logger.info("Firebase Admin initialised.");
} catch (err) {
  logger.warn("⚠️  Firebase Admin not initialised:", err.message);
  db = null;
}

/* --------------------------------- App ----------------------------------- */
const app = express();
app.set("trust proxy", 1);

// CORS allowlist for dev
const ALLOWED_ORIGINS = [
  BASE_CLIENT_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  /\.github\.dev$/i,
];
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      const ok = ALLOWED_ORIGINS.some((o) =>
        typeof o === "string" ? o === origin : o.test(origin)
      );
      cb(ok ? null : new Error("CORS blocked"));
    },
    credentials: true,
  })
);

// Security headers + rate limit
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/* ---------------- Stripe Webhook (raw) must be before JSON parser -------- */
app.post(
  "/api/stripe-webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    let event = req.body;
    try {
      if (secret) {
        const sig = req.headers["stripe-signature"];
        event = stripe.webhooks.constructEvent(req.body, sig, secret);
      }
    } catch (e) {
      logger.error("Webhook signature verify failed:", e.message);
      return res.sendStatus(400);
    }
    // TODO: handle events e.g., payment_intent.succeeded, checkout.session.completed
    res.json({ received: true });
  }
);

// JSON body for normal routes
app.use(express.json({ limit: "1mb" }));

/* ---------------- Static (optional public hosting by API) ----------------- */
app.use(
  "/ai",
  express.static(path.join(__dirname, "public", "ai"), {
    maxAge: "7d",
    fallthrough: true,
  })
);
app.use(
  "/images",
  express.static(path.join(__dirname, "public", "images"), {
    maxAge: "7d",
    fallthrough: true,
  })
);

/* --------------------------- Health / Firebase ---------------------------- */
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, env: process.env.NODE_ENV || "development" })
);
app.get("/api/firebase-info", (_req, res) => res.json(adminInfo));
app.get("/api/firebase-name", (_req, res) => {
  const name = adminInfo.projectId
    ? `projects/${adminInfo.projectId}/databases/${
        adminInfo.database || "(default)"
      }`
    : null;
  res.json({ name });
});

/* ------------------------------- OpenAI Chat ------------------------------ */
app.post("/api/chat", async (req, res) => {
  try {
    if (!OPENAI_API_KEY)
      return res.status(500).json({ error: "openai_key_missing" });
    const { messages = [], model = DEFAULT_MODEL, temperature = 0.7 } =
      req.body || {};
    if (!Array.isArray(messages) || messages.length === 0)
      return res.status(400).json({ error: "messages_required" });

    const r = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, temperature }),
    });

    if (!r.ok) {
      const detail = await safeJson(r);
      logger.error("OpenAI /chat error:", r.status, detail);
      return res
        .status(502)
        .json({ error: "openai_bad_gateway", status: r.status, detail });
    }

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    const requestId = r.headers.get("x-request-id");
    res.json({ text, model: data?.model || model, usage: data?.usage, requestId });
  } catch (err) {
    logger.error("POST /api/chat error:", err);
    res
      .status(500)
      .json({ error: "server_error", detail: String(err?.message || err) });
  }
});

/* ------------------------- Chat (SSE passthrough) ------------------------- */
app.post("/api/chat/stream", async (req, res) => {
  if (!OPENAI_API_KEY) {
    res.writeHead(500, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "openai_key_missing" }));
  }
  const {
    messages = [],
    model = DEFAULT_MODEL,
    temperature = 0.7,
    max_tokens = 128,
  } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "messages_required" }));
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  if (typeof res.flushHeaders === "function") res.flushHeaders();
  req.setTimeout(0);

  const ping = setInterval(() => res.write(`: ping\n\n`), 15000);
  const ctrl = new AbortController();

  try {
    const upstream = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens, stream: true }),
      signal: ctrl.signal,
    });

    if (!upstream.ok || !upstream.body) {
      const detail = await safeJson(upstream);
      res.write(
        `event: error\ndata: ${JSON.stringify({
          status: upstream.status,
          detail,
        })}\n\n`
      );
      clearInterval(ping);
      return res.end();
    }

    const nodeStream = Readable.fromWeb(upstream.body);
    nodeStream.on("data", (chunk) => res.write(chunk));
    nodeStream.on("end", () => {
      clearInterval(ping);
      res.end();
    });
    nodeStream.on("error", (err) => {
      res.write(
        `event: error\ndata: ${JSON.stringify({
          message: String(err?.message || err),
        })}\n\n`
      );
      clearInterval(ping);
      res.end();
    });

    req.on("close", () => {
      try {
        nodeStream.destroy();
      } catch {}
      ctrl.abort();
      clearInterval(ping);
    });
  } catch (err) {
    res.write(
      `event: error\ndata: ${JSON.stringify({
        message: String(err?.message || err),
      })}\n\n`
    );
    clearInterval(ping);
    res.end();
  }
});

/* ----------------------- Chat (SSE normalized delta) ---------------------- */
app.post("/api/chat/stream-delta", async (req, res) => {
  if (!OPENAI_API_KEY) {
    res.writeHead(500, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "openai_key_missing" }));
  }
  const {
    messages = [],
    model = DEFAULT_MODEL,
    temperature = 0.7,
    max_tokens = 128,
  } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "messages_required" }));
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  if (typeof res.flushHeaders === "function") res.flushHeaders();
  req.setTimeout(0);

  const ping = setInterval(() => res.write(`: ping\n\n`), 15000);
  const send = (evt, obj) =>
    res.write(`event: ${evt}\ndata: ${JSON.stringify(obj)}\n\n`);

  const ctrl = new AbortController();
  let clientClosed = false;
  req.on("close", () => {
    clientClosed = true;
    ctrl.abort();
    clearInterval(ping);
  });

  try {
    const upstream = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens, stream: true }),
      signal: ctrl.signal,
    });

    if (!upstream.ok || !upstream.body) {
      const detail = await safeJson(upstream);
      send("error", { status: upstream.status, detail });
      clearInterval(ping);
      return res.end();
    }

    const node = Readable.fromWeb(upstream.body);
    let buf = "";

    const findSep = (s) => {
      const a = s.indexOf("\n\n");
      const b = s.indexOf("\r\n\r\n");
      if (a === -1) return b;
      if (b === -1) return a;
      return Math.min(a, b);
    };

    const handleFrame = (frame) => {
      const lines = frame.split(/\r?\n/);
      const dataParts = [];
      for (const raw of lines) {
        const line = raw.trim();
        if (!line || line.startsWith(":")) continue;
        if (line.startsWith("data:")) dataParts.push(line.slice(5).trim());
      }
      const data = dataParts.join("\n");
      if (!data) return false;
      if (data === "[DONE]") {
        send("done", {});
        return true;
      }
      try {
        const json = JSON.parse(data);
        const delta = json?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length) send("delta", { text: delta });
      } catch {}
      return false;
    };

    node.on("data", (chunk) => {
      if (clientClosed) return;
      buf += chunk.toString("utf8");
      while (true) {
        const sep = findSep(buf);
        if (sep === -1) break;
        const sepLen =
          buf.slice(sep, sep + 4) === "\r\n\r\n" ? 4 : 2;
        const frame = buf.slice(0, sep);
        buf = buf.slice(sep + sepLen);
        const end = handleFrame(frame);
        if (end) {
          clearInterval(ping);
          res.end();
          try {
            node.destroy();
          } catch {}
          return;
        }
      }
    });
    node.on("end", () => {
      if (buf.trim()) handleFrame(buf);
      clearInterval(ping);
      res.end();
    });
    node.on("error", (err) => {
      send("error", { message: String(err?.message || err) });
      clearInterval(ping);
      res.end();
    });
  } catch (err) {
    if (!ctrl.signal.aborted) send("error", { message: String(err?.message || err) });
    clearInterval(ping);
    res.end();
  }
});

/* ------------------------- Realtime (SDP + token) ------------------------- */
// IMPORTANT: text parser ONLY for this route (not global)
app.post(
  "/session",
  express.text({ type: "*/*", limit: "1mb" }),
  async (req, res) => {
    try {
      const sessionConfig = JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-realtime",
          audio: { output: { voice: "marin" } },
        },
      });

      const fd = new FormDataCtor();
      fd.set("sdp", req.body);
      fd.set("session", sessionConfig);

      const r = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: { "OpenAI-Beta": "realtime=v1", Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: fd,
      });
      const sdp = await r.text();
      res.send(sdp);
    } catch (e) {
      logger.error("SDP session error:", e);
      res.status(500).send("SDP error");
    }
  }
);

app.get("/token", async (_req, res) => {
  try {
    const sessionConfig = JSON.stringify({
      session: {
        type: "realtime",
        model: "gpt-realtime",
        audio: { output: { voice: "marin" } },
      },
    });
    const r = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: sessionConfig,
    });
    const data = await r.json();
    res.json(data);
  } catch (error) {
    logger.error("Token generation error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

/* ---------------- Address/coords -> canonical location + pricing ----- */
const ISLAND_LABEL = { STT: "St. Thomas", STJ: "St. John", STX: "St. Croix" };
const LABEL_TO_CODE = {
  "st. thomas": "STT",
  "st thomas": "STT",
  STT: "STT",
  "st. john": "STJ",
  "st john": "STJ",
  STJ: "STJ",
  "st. croix": "STX",
  "st croix": "STX",
  STX: "STX",
};
const norm = (s = "") =>
  s
    .toString()
    .normalize("NFKD")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
const slug = (s = "") =>
  s
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const toCode = (island) => {
  if (!island) return null;
  const key = String(island).trim().toLowerCase();
  return LABEL_TO_CODE[key] || LABEL_TO_CODE[String(island).trim()] || null;
};
const codeFromCoords = ({ lat, lng }) =>
  lat < 18.0 ? "STX" : lng > -64.84 ? "STJ" : "STT";
function haversineKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371,
    dLat = toRad(b.lat - a.lat),
    dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2),
    s2 = Math.sin(dLng / 2);
  const aa =
    s1 * s1 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(aa));
}
const estMinutes = (a, b) =>
  Math.max(10, Math.round((haversineKm(a, b) / 28) * 60));
const ALIASES = {
  "havensight": "Yacht Haven - Havensight",
  "havensight cruise port": "Yacht Haven - Havensight",
  "yacht haven": "Yacht Haven - Havensight",
  "yacht haven grande": "Yacht Haven - Havensight",
  "airport": "Cyril E. King Airport",
  "cek airport": "Cyril E. King Airport",
  "cyril e king": "Cyril E. King Airport",
  "cyril e. king": "Cyril E. King Airport",
  "charlotte amalie downtown": "Charlotte Amalie",
  "red hook ferry": "Red Hook",
  "cruz bay ferry": "Cruz Bay",
  "bolongo": "Bolongo Bay",
  "magens": "Magens Bay",
  "magen's": "Magens Bay",
  "secret harbour": "Secret Harbor",
  // add more if dropdowns differ from Firestore docs
};
let LOCS = { STT: [], STJ: [], STX: [] };

async function loadLocationsIndex() {
  if (!db) return;
  const tmp = { STT: [], STJ: [], STX: [] };
  const snap = await db.collection("locations").limit(5000).get();
  snap.forEach((d) => {
    const x = d.data() || {};
    const name = x.name ? String(x.name) : null;
    const lat = x.lat ?? x.coordinates?.lat;
    const lng = x.lng ?? x.coordinates?.lng;
    const code =
      toCode(x.island) ||
      (Number.isFinite(lat) && Number.isFinite(lng)
        ? codeFromCoords({ lat, lng })
        : null);
    if (name && Number.isFinite(lat) && Number.isFinite(lng) && code) {
      tmp[code].push({ name, lat, lng });
    }
  });
  LOCS = tmp;
  logger.info(
    `[locations] Loaded index: STT=${LOCS.STT.length}, STJ=${LOCS.STJ.length}, STX=${LOCS.STX.length}`
  );
}
if (db) {
  loadLocationsIndex().catch(() => {});
  setInterval(() => loadLocationsIndex().catch(() => {}), 5 * 60 * 1000);
}
function resolveAlias(n) {
  return ALIASES[n] || null;
}
function findByName(code, name) {
  const list = LOCS[code] || [];
  const N = norm(name).toLowerCase();
  let f = list.find((x) => norm(x.name).toLowerCase() === N);
  if (f) return { ...f, code };
  const ali = resolveAlias(N);
  if (ali) {
    f = list.find(
      (x) => norm(x.name).toLowerCase() === norm(ali).toLowerCase()
    );
    if (f) return { ...f, code };
  }
  f = list.find((x) => norm(x.name).toLowerCase().includes(N));
  return f ? { ...f, code } : null;
}
function nearestInIsland(code, coords, maxKm = 5) {
  const list = LOCS[code] || [];
  let best = null,
    min = Infinity;
  for (const loc of list) {
    const d = haversineKm(coords, loc);
    if (d < min) {
      min = d;
      best = loc;
    }
  }
  return best && min <= maxKm ? { ...best, km: min, code } : null;
}
async function resolveToCanonical({ name, coords, island }) {
  let code = toCode(island) || (coords ? codeFromCoords(coords) : null);
  if (!code) {
    for (const c of ["STT", "STJ", "STX"]) {
      const got = name ? findByName(c, name) : null;
      if (got) return got;
    }
    return null;
  }
  if (coords) {
    const near = nearestInIsland(code, coords);
    if (near) return near;
  }
  if (name) {
    const byName = findByName(code, name);
    if (byName) return byName;
  }
  return null;
}
const makeRouteId = (code, fromName, toName) =>
  `${code}-${slug(fromName)}__${slug(toName)}`;
function priceForPax(rateDoc, pax = 1) {
  const base = Number(
    rateDoc.rateOne ?? rateDoc.baseFare ?? rateDoc.fare ?? 0
  );
  const per = Number(rateDoc.rateTwoPlus ?? rateDoc.perExtra ?? 0);
  const included = Number(rateDoc.included ?? 1);
  const extras = Math.max(0, pax - included);
  return Math.max(0, Math.round((base + extras * per) * 100));
}
async function synthesizePriceFromAnchors(code, fromName, toName) {
  const hub = { STT: "Charlotte Amalie", STJ: "Cruz Bay", STX: "Christiansted" }[
    code
  ];
  const alt = { STT: "Cyril E. King Airport", STJ: "Cruz Bay", STX: "Frederiksted" }[
    code
  ];
  const get = async (a, b) => {
    const id = makeRouteId(code, a, b);
    const d = await db.collection("taxiRates").doc(id).get();
    return d.exists ? { id: d.id, ...(d.data() || {}) } : null;
  };
  const [AtoHub, BtoHub, AtoAlt, BtoAlt] = await Promise.all([
    get(fromName, hub),
    get(toName, hub),
    get(fromName, alt),
    get(toName, alt),
  ]);
  const base = Math.max(
    Number(AtoHub?.rateOne ?? 0),
    Number(BtoHub?.rateOne ?? 0),
    Number(AtoAlt?.rateOne ?? 0),
    Number(BtoAlt?.rateOne ?? 0),
    { STT: 10, STJ: 8, STX: 12 }[code]
  );
  const per = Math.max(
    Number(AtoHub?.rateTwoPlus ?? 0),
    Number(BtoHub?.rateTwoPlus ?? 0),
    Number(AtoAlt?.rateTwoPlus ?? 0),
    Number(BtoAlt?.rateTwoPlus ?? 0),
    Math.round(base * 0.66),
    4
  );
  return { rateOne: base, rateTwoPlus: per, included: 1, estimated: true };
}
async function lookupRateDoc(code, fromName, toName) {
  const routeId = makeRouteId(code, fromName, toName);
  const direct = await db.collection("taxiRates").doc(routeId).get();
  if (direct.exists) return { id: direct.id, ...(direct.data() || {}) };
  const q = await db
    .collection("taxiRates")
    .where("island", "==", code)
    .where("from", "==", fromName)
    .limit(5)
    .get();
  for (const d of q.docs) {
    const r = d.data() || {};
    if (norm(r.to) === norm(toName)) return { id: d.id, ...r };
  }
  const synth = await synthesizePriceFromAnchors(code, fromName, toName);
  synth.id = null;
  return synth;
}
async function maybeCacheEstimatedRate({
  code,
  fromName,
  toName,
  fromC,
  toC,
  durationMin,
  priceDoc,
}) {
  if (!WRITE_ESTIMATED_RATES || priceDoc.id) return null;
  const admin = require("firebase-admin");
  const id = makeRouteId(code, fromName, toName);
  const ref = db.collection("taxiRates").doc(id);
  const payload = {
    from: fromName,
    to: toName,
    island: code,
    rateOne: priceDoc.rateOne,
    rateTwoPlus: priceDoc.rateTwoPlus,
    included: priceDoc.included ?? 1,
    durationMin,
    fromCoords: fromC,
    toCoords: toC,
    coordinates: fromC,
    estimated: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await ref.set(payload, { merge: false });
  return id;
}

/* ----------------------------- Ride APIs --------------------------------- */
app.post("/api/resolve-route", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: "firestore_unavailable" });
    const {
      pickup,
      dropoff,
      pickupText,
      dropoffText,
      pickupCoords,
      dropoffCoords,
      island,
    } = req.body || {};
    const from = await resolveToCanonical({
      name: pickup || pickupText,
      coords: pickupCoords,
      island,
    });
    const to = await resolveToCanonical({
      name: dropoff || dropoffText,
      coords: dropoffCoords,
      island,
    });
    if (!from || !to) return res.status(400).json({ error: "location_not_found" });
    if (from.code !== to.code)
      return res.status(400).json({ error: "cross_island_not_supported" });
    res.json({
      island: from.code,
      from: { name: from.name, lat: from.lat, lng: from.lng },
      to: { name: to.name, lat: to.lat, lng: to.lng },
      routeId: makeRouteId(from.code, from.name, to.name),
      durationMin: estMinutes(
        { lat: from.lat, lng: from.lng },
        { lat: to.lat, lng: to.lng }
      ),
    });
  } catch (e) {
    logger.error("resolve-route error:", e);
    res.status(500).json({ error: "server_error" });
  }
});

/* ----------------- Preview price (names or coords) ------------------- */
app.post('/api/rides/price/preview', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'firestore_unavailable' });

    const {
      pickup,
      dropoff,
      passengerCount,
      pax,
      island,
      pickupCoords,
      dropoffCoords,
    } = req.body || {};

    // ---------- helpers ----------
    const N = (s) => String(s || '').normalize('NFKD')
      .replace(/[’‘]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    const toRad = (d) => (d * Math.PI) / 180;
    const havKm = (a, b) => {
      if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return Infinity;
      const R = 6371;
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const s1 = Math.sin(dLat / 2), s2 = Math.sin(dLng / 2);
      const aa = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
      return 2 * R * Math.asin(Math.sqrt(aa));
    };

    // Map many common variants to the dropdown canonicals used in your UI
    const aliasMap = {
      'havensight': 'Yacht Haven - Havensight',
      'havensight (crossroad)': 'Yacht Haven - Havensight',
      'havensight cruise port': 'Yacht Haven - Havensight',
      'yacht haven': 'Yacht Haven - Havensight',
      'yacht haven grande': 'Yacht Haven - Havensight',
      'airport': 'Cyril E. King Airport',
      'cek airport': 'Cyril E. King Airport',
      'cyril e king': 'Cyril E. King Airport',
      'cyril e. king': 'Cyril E. King Airport',
      'charlotte amalie downtown': 'Charlotte Amalie',
      'red hook ferry': 'Red Hook',
      'cruz bay ferry': 'Cruz Bay',
      'bolongo bay': 'Bolongo',
      'magens': 'Magens Bay',
      "magen's": 'Magens Bay',
      'secret harbour': 'Secret Harbor',
    };
    const alias = (s) => {
      const k = N(s).toLowerCase();
      return aliasMap[k] || N(s);
    };

    // Normalize incoming names
    const fromName = alias(pickup);
    const toName = alias(dropoff);

    // Passengers
    const p = Number.isFinite(Number(passengerCount))
      ? Number(passengerCount)
      : Number.isFinite(Number(pax))
        ? Number(pax)
        : 1;

    // Normalize island code quickly
    const toCodeQuick = (v) => {
      const s = N(v).toUpperCase().replace(/\./g, '').replace(/\s+/g, ' ');
      if (['STT', 'STJ', 'STX'].includes(s)) return s;
      if (s === 'ST THOMAS') return 'STT';
      if (s === 'ST JOHN') return 'STJ';
      if (s === 'ST CROIX') return 'STX';
      return null;
    };
    const islCode = toCodeQuick(island);

    const col = db.collection('taxiRates');
    let candidates = [];

    // Strategy 1: island-wide scan, compare normalized strings in JS (robust)
    if (islCode) {
      const snap = await col.where('island', '==', islCode).limit(3500).get();
      const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));

      const NF = (s) => N(s).toLowerCase(); // normalized lowercase

      // exact normalized match first
      candidates = docs.filter((r) => NF(r.from) === NF(fromName) && NF(r.to) === NF(toName));

      // fallback: reversed match (data might be B->A)
      if (candidates.length === 0) {
        candidates = docs.filter((r) => NF(r.from) === NF(toName) && NF(r.to) === NF(fromName));
      }

      // fallback: if still none, leave candidates = docs for coord scoring below
      if (candidates.length === 0 && pickupCoords && dropoffCoords) {
        candidates = docs;
      }
    } else {
      // No island provided: try name-based direct scans (still normalize in JS)
      let snap = await col.where('from', '==', fromName).limit(500).get();
      let docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
      candidates = docs.filter((r) => N(r.to) === N(toName));

      if (candidates.length === 0) {
        snap = await col.where('from', '==', toName).limit(500).get();
        docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
        candidates = docs.filter((r) => N(r.to) === N(fromName));
      }
    }

    // If we have coordinates & a pool, pick the best by proximity
    let chosen = null;
    if (pickupCoords && dropoffCoords && candidates.length) {
      let best = null;
      for (const r of candidates) {
        const fC = r.fromCoords || r.coordinates || null;
        const tC = r.toCoords || null;
        if (!fC || !tC) continue;
        const forward = havKm(pickupCoords, fC) + havKm(dropoffCoords, tC);
        const reverse = havKm(pickupCoords, tC) + havKm(dropoffCoords, fC);
        const score = Math.min(forward, reverse);
        if (!best || score < best.score) best = { score, r };
      }
      // 1.2km total detour threshold as before
      if (best && best.score <= 1.2) chosen = { ...best.r };
    }

    // If not determined by coords, prefer exact normalized match
    if (!chosen && candidates.length > 0) {
      const NF = (s) => N(s).toLowerCase();
      const exact = candidates.filter((r) => NF(r.from) === NF(fromName) && NF(r.to) === NF(toName));
      const list = exact.length ? exact : candidates;

      // Prefer the doc whose minPassengers <= p and is the highest among those (your original rule)
      for (const r of list) {
        const min = Number.isFinite(+r.minPassengers) ? +r.minPassengers : 1;
        if (min <= p && (!chosen || min > (chosen.minPassengers || 1))) {
          chosen = { ...r, minPassengers: min };
        }
      }
      if (!chosen) chosen = { ...list[0], minPassengers: 1 };
    }

    if (!chosen) return res.status(404).json({ error: 'rate_not_found' });

    // Compute fare
    const baseFare = Number(chosen.baseFare ?? chosen.fare ?? chosen.rateOne ?? 0);
    const perExtra = Number(chosen.perExtra ?? chosen.rateTwoPlus ?? 0);
    const included = Number.isFinite(+chosen.included) ? +chosen.included : 1;
    const extras = Math.max(0, p - included);
    const fare = baseFare + extras * perExtra;

    const duration = Number.isFinite(+chosen.durationMin) ? +chosen.durationMin : 15;
    const amountCents = Math.max(0, Math.round(fare * 100));

    return res.json({
      amountCents,
      durationMin: duration,
      rateId: chosen.id,
      estimated: !!chosen.estimated,
    });
  } catch (err) {
    logger.error('Price preview error:', err);
    res.status(500).json({ error: 'server_error', message: String(err?.message || err) });
  }
});

app.post("/api/rides/price", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: "firestore_unavailable" });
    const { rideId, force = false } = req.body || {};
    if (typeof rideId !== "string" || !rideId.trim())
      return res.status(400).json({ error: "invalid_ride_id" });

    const rideRef = db.collection("rideRequests").doc(rideId);
    const rideSnap = await rideRef.get();
    if (!rideSnap.exists)
      return res.status(404).json({ error: "ride_not_found" });

    const ride = rideSnap.data() || {};
    if (Number.isInteger(ride.amountCents) && !force)
      return res.json({
        amountCents: ride.amountCents,
        durationMin: ride.durationMin ?? null,
        cached: true,
      });

    const pax = Number.isFinite(ride.passengerCount) ? ride.passengerCount : 1;
    const island = ride.island || null;
    const from = await resolveToCanonical({
      name: ride.pickup,
      coords: ride.pickupCoords,
      island,
    });
    const to = await resolveToCanonical({
      name: ride.dropoff,
      coords: ride.dropoffCoords,
      island,
    });
    if (!from || !to) return res.status(400).json({ error: "location_not_found" });
    if (from.code !== to.code)
      return res.status(400).json({ error: "cross_island_not_supported" });

    const rate = await lookupRateDoc(from.code, from.name, to.name);
    const amountCents = priceForPax(rate, pax);
    const durationMin = Number.isFinite(Number(rate.durationMin))
      ? Number(rate.durationMin)
      : estMinutes(
          { lat: from.lat, lng: from.lng },
          { lat: to.lat, lng: to.lng }
        );
    if (!Number.isFinite(amountCents))
      return res.status(404).json({ error: "rate_not_found" });

    let routeId = rate.id;
    if (!routeId) {
      routeId =
        (await maybeCacheEstimatedRate({
          code: from.code,
          fromName: from.name,
          toName: to.name,
          fromC: { lat: from.lat, lng: from.lng },
          toC: { lat: to.lat, lng: to.lng },
          durationMin,
          priceDoc: rate,
        }).catch(() => null)) || makeRouteId(from.code, from.name, to.name);
    }

    const admin = require("firebase-admin");
    await rideRef.update({
      amountCents,
      durationMin,
      islandCode: from.code,
      fromCanonical: from.name,
      toCanonical: to.name,
      routeId,
      estimatedPrice: !!rate.estimated,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      amountCents,
      durationMin,
      rateId: routeId,
      estimated: !!rate.estimated,
    });
  } catch (err) {
    logger.error("Price endpoint error:", err);
    res.status(500).json({ error: "server_error", message: String(err?.message || err) });
  }
});

/* ------------------------------- Directions ------------------------------ */
const DIRECTIONS_BASE =
  process.env.DIRECTIONS_BASE || "https://router.project-osrm.org";
const DIRECTIONS_CACHE_TTL = 30 * 1000;
const _dirCache = new Map();
const _cacheGet = (map, key) => {
  const hit = map.get(key);
  if (!hit) return null;
  if (Date.now() > hit.exp) {
    map.delete(key);
    return null;
  }
  return hit.val;
};
const _cachePut = (map, key, val, ttl) =>
  map.set(key, { val, exp: Date.now() + ttl });

app.post("/api/directions", async (req, res) => {
  try {
    const { waypoints, profile = "driving" } = req.body || {};
    if (!Array.isArray(waypoints) || waypoints.length < 2)
      return res.status(400).json({ error: "invalid_waypoints" });
    const coords = waypoints
      .map((w) => `${Number(w.lng)},${Number(w.lat)}`)
      .join(";");
    const url = `${DIRECTIONS_BASE}/route/v1/${profile}/${coords}?overview=full&steps=false&geometries=geojson&alternatives=false&annotations=duration,distance`;
    const cacheKey = `osrm|${profile}|${coords}`;
    const cached = _cacheGet(_dirCache, cacheKey);
    if (cached) return res.json(cached);

    const r = await fetch(url, { headers: { "User-Agent": "USVI-Explorer/1.0" } });
    if (!r.ok) {
      const detail = await safeJson(r);
      return res.status(502).json({ error: "directions_upstream", detail });
    }
    const data = await r.json();
    const route = data?.routes?.[0];
    if (!route) return res.status(404).json({ error: "route_not_found" });

    const out = {
      provider: "osrm",
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
      geometry: route.geometry,
      bbox: data.waypoints?.map((w) => w.location) || null,
    };
    _cachePut(_dirCache, cacheKey, out, DIRECTIONS_CACHE_TTL);
    res.json(out);
  } catch (err) {
    logger.error("directions error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

/* -------------------------------- Geocode -------------------------------- */
const MAPBOX_TOKEN =
  process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || null;
const GEOCODE_CACHE_TTL = 60 * 1000;
const _geoCache = new Map();

app.get("/api/geocode", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const limit = Math.max(1, Math.min(10, parseInt(req.query.limit || "5", 10)));
    if (!q) return res.status(400).json({ error: "query_required" });
    const cacheKey = `geocode|${MAPBOX_TOKEN ? "mb" : "nominatim"}|${limit}|${q.toLowerCase()}`;
    const cached = _cacheGet(_geoCache, cacheKey);
    if (cached) return res.json(cached);

    let features = [];
    if (MAPBOX_TOKEN) {
      const mbUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        q
      )}.json?limit=${limit}&country=vi&access_token=${MAPBOX_TOKEN}`;
      const r = await fetch(mbUrl);
      if (!r.ok) {
        const detail = await safeJson(r);
        return res.status(502).json({ error: "geocode_upstream", detail });
      }
      const data = await r.json();
      features = (data.features || []).map((f) => ({
        name: f.place_name,
        lat: f.center?.[1],
        lng: f.center?.[0],
        raw: f,
      }));
    } else {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=${limit}&country=U.S.%20Virgin%20Islands&q=${encodeURIComponent(
        q
      )}`;
      const r = await fetch(nomUrl, {
        headers: {
          "User-Agent": "USVI-Explorer/1.0 (demo; contact admin@yourdomain)",
        },
      });
      if (!r.ok) {
        const detail = await safeJson(r);
        return res.status(502).json({ error: "geocode_upstream", detail });
      }
      const data = await r.json();
      features = (data || []).map((f) => ({
        name: f.display_name,
        lat: Number(f.lat),
        lng: Number(f.lon),
        raw: f,
      }));
    }
    const out = { features };
    _cachePut(_geoCache, cacheKey, out, GEOCODE_CACHE_TTL);
    res.json(out);
  } catch (err) {
    logger.error("geocode error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

/* ---------------------- Stripe: Payment Intents --------------------------- */
app.post("/api/create-payment-intent", async (req, res) => {
  try {
    const {
      amount,
      items = [],
      currency = "usd",
      customerEmail,
      metadata = {},
      capture_method = "automatic",
    } = req.body || {};

    const calc = (body) => {
      if (Array.isArray(body.items) && body.items.length) {
        return body.items.reduce(
          (sum, it) =>
            sum +
            Math.max(0, Math.floor(Number(it.amount || 0))) *
              Math.max(1, Number(it.quantity || 1)),
          0
        );
      }
      return Math.max(0, Math.floor(Number(body.amount || 0)));
    };

    const orderAmount = calc({ amount, items });
    if (!Number.isInteger(orderAmount) || orderAmount < MIN_CHARGE_CENTS)
      return res.status(400).json({ error: "invalid_amount" });

    const cleanMeta = Object.fromEntries(
      Object.entries(metadata || {}).map(([k, v]) => [k, String(v)])
    );

    const params = {
      amount: orderAmount,
      currency: String(currency || "usd").toLowerCase(),
      automatic_payment_methods: { enabled: true },
      capture_method,
      metadata: cleanMeta,
      description:
        items?.[0]?.name || cleanMeta.description || "USVI Explorer Checkout",
    };
    if (
      typeof customerEmail === "string" &&
      /\S+@\S+\.\S+/.test(customerEmail)
    )
      params.receipt_email = customerEmail;

    const pi = await stripe.paymentIntents.create(params);
    res.json({
      clientSecret: pi.client_secret,
      amount: pi.amount,
      currency: pi.currency,
      paymentIntentId: pi.id,
    });
  } catch (err) {
    logger.error("create-payment-intent error:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "stripe_error" });
  }
});

/* ----------------------- Stripe: Checkout Session ------------------------- */
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const { rideId, amountCents, pickup, dropoff } = req.body || {};

    if (typeof rideId !== "string" || !rideId.trim())
      return res
        .status(400)
        .json({ error: "invalid_ride_id", message: "rideId must be provided" });
    if (!Number.isInteger(amountCents))
      return res
        .status(400)
        .json({ error: "invalid_amount", message: "amountCents must be integer" });
    if (typeof pickup !== "string" || !pickup.trim())
      return res
        .status(400)
        .json({ error: "invalid_pickup", message: "pickup must be provided" });
    if (typeof dropoff !== "string" || !dropoff.trim())
      return res
        .status(400)
        .json({ error: "invalid_dropoff", message: "dropoff must be provided" });

    let verifiedAmount = amountCents;
    if (db) {
      const snap = await db.collection("rideRequests").doc(rideId).get();
      if (snap.exists) {
        const ride = snap.data();
        const expected = Number.isFinite(ride.amountCents)
          ? ride.amountCents
          : Math.round((ride.fare || 0) * 100);
        if (expected !== amountCents && !DEV_NO_STRICT_DB)
          return res
            .status(400)
            .json({ error: "amount_mismatch", message: "DB mismatch" });
        verifiedAmount = expected;
      } else if (!DEV_NO_STRICT_DB) {
        return res.status(404).json({ error: "ride_not_found", message: "Ride not found" });
      }
    } else if (!DEV_NO_STRICT_DB) {
      return res
        .status(500)
        .json({ error: "firestore_unavailable", message: "Firestore not initialised" });
    }

    if (verifiedAmount < MIN_CHARGE_CENTS)
      return res.status(400).json({
        error: "amount_below_minimum",
        message: `Minimum charge is ${MIN_CHARGE_CENTS} cents`,
      });

    const origin =
      req.headers.origin && /^https?:\/\//.test(req.headers.origin)
        ? req.headers.origin
        : BASE_CLIENT_URL;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "link"],
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      phone_number_collection: { enabled: true },
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: verifiedAmount,
            product_data: { name: "Taxi ride", description: `${pickup} → ${dropoff}` },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/ridesharing/track/${rideId}`,
      cancel_url: `${origin}/ridesharing/confirmed/${rideId}`,
      metadata: { rideId: String(rideId) },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    logger.error("Stripe error:", err);
    res.status(500).json({ error: "stripe_error", detail: err.message });
  }
});

/* ------------------------------- Utilities ------------------------------- */
async function safeJson(r) {
  try {
    return await r.json();
  } catch {
    try {
      return await r.text();
    } catch {
      return null;
    }
  }
}

/* --------------------------------- Start --------------------------------- */
app.listen(PORT, () => {
  logger.info(`API listening on http://localhost:${PORT}`);
});