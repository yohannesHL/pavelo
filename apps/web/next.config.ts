import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // SPA mode: all rendering is client-side.
  // Note: output:"export" is incompatible with dynamic routes + "use client" pages
  // in Next.js 16 Turbopack. Instead we achieve SPA behavior via:
  // - All pages use "use client"
  // - No middleware (deleted - incompatible with SPA)
  // - No server-side redirects
  // - Images unoptimized (no server-side optimization)
  transpilePackages: ["@pavelo/shared"],
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
