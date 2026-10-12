import { describe, expect, it } from "vitest";
import { FIRST_MAINTENANCE_DATE, PROJECT } from "./storefront";

describe("open-source project identity", () => {
  it("names the MIT grant and the public repository", () => {
    expect(PROJECT.license).toBe("MIT");
    expect(PROJECT.copyrightHolder).toBe("WHH Treasures");
    expect(PROJECT.repositoryUrl).toBe("https://github.com/waleed-mirza/inspectStack");
    expect(PROJECT.licenseUrl).toContain("/blob/main/LICENSE");
    expect(PROJECT.issuesUrl).toBe("https://github.com/waleed-mirza/inspectStack/issues");
  });

  it("keeps a dated maintenance hold", () => {
    expect(FIRST_MAINTENANCE_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
