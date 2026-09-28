function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) {
    throw new Error(`Missing #${id}`);
  }
  return found as T;
}

async function main(): Promise<void> {
  const context = await window.omni365Local.setup();
  const { messages } = context;
  const form = element<HTMLFormElement>("form");
  const input = element<HTMLInputElement>("instance");
  const error = element("error");
  const submit = element<HTMLButtonElement>("submit");
  const retry = element<HTMLButtonElement>("retry");

  document.documentElement.lang = context.language;
  element("title").textContent = messages.title;
  element("lead").textContent = messages.lead;
  element("label").textContent = messages.label;
  input.placeholder = messages.placeholder;
  input.value = context.instance?.replace("https://", "") ?? "";
  submit.textContent = messages.submit;
  retry.textContent = messages.retry;
  error.textContent = context.error ? messages.errors[context.error] : "";
  retry.hidden = context.error !== "load-failed";

  retry.addEventListener("click", () => window.omni365Local.retry());
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submit.disabled = true;
    submit.textContent = messages.checking;
    error.textContent = "";
    const failure = await window.omni365Local.saveInstance(input.value);
    if (failure) {
      error.textContent = messages.errors[failure];
      submit.disabled = false;
      submit.textContent = messages.submit;
      input.focus();
    }
  });
  input.focus();
}

main();

export {};
