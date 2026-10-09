/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@settleup/settlement-engine'],
  images: {
    domains: ['api.dicebear.com']
  }
};

module.exports = nextConfig;
