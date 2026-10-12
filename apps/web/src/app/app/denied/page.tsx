import { DeniedState } from "@inspectstack/ui";

export default function DeniedPage() {
  return (
    <DeniedState>This action is not allowed for your role in this workspace.</DeniedState>
  );
}
