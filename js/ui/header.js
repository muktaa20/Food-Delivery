
import { $, $$ } from "../utils/dom.js";
import { getActiveOrderId, getAuth, getCartCount, logout, subscribe } from "../store.js";
import { showToast } from "./toast.js";
import { MEMBER_PAGES } from "../services/authGate.js";

const NAV_LINKS = [
  { href: "index.html", label: "Home" },
  { href: "menu.html", label: "Menu" },
  { href: "index.html#services", label: "Services" },
  { href: "index.html#reviews", label: "Reviews" },
  { href: "#contact", label: "Contact" },
];

const LOGOUT_ICON = `<i class="fa-solid fa-right-from-bracket"></i>`;

const currentPage = () => location.pathname.split("/").pop() || "index.html";

function navItemsHTML(page) {
  return NAV_LINKS.map(({ href, label }) => {
    const current = href === page ? ` aria-current="page"` : "";
    return `<li><a href="${href}"${current}>${label}</a></li>`;
  }).join("");
}

function headerHTML(page) {
  return `
    <nav class="navbar flex between wraper">
      <a href="index.html" class="logo"><img class="logo-img" src="images/logo.svg" alt="Foodie" width="100" height="32" /></a>

      <ul class="navlist flex gap-3">${navItemsHTML(page)}</ul>

      <div class="desktop-action flex gap-2">
        <a href="order.html" class="track-link" hidden>
          <i class="fa-solid fa-location-dot" aria-hidden="true"></i> Track order
        </a>
        <a href="cart.html" class="cart-icon" aria-label="Cart">
          <i class="fa-solid fa-bag-shopping"></i>
          <span class="cart-value">0</span>
        </a>
        <a href="login.html" class="auth-btn btn">Sign in</a>
        <span class="user-name" hidden></span>
        <button type="button" class="btn logout-btn" hidden>${LOGOUT_ICON} Logout</button>
        <button type="button" class="hamburger" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">
          <i class="fa-solid fa-bars"></i>
        </button>
      </div>

      <ul class="mobile-menu" id="mobile-menu">
        ${navItemsHTML(page)}
        <li class="track-item" hidden><a href="order.html" class="track-link">Track order</a></li>
        <li class="mobile-user" hidden><span class="user-name"></span></li>
        <li><a href="login.html" class="btn auth-btn">Sign in</a></li>
        <li class="mobile-logout" hidden><button type="button" class="btn logout-btn">${LOGOUT_ICON} Logout</button></li>
      </ul>
    </nav>
  `;
}

function renderCartCount() {
  const count = getCartCount();
  $$(".cart-value").forEach((el) => (el.textContent = count));
}

function renderTrackLink() {
  const orderId = getActiveOrderId();
  const href = orderId ? `order.html?id=${encodeURIComponent(orderId)}` : "order.html";
  $$(".track-link").forEach((link) => {
    link.href = href;
    link.hidden = !orderId;
  });
  $$(".track-item").forEach((item) => (item.hidden = !orderId));
}

function loginHref() {
  const page = currentPage();
  if (["login.html", "signup.html", "forgot-password.html"].includes(page)) return "login.html";
  return `login.html?next=${encodeURIComponent(page + location.search)}`;
}

function renderAuthButtons() {
  const auth = getAuth();
  const loggedIn = Boolean(auth);
  $$(".auth-btn").forEach((el) => {
    el.href = loginHref();
    el.hidden = loggedIn;
  });
  $$(".user-name").forEach((el) => {
    el.textContent = loggedIn ? `Hi, ${auth.name || auth.username}` : "";
  });
  $$(".desktop-action .user-name, .desktop-action .logout-btn, .mobile-user, .mobile-logout").forEach((el) => {
    el.hidden = !loggedIn;
  });
}

function bindLogoutButtons() {
  $$(".logout-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      logout();
      const page = document.body.dataset.page;
      if (MEMBER_PAGES.has(page)) location.href = "index.html";
      else if (page === "menu") location.reload(); // back to the guest preview
      else showToast("Logged out");
    });
  });
}

/** Hamburger toggle; closes on link click, outside click or Escape. */
function bindMobileMenu() {
  const toggle = $(".hamburger");
  const menu = $(".mobile-menu");
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    menu.classList.toggle("mobile-menu-active", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };

  toggle.addEventListener("click", () => {
    setOpen(!menu.classList.contains("mobile-menu-active"));
  });
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a, button")) setOpen(false);
  });
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
}

export function initHeader() {
  const mount = $("#site-header");
  if (!mount) return;

  mount.innerHTML = headerHTML(currentPage());
  renderCartCount();
  renderTrackLink();
  renderAuthButtons();
  bindLogoutButtons();
  bindMobileMenu();

  subscribe(({ type }) => {
    if (type === "cart") renderCartCount();
    if (type === "auth") renderAuthButtons();
    if (type === "order") renderTrackLink();
  });
}
