import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com'
      },
      // dibawah ini aing add soalnya gatau kenapa gabisa delete row di db nya
      //hapus aja klo sudah ke fix fachri
      {
        protocol: 'https',
        hostname: 'example.com'
      }
    ]
  }
};

export default nextConfig;
