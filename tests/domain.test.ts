import { describe, expect, it } from "vitest";
import {
  inspectUrl,
  isProtectedHostname,
  normalizeProtectedDomain,
  normalizeProtectedDomains,
} from "../src/lib/domain";

describe("domain rules", () => {
  it("classifies supported and unsupported URLs", () => {
    expect(inspectUrl("https://docs.example.com/page")).toEqual({
      kind: "web",
      hostname: "docs.example.com",
    });
    expect(inspectUrl("http://localhost:3000")).toEqual({
      kind: "localhost",
      hostname: "localhost",
    });
    expect(inspectUrl("chrome://settings")).toEqual({
      kind: "chrome-internal",
      hostname: null,
    });
  });

  it("normalizes domain and URL inputs", () => {
    expect(normalizeProtectedDomain(" Example.COM. ")).toBe("example.com");
    expect(normalizeProtectedDomain("https://docs.example.com")).toBe(
      "docs.example.com",
    );
    expect(normalizeProtectedDomain("example.com/path")).toBeNull();
    expect(normalizeProtectedDomain("*.example.com")).toBeNull();
  });

  it("deduplicates normalized domains", () => {
    expect(
      normalizeProtectedDomains([
        "Example.com",
        "example.com",
        "docs.example.com",
      ]),
    ).toEqual(["docs.example.com", "example.com"]);
  });

  it("matches exact domains and subdomains without suffix confusion", () => {
    expect(isProtectedHostname("example.com", ["example.com"])).toBe(true);
    expect(isProtectedHostname("docs.example.com", ["example.com"])).toBe(true);
    expect(isProtectedHostname("notexample.com", ["example.com"])).toBe(false);
    expect(isProtectedHostname("example.com.evil.test", ["example.com"])).toBe(
      false,
    );
  });
});
