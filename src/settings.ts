import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app, net, type Rectangle } from "electron";
import type { SetupError } from "./bridge";

interface Settings {
  bounds?: Rectangle;
  instance?: string;
}

function settingsFile(): string {
  return join(app.getPath("userData"), "settings.json");
}

export function readSettings(): Settings {
  try {
    return JSON.parse(readFileSync(settingsFile(), "utf8")) as Settings;
  } catch {
    return {};
  }
}

export function writeSettings(patch: Settings): void {
  mkdirSync(app.getPath("userData"), { recursive: true });
  writeFileSync(
    settingsFile(),
    JSON.stringify({ ...readSettings(), ...patch }, null, 2)
  );
}

const SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** The instance's origin, or `null` when the input is not an https address (plain http only for a local instance). */
export function instanceOrigin(input: string): string | null {
  const trimmed = input.trim();
  let url: URL;
  try {
    url = new URL(SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  const secure = url.protocol === "https:";
  const local = url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname);
  return secure || local ? url.origin : null;
}

/**
 * Whether an Omni365 instance answers at this origin. Its web app manifest
 * declares the `web+omni` protocol, which a plain Nextcloud or any other site
 * does not.
 */
export async function probeInstance(origin: string): Promise<SetupError | null> {
  let response: Response;
  try {
    response = await net.fetch(`${origin}/manifest.webmanifest`);
  } catch {
    return "unreachable";
  }
  try {
    const manifest = (await response.json()) as {
      protocol_handlers?: { protocol?: string }[];
    };
    const omni = manifest.protocol_handlers?.some(
      (handler) => handler.protocol === "web+omni"
    );
    return omni ? null : "not-omni365";
  } catch {
    return "not-omni365";
  }
}

export function isInstanceUrl(target: string): boolean {
  const { instance } = readSettings();
  if (!instance) {
    return false;
  }
  try {
    return new URL(target).origin === instance;
  } catch {
    return false;
  }
}
