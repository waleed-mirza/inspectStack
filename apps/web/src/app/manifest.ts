import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "InspectStack",
    short_name: "InspectStack",
    description: "Field inspection and report builder.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#e6ebef",
    theme_color: "#1b2430",
    lang: "en",
    icons: [
      { src: "/icon", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
