import { EmptyState } from "@inspectstack/ui";
import { ActionLink } from "@/components/action-link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-[32rem] px-5 py-16">
      <EmptyState title="Not found">That ticket or page is not in this workspace.</EmptyState>
      <div className="mt-6">
        <ActionLink href="/app">Back to jobs</ActionLink>
      </div>
    </main>
  );
}
