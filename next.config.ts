import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sans cela, Turbopack remonte jusqu'au package-lock.json du dossier
  // utilisateur et déduit une racine de projet erronée.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
