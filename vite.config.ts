import { resolve } from "node:path";
import { defineConfig, lazyPlugins } from "vite-plus";

/**
 * Where the app will be served from, e.g. "/" or "/thing-tracker/".
 *
 * Set at build time rather than committed, so the same source can ship to a
 * domain root and to a GitHub project page without a code change:
 *
 *   BASE_PATH=/thing-tracker/ vp run build
 *
 * Vite requires leading and trailing slashes, and gets no second chance to
 * complain — a missing slash silently produces asset URLs like
 * "/thing-trackerassets/index.js" — so normalise rather than trust the input.
 */
const BASE_PATH = normalizeBase(process.env.BASE_PATH);

function normalizeBase(value: string | undefined): string {
  const trimmed = (value ?? "/").trim();
  if (trimmed === "" || trimmed === "/") return "/";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}/`;
}

export default defineConfig({
  base: BASE_PATH,

  resolve: {
    // `import.meta.dirname` rather than `__dirname`: this is an ESM package and
    // Vite+ loads configs through Rolldown, where `__dirname` is not guaranteed.
    alias: { "@": resolve(import.meta.dirname, "src") },
  },

  // Plugin modules are imported lazily so they are not evaluated on every `vp`
  // command (lint, fmt, IDE integration) — only when a build or dev server
  // actually needs them. Vite flattens the returned array in order, so the
  // router plugin still runs before the React plugin, which it requires.
  plugins: lazyPlugins(async () => {
    const [{ tanstackRouter }, { default: react }, { default: tailwindcss }, { VitePWA }] =
      await Promise.all([
        import("@tanstack/router-plugin/vite"),
        import("@vitejs/plugin-react"),
        import("@tailwindcss/vite"),
        import("vite-plugin-pwa"),
      ]);

    return [
      tanstackRouter({
        target: "react",
        routesDirectory: "src/routes",
        generatedRouteTree: "src/routeTree.gen.ts",
        // Babel-based splitting buys nothing for a handful of fully-precached
        // routes, and is the most likely thing to misbehave under Rolldown.
        autoCodeSplitting: false,
      }),
      react(),
      tailwindcss(),
      VitePWA({
        // `autoUpdate` activates a new service worker immediately, which means
        // `needRefresh` never fires and the update prompt can never show. An app
        // with half-filled forms wants to ask first.
        registerType: "prompt",
        // We register from src/components/pwa/UpdatePrompt.tsx ourselves.
        injectRegister: null,
        pwaAssets: { config: true, overrideManifestIcons: true },
        manifest: {
          // These must follow the deploy path. The plugin defaults them to
          // `base`, but an explicit value here overrides that default, so they
          // have to be derived rather than written out — a manifest claiming
          // scope "/" under a subpath makes the installed app try to own the
          // whole origin and launch at a page that isn't there.
          id: BASE_PATH,
          name: "Thing Tracker",
          short_name: "Things",
          description: "Local-first tracker for the things you do. Tap an emoji, it's logged.",
          start_url: BASE_PATH,
          scope: BASE_PATH,
          display: "standalone",
          orientation: "portrait",
          background_color: "#09090b",
          theme_color: "#09090b",
          categories: ["productivity", "lifestyle", "health"],
        },
        workbox: {
          // `bundles/*.json` matters: the predefined bundles must be loadable on
          // a first, offline launch, which is exactly when onboarding happens.
          //
          // Do NOT add `webmanifest` here. vite-plugin-pwa injects the manifest
          // into the precache itself, and a glob that also matches it yields two
          // entries for the same URL with different revisions. Workbox then
          // throws `add-to-cache-list-conflicting-entries` out of
          // precacheAndRoute, which aborts the module callback before any
          // install handler is registered — the service worker still installs
          // and activates, but caches nothing and the app has no offline mode.
          globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}", "bundles/*.json"],
          navigateFallback: "index.html",
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          // RxDB + Dexie produce a large main chunk; the 2 MiB default would
          // silently drop it from the precache instead of failing loudly.
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
        devOptions: { enabled: true, type: "module", navigateFallback: "index.html" },
      }),
    ];
  }),

  build: {
    target: "es2023",
    // A local-first app has no server logs; source maps are the only way to make
    // sense of a user-reported stack trace.
    sourcemap: true,
  },

  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
  },

  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: ["dist/**", "dev-dist/**", "src/routeTree.gen.ts", "public/bundles/**"],
  },
  lint: {
    ignorePatterns: ["dist/**", "dev-dist/**", "src/routeTree.gen.ts", "public/bundles/**"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
