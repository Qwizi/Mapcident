import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8088",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "backend",
        pathname: "/media/**",
      },
    ],
  },
}

export default nextConfig
