import type { PickerSource } from "../bridge";

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) {
    throw new Error(`Missing #${id}`);
  }
  return found as T;
}

function sourceButton(source: PickerSource): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "source";
  button.dataset.id = source.id;
  button.setAttribute("aria-pressed", "false");
  const image = document.createElement("img");
  image.src = source.thumbnail;
  image.alt = "";
  const name = document.createElement("span");
  name.textContent = source.name;
  button.append(image, name);
  return button;
}

async function main(): Promise<void> {
  const { messages, sources } = await window.omni365Local.picker();
  const container = element("sources");
  const share = element<HTMLButtonElement>("share");
  const cancel = element<HTMLButtonElement>("cancel");
  let selected: string | null = null;

  document.title = messages.title;
  element("title").textContent = messages.title;
  share.textContent = messages.share;
  cancel.textContent = messages.cancel;

  const groups = [
    { kind: "screen", label: messages.screens },
    { kind: "window", label: messages.windows },
  ] as const;
  for (const group of groups) {
    const members = sources.filter((source) => source.kind === group.kind);
    if (members.length === 0) {
      continue;
    }
    const heading = document.createElement("h2");
    heading.textContent = group.label;
    const grid = document.createElement("div");
    grid.className = "grid";
    grid.append(...members.map(sourceButton));
    container.append(heading, grid);
  }

  container.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      ".source"
    );
    if (!button) {
      return;
    }
    selected = button.dataset.id ?? null;
    for (const other of container.querySelectorAll(".source")) {
      other.setAttribute("aria-pressed", String(other === button));
    }
    share.disabled = selected === null;
  });
  container.addEventListener("dblclick", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      ".source"
    );
    if (button?.dataset.id) {
      window.omni365Local.choose(button.dataset.id);
    }
  });
  share.addEventListener("click", () => window.omni365Local.choose(selected));
  cancel.addEventListener("click", () => window.omni365Local.choose(null));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      window.omni365Local.choose(null);
    }
  });
}

main();
