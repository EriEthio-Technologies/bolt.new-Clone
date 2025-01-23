/** @type {import('@remix-run/dev').AppConfig} */
export default {
  appDirectory: 'app',
  assetsBuildDirectory: 'public/build',
  future: {
    v3_fetcherPersist: true,
    v3_relativeSplatPath: true,
    v3_throwAbortReason: true,
  },
  publicPath: '/build/',
  serverBuildPath: 'build/server/index.js',
  serverModuleFormat: 'esm',
};
