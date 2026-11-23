import { initImageFallback } from "./ui/imageFallback.js";
import { initHeader } from "./ui/header.js";
import { initFooter } from "./ui/footer.js";
import { MEMBER_PAGES, requireLogin } from "./services/authGate.js";

const PAGE_MODULES = {
  home: () => import("./pages/home.js"),
  menu: () => import("./pages/menu.js"),
  cart: () => import("./pages/cart.js"),
  checkout: () => import("./pages/checkout.js"),
  order: () => import("./pages/order.js"),
  login: () => import("./pages/auth.js"),
  signup: () => import("./pages/auth.js"),
  forgot: () => import("./pages/auth.js"),
};

initImageFallback();
initHeader();
initFooter();

const page = document.body.dataset.page;
const loadPage = PAGE_MODULES[page];

// Members-only pages bounce guests to login (and back here afterwards).
if (MEMBER_PAGES.has(page) && requireLogin()) {
  // redirecting
} else if (loadPage) {
  loadPage()
    .then((module) => module.init())
    .catch((err) => console.error(`Failed to initialise page "${page}"`, err));
}
