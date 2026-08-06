import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Necessário para Docker multi-stage
  
  // Headers de segurança
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  
  // Silenciar warning sobre pacote googleapis
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
