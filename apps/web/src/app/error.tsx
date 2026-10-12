"use client";

import { ErrorState, Button } from "@inspectstack/ui";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto w-full max-w-[32rem] px-5 py-16">
      <ErrorState title="Server failure">
        The last action did not complete. Your draft data is not claimed as saved on the server.
      </ErrorState>
      <div className="mt-6">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
