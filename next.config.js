/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Ignore bot folder during build
    ignoreBuildErrors: false,
  },
  // Exclude bot folder from webpack compilation
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules', '**/bot/**'],
    }
    return config
  },
}

module.exports = nextConfig

