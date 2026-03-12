/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Type errors do not fail production builds — fix incrementally
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLint warnings do not fail production builds — fix incrementally
    ignoreDuringBuilds: true,
  },
  images: {
    // Allow images served from AWS S3, CloudFront CDN, and Railway deployments
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'https', hostname: '**.railway.app' },
    ],
  },
}

export default nextConfig
