import { describe, expect, it } from "vitest";
import { APP_VERSION } from "./version";

describe("product version", () => {
  it("is a launch-candidate identifier", () => {
    expect(APP_VERSION).toBe("1.0.1");
  });
});
