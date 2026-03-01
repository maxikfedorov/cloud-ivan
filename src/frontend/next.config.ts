import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // <--- ФУНДАМЕНТАЛЬНО ВАЖНО ДЛЯ DOCKER
  
  // Если у тебя тут были какие-то другие настройки (например images), оставь их
  eslint: {
    ignoreDuringBuilds: true, // Рекомендую добавить, чтобы eslint не ронял сборку в докере
  },
};

export default nextConfig;