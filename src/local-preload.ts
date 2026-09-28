import { contextBridge, ipcRenderer } from "electron";
import type { LocalBridge } from "./bridge";

const bridge: LocalBridge = {
  choose: (id) => ipcRenderer.send("picker:choose", id),
  picker: () => ipcRenderer.invoke("picker:context"),
  retry: () => ipcRenderer.invoke("local:retry"),
  saveInstance: (input) => ipcRenderer.invoke("local:save-instance", input),
  setup: () => ipcRenderer.invoke("local:setup"),
};

contextBridge.exposeInMainWorld("omni365Local", bridge);
