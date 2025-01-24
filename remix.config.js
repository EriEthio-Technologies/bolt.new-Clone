/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ["**/.*"],
  appDirectory: "app",
  assetsBuildDirectory: "public/build",
  publicPath: "/build/",
  serverBuildPath: "build/index.js",
  serverModuleFormat: "cjs",
  serverPlatform: "node",
  serverDependenciesToBundle: ["marked", "@atproto/api"],
  future: {
    v2_errorBoundary: true,
    v2_headers: true,
    v2_meta: true,
    v2_normalizeFormMethod: true,
    v2_routeConvention: true,
  },
  serverMinify: true,
  routes(defineRoutes) {
    return defineRoutes((route) => {
      route("/", "routes/_index.tsx");
    });
  }
};
