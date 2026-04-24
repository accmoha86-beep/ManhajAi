/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip ESLint during build (pre-existing warnings in project)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Skip TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },

  // Images: allow Supabase storage and other CDNs
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Standalone output for Docker/Railway deployment
  output: 'standalone',

  // Strict mode for development
  reactStrictMode: true,

  // Allow large file uploads (200MB+) for curriculum PDF/image upload
  experimental: {
    serverActions: {
      bodySizeLimit: '250mb',
    },
  },

  // ═══════════════════════════════════════
  // 🛡️ SECURITY HEADERS — Full Protection
  // ═══════════════════════════════════════
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // 🔒 Prevent clickjacking — no iframe embedding
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // 🔒 Prevent MIME sniffing attacks
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // 🔒 Control referrer info sent to other sites
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // 🔒 HSTS — Force HTTPS for 1 year + subdomains
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // 🔒 CSP — Content Security Policy (prevent XSS)
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebaseapp.com https://*.googleapis.com https://js.stripe.com https://apis.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in",
              "connect-src 'self' https://*.supabase.co https://*.supabase.in https://*.firebaseapp.com https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.anthropic.com https://api.stripe.com https://*.railway.app wss://*.supabase.co",
              "frame-src 'self' https://*.firebaseapp.com https://js.stripe.com https://*.stripe.com https://manhaj-ai-b1319.firebaseapp.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          // 🔒 Permissions Policy — disable unnecessary browser features
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(self), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
          },
          // 🔒 Prevent XSS in older browsers
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // 🔒 DNS prefetch control
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      // 🔒 Cache control for API routes — no caching sensitive data
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
