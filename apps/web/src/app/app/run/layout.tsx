export default function RunLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex h-dvh min-h-0 flex-col bg-paper text-ink">{children}</div>;
}
