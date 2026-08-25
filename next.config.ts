import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse uses the Node PDF.js runtime and an optional native canvas
  // dependency. Keep it out of the Turbopack server bundle so it resolves
  // from the deployed Node.js runtime instead of the build sandbox.
  serverExternalPackages: ['pdf-parse', '@napi-rs/canvas'],
};

export default nextConfig;
