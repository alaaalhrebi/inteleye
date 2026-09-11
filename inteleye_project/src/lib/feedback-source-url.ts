const PLATFORM_HOSTS: Record<string, string[]> = {
  google_maps: ["google.com", "goo.gl"],
  x: ["x.com", "twitter.com"],
  tiktok: ["tiktok.com"],
  instagram: ["instagram.com"],
};

export function getSafeFeedbackUrl(
  value: string | null | undefined,
  platformName: string | null | undefined
) {
  if (!value || !platformName) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;

    const allowedHosts = PLATFORM_HOSTS[platformName.trim().toLowerCase()] ?? [];
    const hostname = url.hostname.toLowerCase();
    const isAllowed = allowedHosts.some(
      (allowedHost) =>
        hostname === allowedHost || hostname.endsWith(`.${allowedHost}`)
    );

    return isAllowed ? url.toString() : null;
  } catch {
    return null;
  }
}
