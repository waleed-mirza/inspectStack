import { LoadingState } from "@inspectstack/ui";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[32rem] px-5 py-16">
      <LoadingState label="Opening InspectStack…" />
    </main>
  );
}
