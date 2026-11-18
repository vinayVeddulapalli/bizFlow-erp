/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@bizflow/shared-types',
    '@bizflow/validation',
    '@bizflow/shared-utils',
  ],
};

export default nextConfig;
