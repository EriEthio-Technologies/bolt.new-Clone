/** @type {import('@remix-run/dev').AppConfig} */
export default {
  ignoredRouteFiles: ["**/.*"],
  browserNodeBuiltinsPolyfill: {
    modules: { path: true },
    globals: {
      Buffer: true,
      process: true,
    },
  },
  // appDirectory: "app",
  // assetsBuildDirectory: "public/build",
  // publicPath: "/build/",
  // serverBuildPath: "build/index.js",
  serverModuleFormat: "esm",
  serverPlatform: "node",
  serverDependenciesToBundle: ["marked", "@atproto/api"],
  future: {
    v3_fetcherPersist: true,
    v3_lazyRouteDiscovery: true,
    v3_relativeSplatPath: true,
    v3_singleFetch: true,
    v3_throwAbortReason: true,
  },
  serverMinify: true,
  routes(defineRoutes) {
    return defineRoutes((route) => {
      route("/", "routes/_index.tsx");
    });
  },
  tailwind: true,
};
