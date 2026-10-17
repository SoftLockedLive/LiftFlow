/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: `next build` writes plain files to out/ for any static host.
  output: "export",
  // /plan -> /plan/index.html, which plain file servers handle without rewrites.
  trailingSlash: true,
  // No server to resize images, so next/image serves the originals.
  images: { unoptimized: true },
  reactCompiler: true,
  reactStrictMode: true,
};

export default nextConfig;
