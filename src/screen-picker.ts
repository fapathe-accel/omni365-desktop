import { join } from "node:path";
import {
  app,
  BrowserWindow,
  type DesktopCapturerSource,
  desktopCapturer,
  ipcMain,
} from "electron";
import type { PickerContext } from "./bridge";
import type { Messages } from "./messages";

const THUMBNAIL = { height: 180, width: 320 };

let current: { sources: DesktopCapturerSource[]; window: BrowserWindow } | null =
  null;

/**
 * Asks which screen or window a Talk call shares. Chromium in Electron has no
 * picker of its own outside macOS 15, so the page's `getDisplayMedia()` waits
 * on this window. Resolves `null` when the viewer cancels or closes it.
 */
export async function pickScreen(
  parent: BrowserWindow | null,
  messages: Messages["picker"]
): Promise<DesktopCapturerSource | null> {
  if (current) {
    current.window.focus();
    return null;
  }
  const sources = await desktopCapturer.getSources({
    thumbnailSize: THUMBNAIL,
    types: ["screen", "window"],
  });
  const window = new BrowserWindow({
    height: 560,
    minimizable: false,
    modal: parent !== null,
    parent: parent ?? undefined,
    resizable: false,
    show: false,
    title: messages.title,
    width: 760,
    webPreferences: {
      contextIsolation: true,
      preload: join(app.getAppPath(), "dist", "local-preload.js"),
      sandbox: true,
    },
  });
  window.removeMenu();
  current = { sources, window };

  const context: PickerContext = {
    messages,
    sources: sources.map((source) => ({
      id: source.id,
      kind: source.id.startsWith("screen:") ? "screen" : "window",
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
    })),
  };
  ipcMain.removeHandler("picker:context");
  ipcMain.handle("picker:context", (event) =>
    event.sender === window.webContents ? context : null
  );

  return new Promise((resolve) => {
    const finish = (id: string | null) => {
      ipcMain.removeListener("picker:choose", onChoose);
      ipcMain.removeHandler("picker:context");
      current = null;
      resolve(sources.find((source) => source.id === id) ?? null);
      if (!window.isDestroyed()) {
        window.close();
      }
    };
    const onChoose = (event: Electron.IpcMainEvent, id: unknown) => {
      if (event.sender === window.webContents) {
        finish(typeof id === "string" ? id : null);
      }
    };
    ipcMain.on("picker:choose", onChoose);
    window.on("closed", () => {
      if (current?.window === window) {
        finish(null);
      }
    });
    window.once("ready-to-show", () => window.show());
    window.loadFile(join(app.getAppPath(), "dist", "pages", "picker.html"));
  });
}
