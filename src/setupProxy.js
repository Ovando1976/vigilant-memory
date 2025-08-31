// src/setupProxy.js
/* eslint-disable @typescript-eslint/no-var-requires */
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  // Opt-in flag: only proxy when a backend is actually running.
  const enableBackend = process.env.REACT_APP_ENABLE_BACKEND === "1";

  if (!enableBackend) {
    // Quiet stubs for noisy endpoints in dev so nothing crashes or spams logs.
    app.use("/api/resolve-route", (_req, res) => res.status(204).end());
    app.use("/api/rides/price/preview", (_req, res) => res.status(204).end());
    // If you have other /api endpoints that fire on page load, stub them too:
    // app.use("/api/whatever", (_req, res) => res.status(204).end());
    return;
  }

  // Real proxy path (when your backend is running on 5001)
  app.use(
    "/api",
    createProxyMiddleware({
      target: process.env.REACT_APP_API_BASE_URL || "http://localhost:5001",
      changeOrigin: true,
      secure: false,
      ws: false,
      logLevel: "warn",
    })
  );
};