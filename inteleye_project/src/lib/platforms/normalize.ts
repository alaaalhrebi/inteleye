export type NormalizedPlatformValue = {
  platformUrl: string;
  username: string | null;
};

type FetchLike = typeof fetch;

const GOOGLE_SHORT_LINK_HOSTS = new Set([
  "share.google",
  "maps.app.goo.gl",
  "goo.gl",
]);

function isGoogleHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === "google.com" || host.endsWith(".google.com");
}

function isDirectGoogleMapsUrl(url: URL) {
  return isGoogleHost(url.hostname) && (
    url.hostname.toLowerCase() === "maps.google.com" ||
    url.pathname === "/maps" ||
    url.pathname.startsWith("/maps/")
  );
}

function findGoogleMapsUrlInHtml(html: string, baseUrl: URL) {
  const candidates = [
    ...html.matchAll(
      /<(?:link|meta)[^>]+(?:href|content)=["']([^"']+)["'][^>]*>/gi
    ),
  ];

  for (const match of candidates) {
    try {
      const candidate = new URL(match[1].replace(/&amp;/g, "&"), baseUrl);
      if (isDirectGoogleMapsUrl(candidate)) return candidate;
    } catch {
      // Ignore malformed metadata and continue looking for a canonical Maps URL.
    }
  }

  return null;
}

async function expandGoogleMapsUrl(rawUrl: URL, fetchImpl: FetchLike) {
  const host = rawUrl.hostname.toLowerCase();

  if (isDirectGoogleMapsUrl(rawUrl)) return rawUrl;
  if (!GOOGLE_SHORT_LINK_HOSTS.has(host)) return null;

  try {
    const response = await fetchImpl(rawUrl.toString(), {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(7_000),
      headers: {
        "User-Agent": "IntelEye/1.0 Google-Maps-Link-Resolver",
      },
    });

    const expanded = new URL(response.url);
    if (isDirectGoogleMapsUrl(expanded)) {
      await response.body?.cancel();
      return expanded;
    }

    // Some Google share links return an HTML hand-off page instead of a final
    // HTTP redirect. Accept only a canonical Google Maps URL from its metadata.
    const html = await response.text();
    return findGoogleMapsUrlInHtml(html, expanded);
  } catch {
    return null;
  }
}

export async function normalizePlatformValue(
  platformName: string,
  rawValue: string,
  fetchImpl: FetchLike = fetch
): Promise<NormalizedPlatformValue | null> {
  if (platformName === "x") {
    let username = rawValue.trim();

    try {
      const parsed = new URL(username);
      username = parsed.pathname.split("/").filter(Boolean)[0] || "";
    } catch {
      // X accepts a username without a URL.
    }

    username = username.replace(/^@/, "").trim();
    if (!username) return null;

    return {
      platformUrl: `https://x.com/${username}`,
      username,
    };
  }

  try {
    const parsed = new URL(rawValue);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;

    const normalizedUrl =
      platformName === "google_maps"
        ? await expandGoogleMapsUrl(parsed, fetchImpl)
        : parsed;

    if (!normalizedUrl) return null;
    normalizedUrl.hash = "";

    return {
      platformUrl: normalizedUrl.toString().replace(/\/+$/, ""),
      username: null,
    };
  } catch {
    return null;
  }
}
