import type { Metadata, Viewport } from "next";
import { Barlow_Semi_Condensed, Source_Sans_3, Spline_Sans_Mono } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import { RouteProgress } from "@/components/route-progress";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans-face",
});

const display = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display-face",
});

const mono = Spline_Sans_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-face",
});

export const metadata: Metadata = {
  applicationName: "InspectStack",
  title: "InspectStack — Field inspection and report builder",
  description:
    "Open-source field inspection software: offline capture, white-label PDFs, four starter packs. MIT license.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "InspectStack",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#1b2430",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable} ${mono.variable} antialiased`}>
        <ServiceWorker>
          <RouteProgress />
          {children}
        </ServiceWorker>
      </body>
    </html>
  );
}
