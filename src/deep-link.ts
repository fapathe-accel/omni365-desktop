export const PROTOCOL = "omni365";

/**
 * The instance path for an `omni365://mail` link. The web app already routes
 * its own `web+omni://mail` links through `/protocol-handler`, and falls back
 * to the dashboard for an area it does not know.
 */
export function deepLinkPath(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  if (url.protocol !== `${PROTOCOL}:`) {
    return null;
  }
  const target = `web+omni://${url.hostname}`;
  return `/protocol-handler?url=${encodeURIComponent(target)}`;
}

/** Windows and Linux hand a clicked link to the app as a command-line argument. */
export function deepLinkFromArgv(argv: string[]): string | null {
  return argv.find((arg) => arg.startsWith(`${PROTOCOL}://`)) ?? null;
}
