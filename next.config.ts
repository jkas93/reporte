import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Turbopack: Fijar el directorio raíz de forma absoluta para evitar avisos de lockfiles
  turbopack: {
    root: path.resolve(__dirname),
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' blob: data: https://*.fbcdn.net https://*.facebook.com",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://graph.facebook.com https://*.upstash.io",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests",
          ].join("; "),
        },
      ],
    },
  ],
};

export default nextConfig;
