const LOCAL_ORIGINS = ["http://127.0.0.1:3000", "http://localhost:3000"] as const;

function configuredOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
}

function isAllowedOrigin(origin: string): boolean {
  if ((LOCAL_ORIGINS as readonly string[]).includes(origin)) return true;
  if (origin === configuredOrigin()) return true;
  try {
    const configured = new URL(configuredOrigin());
    const host = new URL(origin).hostname;
    // Netlify deploy previews: <branch>--<site>.netlify.app when APP_URL is the site host.
    if (configured.hostname.endsWith(".netlify.app")) {
      const site = configured.hostname.replace(/\.netlify\.app$/, "");
      return host === configured.hostname || host.endsWith(`--${site}.netlify.app`);
    }
    return false;
  } catch {
    return false;
  }
}

/** Magic-link redirect must match an origin on the Auth allow-list. */
export function authRedirectOrigin(requestOrigin: string | null | undefined): string {
  if (requestOrigin && isAllowedOrigin(requestOrigin)) return requestOrigin;
  return configuredOrigin();
}
