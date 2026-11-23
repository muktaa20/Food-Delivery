/**
 * Loading, error and empty states for any container that shows fetched data.
 * Skeleton cards mirror the product card layout so content doesn't jump when it arrives.
 */
import { escapeHtml } from "../utils/format.js";

const skeletonCardHTML = `
  <div class="order-card skeleton-card" aria-hidden="true">
    <div class="skeleton skeleton-img"></div>
    <div class="skeleton skeleton-line short"></div>
    <div class="skeleton skeleton-line"></div>
    <div class="skeleton skeleton-line price"></div>
    <div class="skeleton-actions">
      <div class="skeleton skeleton-btn"></div>
      <div class="skeleton skeleton-btn"></div>
    </div>
  </div>
`;

export function renderLoading(container, count = 6) {
  container.setAttribute("aria-busy", "true");
  container.innerHTML = skeletonCardHTML.repeat(count);
}

/** Mark a container as finished loading; call after rendering real content. */
export function doneLoading(container) {
  container.removeAttribute("aria-busy");
}

export function renderError(container, message, onRetry) {
  doneLoading(container);
  container.innerHTML = `
    <div class="state-message state-error" role="alert">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
      <p>${escapeHtml(message)}</p>
      ${onRetry ? `<button type="button" class="btn" data-retry>Try again</button>` : ""}
    </div>
  `;
  container.querySelector("[data-retry]")?.addEventListener("click", onRetry, { once: true });
}

/** @param {{ label: string, onClick: () => void }} [action] - optional button, e.g. "Clear filters" */
export function renderEmpty(container, message, action) {
  doneLoading(container);
  container.innerHTML = `
    <div class="state-message">
      <i class="fa-solid fa-bowl-food" aria-hidden="true"></i>
      <p>${escapeHtml(message)}</p>
      ${action ? `<button type="button" class="btn" data-empty-action>${escapeHtml(action.label)}</button>` : ""}
    </div>
  `;
  if (action) container.querySelector("[data-empty-action]").addEventListener("click", action.onClick, { once: true });
}
