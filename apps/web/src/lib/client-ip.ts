import { headers } from "next/headers";

export async function requestClientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headerList.get("x-real-ip") || headerList.get("cf-connecting-ip") || "local";
}
