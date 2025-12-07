/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Ignore bot folder during build
    ignoreBuildErrors: false,
  },
  // Exclude bot folder completely
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Exclude bot folder from webpack compilation
  webpack: (config, { isServer }) => {
    // Ignore bot folder in webpack
    config.resolve.alias = {
      ...config.resolve.alias,
    }
    
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules', '**/bot/**', '**/.next/**'],
    }
    
    return config
  },
}

module.exports = nextConfig

