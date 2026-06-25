import type { DomainInfo, UrlKind } from "./types";

const UNSUPPORTED_PROTOCOLS: Record<string, UrlKind> = {
  "chrome:": "chrome-internal",
  "devtools:": "chrome-internal",
  "view-source:": "chrome-internal",
  "chrome-extension:": "extension",
  "file:": "file",
};

export function inspectUrl(rawUrl: string | undefined): DomainInfo {
  if (!rawUrl) {
    return { kind: "invalid", hostname: null };
  }

  try {
    const url = new URL(rawUrl);
    const unsupportedKind = UNSUPPORTED_PROTOCOLS[url.protocol];

    if (unsupportedKind) {
      return { kind: unsupportedKind, hostname: null };
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { kind: "invalid", hostname: null };
    }

    const hostname = normalizeHostname(url.hostname);
    if (!hostname) {
      return { kind: "invalid", hostname: null };
    }

    const kind: UrlKind =
      hostname === "localhost" || hostname === "127.0.0.1"
        ? "localhost"
        : "web";

    return { kind, hostname };
  } catch {
    return { kind: "invalid", hostname: null };
  }
}

export function normalizeProtectedDomain(input: string): string | null {
  const value = input.trim().toLowerCase();
  if (!value || value.includes("*")) {
    return null;
  }

  const candidate = value.includes("://") ? value : `https://${value}`;

  try {
    const url = new URL(candidate);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      (url.pathname !== "/" && url.pathname !== "") ||
      url.search ||
      url.hash ||
      url.username ||
      url.password ||
      url.port
    ) {
      return null;
    }

    return normalizeHostname(url.hostname);
  } catch {
    return null;
  }
}

export function normalizeProtectedDomains(inputs: string[]): string[] {
  return [
    ...new Set(
      inputs
        .map(normalizeProtectedDomain)
        .filter((domain): domain is string => domain !== null),
    ),
  ].sort();
}

export function isProtectedHostname(
  hostname: string,
  protectedDomains: string[],
): boolean {
  const normalizedHostname = normalizeHostname(hostname);
  if (!normalizedHostname) {
    return false;
  }

  return protectedDomains.some((domain) => {
    const normalizedDomain = normalizeHostname(domain);
    return (
      normalizedDomain !== null &&
      (normalizedHostname === normalizedDomain ||
        normalizedHostname.endsWith(`.${normalizedDomain}`))
    );
  });
}

function normalizeHostname(hostname: string): string | null {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
  return normalized || null;
}
