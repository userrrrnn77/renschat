import { api, ApiError } from "./api";

const TIMEOUT_MS = 120_000;
let current: { key: string; controller: AbortController } | undefined;
const changes = new EventTarget();

export function openDraft(key: string): AbortController {
  current?.controller.abort();
  const controller = new AbortController();
  current = { key, controller };
  controller.signal.addEventListener("abort", () => {
    if (current?.controller === controller) current = undefined;
    changes.dispatchEvent(new Event("change"));
  }, { once: true });
  changes.dispatchEvent(new Event("change"));
  return controller;
}

function wait(signal: AbortSignal, delay?: number): Promise<void> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const timer = delay === undefined ? undefined : setTimeout(done, delay);
    function cleanup() {
      clearTimeout(timer);
      changes.removeEventListener("change", done);
      signal.removeEventListener("abort", abort);
    }
    function done() { cleanup(); resolve(); }
    function abort() { cleanup(); reject(signal.reason); }
    if (delay === undefined) changes.addEventListener("change", done);
    signal.addEventListener("abort", abort, { once: true });
  });
}

export async function pollFile(
  key: string,
  fileId: string,
  cancel?: AbortSignal,
  expiresAt = Date.now() + TIMEOUT_MS,
) {
  const deadline = AbortSignal.timeout(Math.max(0, expiresAt - Date.now()));
  const signal = cancel ? AbortSignal.any([cancel, deadline]) : deadline;
  let delay = 1500;
  try {
    for (;;) {
      await wait(signal, delay);
      while (current?.key !== key) await wait(signal);
      const visible = current.controller.signal;
      try {
        const meta = await api.files.get(fileId, AbortSignal.any([visible, signal]));
        if (meta.status === "ready" || meta.status === "failed") return meta;
      } catch (err) {
        signal.throwIfAborted();
        if (!visible.aborted && err instanceof ApiError && err.status < 500) throw err;
      }
      delay = Math.min(delay * 2, 10_000);
    }
  } catch (err) {
    if (deadline.aborted && !cancel?.aborted) throw new Error("Timeout menunggu file siap");
    throw err;
  }
}
