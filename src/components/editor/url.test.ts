import { normalizeHttpUrl } from "./url";

describe("normalizeHttpUrl", () => {
  it("accepts https URLs", () => {
    expect(normalizeHttpUrl("https://example.com")).toBe("https://example.com/");
  });

  it("adds https scheme when missing", () => {
    expect(normalizeHttpUrl("example.com/path")).toBe("https://example.com/path");
  });

  it("rejects non-http schemes", () => {
    expect(normalizeHttpUrl("javascript:alert(1)")).toBeNull();
  });
});

