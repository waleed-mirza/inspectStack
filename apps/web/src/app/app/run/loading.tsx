import { LoadingState } from "@inspectstack/ui";

export default function RunLoading() {
  return (
    <div className="mx-auto h-full w-full max-w-[32rem]">
      <LoadingState layout="runner" label="Opening assignment…" />
    </div>
  );
}
