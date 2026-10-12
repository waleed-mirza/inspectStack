"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { headers } from "next/headers";
import { createSupabaseServer } from "../supabase/server";
import { IMPERSONATION_COOKIE } from "@inspectstack/domain";
import { ORG_COOKIE } from "../session";
import { authRedirectOrigin } from "../auth-origin";
import { consumeRateLimit, recordAudit } from "@inspectstack/db";
import { getDb } from "../db";
import { safeAppPath } from "../safe-path";
import { requestClientIp } from "../client-ip";

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function nextQuery(formData: FormData): string {
  const next = safeAppPath(formData.get("next"));
  return next ? `&next=${encodeURIComponent(next)}` : "";
}

export async function signInWithPassword(formData: FormData) {
  const next = safeAppPath(formData.get("next")) ?? "/app";
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    redirect(`/login?error=invalid${nextQuery(formData)}`);
  }

  const ip = await requestClientIp();
  const limited = await consumeRateLimit(getDb(), {
    kind: "auth",
    material: `password:${ip}:${parsed.data.email.toLowerCase()}`,
  });
  if (!limited.ok) redirect(`/login?error=rate${nextQuery(formData)}`);

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    redirect(`/login?error=credentials${nextQuery(formData)}`);
  }

  await recordAudit(getDb(), {
    organizationId: null,
    actorUserId: (await supabase.auth.getUser()).data.user?.id ?? null,
    action: "auth.sign_in",
    entityType: "user",
  });

  revalidatePath("/", "layout");
  redirect(next);
}

export async function sendMagicLink(formData: FormData) {
  const email = z.string().email().safeParse(formData.get("email"));
  const next = safeAppPath(formData.get("next"));
  if (!email.success) redirect(`/login?error=invalid${nextQuery(formData)}`);

  const ip = await requestClientIp();
  const limited = await consumeRateLimit(getDb(), {
    kind: "auth",
    material: `magic:${ip}:${email.data.toLowerCase()}`,
  });
  if (!limited.ok) redirect(`/login?error=rate${nextQuery(formData)}`);

  const supabase = await createSupabaseServer();
  const origin = authRedirectOrigin((await headers()).get("origin"));
  const callback = next
    ? `${origin}/auth/callback?next=${encodeURIComponent(next)}`
    : `${origin}/auth/callback`;
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: {
      emailRedirectTo: callback,
    },
  });
  if (error) redirect(`/login?error=magic${nextQuery(formData)}`);
  redirect(`/login?sent=1${nextQuery(formData)}`);
}

export async function signOut() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  const jar = await cookies();
  jar.delete(ORG_COOKIE);
  jar.delete(IMPERSONATION_COOKIE);
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function switchOrganization(formData: FormData) {
  const organizationId = z.string().uuid().safeParse(formData.get("organizationId"));
  if (!organizationId.success) redirect("/app");
  (await cookies()).set(ORG_COOKIE, organizationId.data, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  revalidatePath("/", "layout");
  redirect("/app");
}
