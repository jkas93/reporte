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
        { key: "Referrer-Policy", value: "strict-origin" },
      ],
    },
  ],
};

export default nextConfig;
