/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@finance-tracker/shared'],
};

module.exports = nextConfig;
