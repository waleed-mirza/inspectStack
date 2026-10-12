import { redirect } from "next/navigation";
import { StorefrontHome } from "@/components/storefront/home";
import { getSessionContext } from "@/lib/session";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_code?: string }>;
}) {
  const params = await searchParams;
  if (params.error || params.error_code) {
    redirect("/login?error=auth");
  }
  let signedIn = false;
  try {
    const session = await getSessionContext();
    signedIn = Boolean(session?.active);
  } catch {
    signedIn = false;
  }

  return <StorefrontHome signedIn={signedIn} />;
}
