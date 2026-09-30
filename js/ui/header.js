/**
 * Shared site header: nav links, cart badge, auth button and mobile menu.
 * Rendered into <header id="site-header"> on every page so the markup
 * lives in one place instead of being copy-pasted across HTML files.
 */
import { $, $$ } from "../utils/dom.js";
import { escapeHtml } from "../utils/format.js";
import { getActiveOrderId, getAuth, getCartCount, logout, subscribe } from "../store.js";
import { showToast } from "./toast.js";

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
      <a href="index.html" class="logo">Foodie.</a>

      <ul class="navlist flex gap-3">${navItemsHTML(page)}</ul>

      <div class="desktop-action flex gap-2">
        <a href="order.html" class="track-link" hidden>
          <i class="fa-solid fa-location-dot" aria-hidden="true"></i> Track order
        </a>
        <a href="cart.html" class="cart-icon" aria-label="Cart">
          <i class="fa-solid fa-bag-shopping"></i>
          <span class="cart-value">0</span>
        </a>
        <a href="login.html" class="auth-btn btn">Sign in &nbsp;${LOGOUT_ICON}</a>
        <button type="button" class="hamburger" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">
          <i class="fa-solid fa-bars"></i>
        </button>
      </div>

      <ul class="mobile-menu" id="mobile-menu">
        ${navItemsHTML(page)}
        <li class="track-item" hidden><a href="order.html" class="track-link">Track order</a></li>
        <li><a href="login.html" class="btn auth-btn">Sign in &nbsp;${LOGOUT_ICON}</a></li>
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

function renderAuthButtons() {
  const auth = getAuth();
  $$(".auth-btn").forEach((el) => {
    if (auth) {
      el.innerHTML = `Hi, ${escapeHtml(auth.name || auth.username)} &nbsp;${LOGOUT_ICON}`;
      el.classList.remove("btn");
    } else {
      el.innerHTML = `Sign in &nbsp;${LOGOUT_ICON}`;
      el.classList.add("btn");
    }
  });
}

/** Logged in: the button logs out. Logged out: the link's href goes to login.html. */
function bindAuthButtons() {
  $$(".auth-btn").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      if (!getAuth()) return;
      ev.preventDefault();
      logout();
      showToast("Logged out");
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
    if (e.target.closest("a")) setOpen(false);
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
  bindAuthButtons();
  bindMobileMenu();

  subscribe(({ type }) => {
    if (type === "cart") renderCartCount();
    if (type === "auth") renderAuthButtons();
    if (type === "order") renderTrackLink();
  });
}
