import { join } from "node:path";
import {
  app,
  Menu,
  type MenuItemConstructorOptions,
  nativeImage,
  Tray,
} from "electron";
import type { Messages } from "./messages";

interface MenuActions {
  changeInstance(): void;
  quit(): void;
  show(): void;
}

const isMac = process.platform === "darwin";
/** Electron cannot register a login item on Linux. */
const canLaunchAtLogin = process.platform !== "linux";

function launchAtLoginItems(label: string): MenuItemConstructorOptions[] {
  if (!canLaunchAtLogin) {
    return [];
  }
  return [
    {
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
      label,
      type: "checkbox",
    },
  ];
}

export function applicationMenu(
  messages: Messages["menu"],
  actions: MenuActions
): Menu {
  const instanceItems: MenuItemConstructorOptions[] = [
    { click: actions.changeInstance, label: messages.changeInstance },
    ...launchAtLoginItems(messages.launchAtLogin),
  ];

  const template: MenuItemConstructorOptions[] = [
    isMac
      ? {
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            ...instanceItems,
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { click: actions.quit, label: messages.quit, accelerator: "Cmd+Q" },
          ],
        }
      : {
          label: messages.file,
          submenu: [
            ...instanceItems,
            { type: "separator" },
            { click: actions.quit, label: messages.quit, accelerator: "Ctrl+Q" },
          ],
        },
    { label: messages.edit, role: "editMenu" },
    {
      label: messages.view,
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    { label: messages.window, role: "windowMenu" },
  ];
  return Menu.buildFromTemplate(template);
}

export function createTray(messages: Messages["menu"], actions: MenuActions): Tray {
  const size = isMac ? 18 : 16;
  const icon = nativeImage
    .createFromPath(join(app.getAppPath(), "dist", "icon.png"))
    .resize({ height: size, width: size });
  const tray = new Tray(icon);
  tray.setToolTip(app.name);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { click: actions.show, label: messages.open },
      { click: actions.changeInstance, label: messages.changeInstance },
      ...launchAtLoginItems(messages.launchAtLogin),
      { type: "separator" },
      { click: actions.quit, label: messages.quit },
    ])
  );
  tray.on("click", actions.show);
  return tray;
}
