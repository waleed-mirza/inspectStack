import { workspaceInitials } from "@inspectstack/domain";
import { cn } from "../lib/utils";

type LogoPlateProps = {
  name: string;
  logoUrl?: string | null;
  size?: "sm" | "md";
  className?: string;
};

/** Always sits on ink so a light logo never disappears on paper. */
export function LogoPlate({ name, logoUrl, size = "md", className }: LogoPlateProps) {
  const box = size === "sm" ? "h-8 w-8 text-micro" : "h-11 w-11 text-ui";
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden rounded-control border border-ink bg-ink text-ticket",
        box,
        className,
      )}
      aria-hidden={logoUrl ? true : undefined}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-full w-full object-contain p-1" />
      ) : (
        <span className="font-mono font-semibold">{workspaceInitials(name)}</span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
}
