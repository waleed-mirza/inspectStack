import { ImageResponse } from "next/og";
import { PwaMark } from "@/lib/pwa-mark";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<PwaMark size={192} />, { ...size });
}
