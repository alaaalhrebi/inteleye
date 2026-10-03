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

    await response.body?.cancel();
    const expanded = new URL(response.url);
    return isDirectGoogleMapsUrl(expanded) ? expanded : null;
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
