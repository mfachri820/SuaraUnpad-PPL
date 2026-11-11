import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: {
    // Gambar upload disajikan langsung dari storage S3 (MinIO) lewat URL publik,
    // jadi tidak perlu lewat image optimizer Next (yang juga butuh daftar host saat build).
    unoptimized: true
  }
};

export default nextConfig;
