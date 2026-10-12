"use server";

import { redirect } from "next/navigation";
import { normalizeQrToken, qrLaunchPath } from "@inspectstack/domain";

export async function submitQrCodeAction(formData: FormData) {
  const token = normalizeQrToken(String(formData.get("token") ?? ""));
  if (!token) redirect("/app/go?error=empty");
  redirect(qrLaunchPath(token));
}
