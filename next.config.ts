import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  // Disable Next.js DevTools to prevent portal errors
  reactStrictMode: true,
  // Force Turbopack to use this project as root so tailwindcss and node_modules resolve correctly
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
