import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DeniedState, EmptyState, ErrorState, LoadingState } from "./states";
import { Button } from "./button";
import { Notice } from "./notice";

describe("ticket states", () => {
  it("renders empty, error, denied, and loading copy", () => {
    expect(renderToStaticMarkup(createElement(EmptyState, { children: "No tickets" }))).toContain(
      "No tickets",
    );
    expect(
      renderToStaticMarkup(createElement(ErrorState, { children: "Server failure" })),
    ).toContain("Server failure");
    expect(renderToStaticMarkup(createElement(DeniedState, null))).toContain("Permission denied");
    expect(
      renderToStaticMarkup(
        createElement(LoadingState, { layout: "tickets", label: "Opening jobs…" }),
      ),
    ).toContain("Opening jobs…");
  });

  it("marks a busy button and a fail notice for assistive tech", () => {
    const busy = renderToStaticMarkup(
      createElement(Button, { busy: true, busyLabel: "Saving…" }, "Save"),
    );
    expect(busy).toContain("aria-busy");
    expect(busy).toContain("Saving…");
    const notice = renderToStaticMarkup(
      createElement(Notice, { tone: "fail" }, "Email or password did not match."),
    );
    expect(notice).toContain('role="alert"');
  });
});
