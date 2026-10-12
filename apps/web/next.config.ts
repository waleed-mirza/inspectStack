import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import withSerwistInit from "@serwist/next";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
loadEnvConfig(root);

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Turbopack `next dev` cannot inject the worker; production `next build` does.
  disable: process.env.NODE_ENV !== "production",
  // Close-tab reopen needs the runner URL in Cache Storage after a next/link visit.
  cacheOnNavigation: true,
  additionalPrecacheEntries: [{ url: "/offline", revision: "w4-s11" }],
});

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), geolocation=(self), microphone=(), payment=()",
  },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
];

const noStore = {
  key: "Cache-Control",
  value: "private, no-store, max-age=0, must-revalidate",
};

const nextConfig: NextConfig = {
  outputFileTracingRoot: root,
  serverExternalPackages: ["@react-pdf/renderer", "@react-pdf/pdfkit", "yoga-layout"],
  transpilePackages: [
    "@inspectstack/ui",
    "@inspectstack/db",
    "@inspectstack/domain",
    "@inspectstack/config",
    "@inspectstack/reports",
  ],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/verify/:path*", headers: [noStore] },
      { source: "/share/:path*", headers: [noStore] },
    ];
  },
};

export default withSerwist(nextConfig);
