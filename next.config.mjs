// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      remotePatterns: [
        { protocol: 'https', hostname: 'drive.google.com', pathname: '/uc*' },
        { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
        { protocol: 'https', hostname: 'i.imgur.com', pathname: '/**' },
        { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/**' },
        { protocol: 'https', hostname: '**.supabase.in', pathname: '/storage/**' },
      ],
      formats: ['image/avif', 'image/webp'],
    },
  };
  
  export default nextConfig;
  