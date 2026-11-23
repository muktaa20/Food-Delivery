/** Boots the in-browser mock backend: seeds IndexedDB, then starts Mock Service Worker. */
import { setupWorker } from "../vendor/msw.js";
import { handlers } from "./handlers.js";
import { ensureSeeded } from "./db.js";

let starting = null;

/** Idempotent; a failed start can be retried by calling again. */
export function startMockApi() {
  starting ??= (async () => {
    if (!("serviceWorker" in navigator)) {
      throw new Error("Service workers are unavailable here. Serve the site over http://localhost or https.");
    }
    await ensureSeeded();
    await setupWorker(...handlers).start({
      serviceWorker: { url: "./mockServiceWorker.js" },
      onUnhandledRequest: "bypass",
      quiet: true,
    });
  })().catch((err) => {
    starting = null;
    throw err;
  });
  return starting;
}
