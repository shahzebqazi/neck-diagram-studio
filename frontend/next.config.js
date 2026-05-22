/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/neck-diagram-studio',
  assetPrefix: '/neck-diagram-studio/',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  },
  webpack: (config) => {
    // Work around module resolution issues seen in some migrated environments.
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@swc/helpers/_/_interop_require_default': require.resolve('@swc/helpers/cjs/_interop_require_default.cjs'),
      '@swc/helpers/_/_interop_require_wildcard': require.resolve('@swc/helpers/cjs/_interop_require_wildcard.cjs'),
    };
    return config;
  },
};

module.exports = nextConfig;
