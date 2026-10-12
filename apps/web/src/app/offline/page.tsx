import { EmptyState, PageHeader } from "@inspectstack/ui";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="page-shell py-10">
      <PageHeader
        title="Offline"
        description="This device is not connected. Downloaded inspections stay on the phone until you reconnect."
      />
      <EmptyState>
        Open a job you already downloaded. Template editing needs a connection and is not available
        offline.
      </EmptyState>
    </main>
  );
}
