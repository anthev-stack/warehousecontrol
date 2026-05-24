import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  allowedDevOrigins: ["192.168.1.10", "localhost", "127.0.0.1", "warehousecontrol.cc", "www.warehousecontrol.cc"],
};

export default nextConfig;
