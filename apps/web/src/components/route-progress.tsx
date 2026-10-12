"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function RouteProgressBar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setPending(false), 0);
    return () => window.clearTimeout(timer);
  }, [pathname, search]);

  useEffect(() => {
    if (!pending) {
      const timer = window.setTimeout(() => setVisible(false), 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setVisible(true), 120);
    const failsafe = window.setTimeout(() => setPending(false), 8000);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(failsafe);
    };
  }, [pending]);

  useEffect(() => {
    const startFor = (href: string | null) => {
      if (!href) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      setPending(true);
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      startFor(anchor.getAttribute("href"));
    };

    const onSubmit = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.target === "_blank") return;
      const action = form.getAttribute("action");
      if (action) startFor(action);
      else setPending(true);
    };

    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1"
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
    >
      {visible ? (
        <>
          <span className="sr-only">Opening page</span>
          <div className="route-rail h-full bg-brand" />
        </>
      ) : null}
    </div>
  );
}

export function RouteProgress() {
  return (
    <Suspense fallback={null}>
      <RouteProgressBar />
    </Suspense>
  );
}
