import { contextBridge, ipcRenderer } from "electron";
import type { DesktopBridge, LocalBridge } from "./bridge";

// One window shows both the app's own pages (first run) and the instance, so
// the preload picks the bridge by what is loaded. The main process checks the
// sender again on every call.
if (window.location.protocol === "file:") {
  const bridge: LocalBridge = {
    choose: (id) => ipcRenderer.send("picker:choose", id),
    picker: () => ipcRenderer.invoke("picker:context"),
    retry: () => ipcRenderer.invoke("local:retry"),
    saveInstance: (input) => ipcRenderer.invoke("local:save-instance", input),
    setup: () => ipcRenderer.invoke("local:setup"),
  };
  contextBridge.exposeInMainWorld("omni365Local", bridge);
} else {
  const bridge: DesktopBridge = {
    focus: () => ipcRenderer.send("desktop:focus"),
    platform: process.platform,
    setBadgeCount: (count) => ipcRenderer.send("desktop:badge", count),
  };
  contextBridge.exposeInMainWorld("omni365Desktop", bridge);

  // The web app answers a notification's click with `window.focus()`, which
  // cannot bring back a window hidden in the tray. Every notification the page
  // creates also asks the main process to show the window. Runs in the page's
  // world, before its own scripts, so it must be self-contained.
  contextBridge.executeInMainWorld({
    func: () => {
      const Native = window.Notification;
      if (!Native) {
        return;
      }
      class DesktopNotification extends Native {
        constructor(title: string, options?: NotificationOptions) {
          super(title, options);
          this.addEventListener("click", () => window.omni365Desktop?.focus());
        }
      }
      Object.defineProperty(window, "Notification", {
        configurable: true,
        value: DesktopNotification,
        writable: true,
      });
    },
  });
}
