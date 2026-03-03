import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // <--- ФУНДАМЕНТАЛЬНО ВАЖНО ДЛЯ DOCKER
  
};

export default nextConfig;