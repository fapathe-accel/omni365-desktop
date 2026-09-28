import { contextBridge, ipcRenderer } from "electron";
import type { DesktopBridge } from "./bridge";

const bridge: DesktopBridge = {
  platform: process.platform,
  setBadgeCount: (count) => ipcRenderer.send("desktop:badge", count),
};

contextBridge.exposeInMainWorld("omni365Desktop", bridge);
