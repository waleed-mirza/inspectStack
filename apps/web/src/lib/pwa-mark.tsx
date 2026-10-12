import type { ReactElement } from "react";

/** Clipboard / job-ticket mark for PWA icons. Tokens only: paper, ticket, ink, brand rail. */
export function PwaMark({ size }: { size: number }): ReactElement {
  const rail = Math.max(8, Math.round(size * 0.07));
  const font = Math.round(size * 0.28);
  const border = Math.max(2, Math.round(size * 0.02));
  const width = Math.round(size * 0.72);
  const height = Math.round(size * 0.8);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#e6ebef",
      }}
    >
      <div
        style={{
          display: "flex",
          width,
          height,
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f9fb",
          border: `${border}px solid #1b2430`,
          borderLeft: `${rail}px solid #215C45`,
          color: "#1b2430",
          fontSize: font,
          fontFamily: "Arial Narrow, Helvetica, sans-serif",
          fontWeight: 700,
          letterSpacing: "-0.04em",
        }}
      >
        IS
      </div>
    </div>
  );
}
