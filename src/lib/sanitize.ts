/**
 * Returns true only for http(s) or relative URLs.
 * Blocks javascript:, data:, vbscript:, and other dangerous protocols.
 */
export function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.startsWith("/")) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
