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
    // Ensure @ alias is properly resolved
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname),
    }
    
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules', '**/bot/**', '**/.next/**'],
    }
    
    return config
  },
}

module.exports = nextConfig

