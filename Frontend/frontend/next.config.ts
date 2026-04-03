import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/index.html'
      },
      {
        source: '/login',
        destination: '/login.html'
      },
      {
        source: '/auth/google',
        destination: '/api/auth/google'
      },
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*' // Proxy to FastAPI Backend
      }
    ]
  }
};

export default nextConfig;
