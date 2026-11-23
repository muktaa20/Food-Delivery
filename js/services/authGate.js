import { getAuth } from "../store.js";

/** Pages that need a logged-in user (body[data-page] values). */
export const MEMBER_PAGES = new Set(["cart", "checkout", "order"]);

/** How many menu dishes a guest can see. */
export const GUEST_MENU_LIMIT = 24;

export const isLoggedIn = () => Boolean(getAuth());

const currentPath = () => (location.pathname.split("/").pop() || "index.html") + location.search;

export function loginUrl(next = currentPath(), page = "login.html") {
  return `${page}?next=${encodeURIComponent(next)}`;
}

/** Send a guest to the login page. Returns true if a redirect happened. */
export function requireLogin(next) {
  if (isLoggedIn()) return false;
  location.href = loginUrl(next);
  return true;
}

/** Card shown in place of members-only content. */
export function loginPromptHTML({ title, text, next = currentPath() }) {
  return `
    <div class="login-prompt" role="region" aria-label="Sign in required">
      <span class="login-prompt-icon"><i class="fa-solid fa-lock" aria-hidden="true"></i></span>
      <div class="login-prompt-copy">
        <h3>${title}</h3>
        <p>${text}</p>
      </div>
      <div class="login-prompt-actions">
        <a class="btn btn-primary" href="${loginUrl(next)}">Sign in</a>
        <a class="btn" href="${loginUrl(next, "signup.html")}">Create account</a>
      </div>
    </div>
  `;
}
