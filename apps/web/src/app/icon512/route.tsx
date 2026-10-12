import { ImageResponse } from "next/og";
import { PwaMark } from "@/lib/pwa-mark";

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(<PwaMark size={512} />, { width: 512, height: 512 });
}
