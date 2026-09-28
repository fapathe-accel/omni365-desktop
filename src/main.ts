import { join, resolve } from "node:path";
import {
  app,
  BrowserWindow,
  type IpcMainInvokeEvent,
  ipcMain,
  Menu,
  session,
  shell,
  systemPreferences,
  type Tray,
} from "electron";
import { autoUpdater } from "electron-updater";
import type { SetupContext, SetupError } from "./bridge";
import { deepLinkFromArgv, deepLinkPath, PROTOCOL } from "./deep-link";
import { applicationMenu, createTray } from "./menu";
import { type Language, messagesFor } from "./messages";
import { pickScreen } from "./screen-picker";
import {
  instanceOrigin,
  isInstanceUrl,
  isSecureUrl,
  isSignInRedirect,
  probeInstance,
  readSettings,
  writeSettings,
} from "./settings";

const isMac = process.platform === "darwin";
/** A Linux desktop may have no tray to bring a hidden window back from. */
const hidesOnClose = process.platform !== "linux";
/** Offered on the first-run screen; the viewer may enter any other instance. */
const SUGGESTED_INSTANCE = "https://omni365v2.heritage.africa";
const UPDATE_INTERVAL_MS = 4 * 60 * 60 * 1000;
/** Chromium's code for a navigation the page itself replaced. */
const ERR_ABORTED = -3;
const EXTERNAL_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
const GRANTED_PERMISSIONS = new Set([
  "clipboard-read",
  "clipboard-sanitized-write",
  "display-capture",
  "fullscreen",
  "media",
  "notifications",
]);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;
let setupError: SetupError | null = null;
let pendingDeepLink: string | null = null;

function language(): Language {
  const [preferred] = app.getPreferredSystemLanguages();
  return (preferred ?? app.getLocale()).startsWith("fr") ? "fr" : "en";
}

const messages = () => messagesFor(language());

function distPath(...segments: string[]): string {
  return join(app.getAppPath(), "dist", ...segments);
}

function openExternal(target: string): void {
  try {
    if (EXTERNAL_PROTOCOLS.has(new URL(target).protocol)) {
      shell.openExternal(target);
    }
  } catch {
    // Not a URL: nothing to open.
  }
}

function fromLocalPage(event: IpcMainInvokeEvent): boolean {
  return event.senderFrame?.url.startsWith("file://") ?? false;
}

function showSetup(error: SetupError | null): void {
  setupError = error;
  mainWindow?.loadFile(distPath("pages", "setup.html"));
}

function loadInstance(path = "/"): void {
  const { instance } = readSettings();
  if (!instance) {
    showSetup(null);
    return;
  }
  // A failed load is answered by `did-fail-load`, which shows the setup page.
  mainWindow?.loadURL(new URL(path, instance).toString()).catch(() => undefined);
}

function showWindow(): void {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

function openDeepLink(link: string): void {
  const path = deepLinkPath(link);
  if (!path) {
    return;
  }
  if (!app.isReady()) {
    pendingDeepLink = link;
    return;
  }
  showWindow();
  loadInstance(path);
}

function createWindow(): void {
  const { bounds } = readSettings();
  const window = new BrowserWindow({
    ...bounds,
    autoHideMenuBar: true,
    backgroundColor: "#fefbf9",
    height: bounds?.height ?? 860,
    icon: distPath("icon.png"),
    minHeight: 600,
    minWidth: 900,
    show: false,
    title: app.name,
    width: bounds?.width ?? 1360,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: distPath("preload.js"),
      sandbox: true,
      spellcheck: true,
    },
  });
  mainWindow = window;

  window.once("ready-to-show", () => window.show());
  window.on("close", (event) => {
    writeSettings({ bounds: window.getNormalBounds() });
    if (hidesOnClose && !quitting) {
      event.preventDefault();
      window.hide();
    }
  });
  window.on("closed", () => {
    mainWindow = null;
  });
  window.webContents.on(
    "did-fail-load",
    (_event, code, _description, url, isMainFrame) => {
      if (isMainFrame && code !== ERR_ABORTED && !url.startsWith("file:")) {
        showSetup("load-failed");
      }
    }
  );

  const link = pendingDeepLink;
  pendingDeepLink = null;
  loadInstance((link && deepLinkPath(link)) || "/");
}

function quit(): void {
  quitting = true;
  // Windows otherwise leaves the icon in the tray until the pointer crosses it.
  tray?.destroy();
  app.quit();
}

function changeInstance(): void {
  showWindow();
  showSetup(null);
}

/**
 * The instance and nothing else: the window leaves its origin only to sign in
 * through the instance's SSO provider, a link elsewhere opens in the browser,
 * and only an instance page is granted the camera, microphone, notifications
 * or screen.
 */
function lockDownContents(): void {
  app.on("web-contents-created", (_event, contents) => {
    let signingIn = false;
    contents.on("did-navigate", (_navigation, url) => {
      if (isInstanceUrl(url)) {
        signingIn = false;
      }
    });
    contents.on("will-navigate", (event, url) => {
      if (isInstanceUrl(url)) {
        return;
      }
      // The provider's own pages (password, second factor) follow until it
      // sends the window back to the instance.
      if (isSignInRedirect(url) || (signingIn && isSecureUrl(url))) {
        signingIn = true;
        return;
      }
      event.preventDefault();
      openExternal(url);
    });
    contents.on("will-attach-webview", (event) => event.preventDefault());
    contents.setWindowOpenHandler(({ url }) => {
      if (isInstanceUrl(url) || url === "about:blank") {
        return {
          action: "allow",
          overrideBrowserWindowOptions: {
            autoHideMenuBar: true,
            icon: distPath("icon.png"),
            webPreferences: {
              contextIsolation: true,
              preload: distPath("preload.js"),
              sandbox: true,
            },
          },
        };
      }
      openExternal(url);
      return { action: "deny" };
    });
  });

  const { defaultSession } = session;
  defaultSession.setPermissionCheckHandler(
    (_contents, permission, requestingOrigin) =>
      GRANTED_PERMISSIONS.has(permission) && isInstanceUrl(requestingOrigin)
  );
  defaultSession.setPermissionRequestHandler(
    (_contents, permission, callback, details) => {
      const granted =
        GRANTED_PERMISSIONS.has(permission) &&
        isInstanceUrl(details.requestingUrl);
      if (granted && permission === "media" && isMac) {
        const types = "mediaTypes" in details ? (details.mediaTypes ?? []) : [];
        grantMacMedia(types).then(callback);
        return;
      }
      callback(granted);
    }
  );
  defaultSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      pickScreen(mainWindow, messages().picker).then((source) =>
        callback(source ? { video: source } : {})
      );
    },
    // macOS 15+ shows its own picker and skips the handler above.
    { useSystemPicker: true }
  );
}

/** macOS asks once per device, on top of the page's own permission. */
async function grantMacMedia(types: string[]): Promise<boolean> {
  const answers = await Promise.all(
    types.map((type) =>
      systemPreferences.askForMediaAccess(
        type === "video" ? "camera" : "microphone"
      )
    )
  );
  return answers.every(Boolean);
}

function registerLocalBridge(): void {
  ipcMain.handle("local:setup", (event): SetupContext | null => {
    if (!fromLocalPage(event)) {
      return null;
    }
    return {
      error: setupError,
      instance: readSettings().instance ?? SUGGESTED_INSTANCE,
      language: language(),
      messages: messages().setup,
    };
  });
  ipcMain.handle(
    "local:save-instance",
    async (event, input: unknown): Promise<SetupError | null> => {
      if (!fromLocalPage(event) || typeof input !== "string") {
        return "invalid";
      }
      const origin = instanceOrigin(input);
      if (!origin) {
        return "invalid";
      }
      const error = await probeInstance(origin);
      if (error) {
        return error;
      }
      writeSettings({ instance: origin });
      loadInstance();
      return null;
    }
  );
  ipcMain.handle("local:retry", (event) => {
    if (fromLocalPage(event)) {
      loadInstance();
    }
  });
  ipcMain.on("desktop:badge", (event, count: unknown) => {
    if (isInstanceUrl(event.senderFrame?.url ?? "") && typeof count === "number") {
      app.setBadgeCount(Math.max(0, Math.floor(count)));
    }
  });
}

function checkForUpdates(): void {
  if (!app.isPackaged) {
    return;
  }
  const check = () =>
    autoUpdater.checkForUpdatesAndNotify().catch((error: unknown) => {
      console.warn("Update check failed", error);
    });
  check();
  setInterval(check, UPDATE_INTERVAL_MS);
}

function registerProtocol(): void {
  // Unpackaged, the executable is Electron itself and needs the app's path.
  if (process.defaultApp && process.argv[1]) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
      resolve(process.argv[1]),
    ]);
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }
}

function start(): void {
  registerProtocol();
  pendingDeepLink = deepLinkFromArgv(process.argv);

  app.on("open-url", (event, url) => {
    event.preventDefault();
    openDeepLink(url);
  });
  app.on("second-instance", (_event, argv) => {
    const link = deepLinkFromArgv(argv);
    if (link) {
      openDeepLink(link);
    } else {
      showWindow();
    }
  });
  app.on("before-quit", () => {
    quitting = true;
  });
  app.on("activate", showWindow);
  app.on("window-all-closed", () => {
    if (!isMac) {
      app.quit();
    }
  });

  app.whenReady().then(() => {
    const actions = { changeInstance, quit, show: showWindow };
    lockDownContents();
    registerLocalBridge();
    Menu.setApplicationMenu(applicationMenu(messages().menu, actions));
    tray = createTray(messages().menu, actions);
    createWindow();
    checkForUpdates();
  });
}

if (app.requestSingleInstanceLock()) {
  start();
} else {
  app.quit();
}
