// craco.config.js
module.exports = {
  webpack: {
    configure: (config) => {
      // --- 1) Clamp JSON parsing rules ---
      config.module.rules.forEach((rule) => {
        if (rule.type === "json") {
          rule.test = /\.json$/i;
          rule.exclude = [/\.js$/, /\.jsx$/, /\.ts$/, /\.tsx$/];
        }
      });

      // --- 2) Exclude src/lib from source-map-loader ---
      config.module.rules = config.module.rules.map((rule) => {
        if (
          rule.loader &&
          rule.loader.includes("source-map-loader") &&
          rule.enforce === "pre"
        ) {
          rule.exclude = [/src\/lib/];
        }
        return rule;
      });

      // --- 3) Exclude src/lib from react-refresh loader ---
      const walkRules = (container) => {
        const rules = container.rules || container.oneOf || [];
        rules.forEach((r) => {
          if (r.use) {
            const uses = Array.isArray(r.use) ? r.use : [r.use];
            r.use = uses.filter((u) => {
              const loader = typeof u === "string" ? u : u?.loader || "";
              // exclude react-refresh for lib code
              return !(
                (
                  /react-refresh-webpack-plugin/.test(loader) &&
                  /src\/lib/.test(r?.include || "")
                ) // if rule is applied to lib
              );
            });
          }
          if (Array.isArray(r.oneOf)) walkRules(r);
          if (Array.isArray(r.rules)) walkRules(r);
        });
      };
      walkRules(config.module);

      // --- 4) Optional: disable ALL Fast Refresh if DISABLE_REFRESH=1 ---
      if (process.env.DISABLE_REFRESH === "1") {
        config.plugins = (config.plugins || []).filter(
          (p) => (p?.constructor?.name || "") !== "ReactRefreshPlugin"
        );
      }

      return config;
    },
  },
};
