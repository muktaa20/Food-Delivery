/**
 * Mock Service Worker, loaded as native ES modules from jsDelivr (no bundler needed).
 * esm.sh is not an option: its Node `process` shim makes MSW think it runs in Node.
 *
 * The version must match PACKAGE_VERSION in /mockServiceWorker.js and package.json;
 * to upgrade, change all three and run `npx msw@<version> init .`.
 */
export { http, HttpResponse, delay } from "https://cdn.jsdelivr.net/npm/msw@2.15.0/+esm";
export { setupWorker } from "https://cdn.jsdelivr.net/npm/msw@2.15.0/browser/+esm";
