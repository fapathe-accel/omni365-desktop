import type { Language, Messages } from "./messages";

export type SetupError = keyof Messages["setup"]["errors"];

export interface SetupContext {
  error: SetupError | null;
  instance: string | null;
  language: Language;
  messages: Messages["setup"];
}

export interface PickerSource {
  id: string;
  kind: "screen" | "window";
  name: string;
  thumbnail: string;
}

export interface PickerContext {
  messages: Messages["picker"];
  sources: PickerSource[];
}

/** What the local pages (first run, screen picker) reach through `window.omni365Local`. */
export interface LocalBridge {
  choose(id: string | null): void;
  picker(): Promise<PickerContext>;
  retry(): Promise<void>;
  saveInstance(input: string): Promise<SetupError | null>;
  setup(): Promise<SetupContext>;
}

declare global {
  interface Window {
    omni365Desktop?: DesktopBridge;
    omni365Local: LocalBridge;
  }
}

/** What the Omni365 web app reaches through `window.omni365Desktop`. */
export interface DesktopBridge {
  /** Shows and focuses the window, even when it is hidden in the tray. */
  focus(): void;
  platform: NodeJS.Platform;
  setBadgeCount(count: number): void;
}
