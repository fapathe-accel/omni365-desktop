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
    platform: process.platform,
    setBadgeCount: (count) => ipcRenderer.send("desktop:badge", count),
  };
  contextBridge.exposeInMainWorld("omni365Desktop", bridge);
}
