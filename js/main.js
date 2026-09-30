/**
 * App entry point, loaded on every page as <script type="module">.
 *
 * Renders the shared layout (header, footer), then lazy-loads the module for
 * the current page, chosen by <body data-page="...">. Each page module
 * exports an `init()` function.
 */
import { initImageFallback } from "./ui/imageFallback.js";
import { initHeader } from "./ui/header.js";
import { initFooter } from "./ui/footer.js";

const PAGE_MODULES = {
  home: () => import("./pages/home.js"),
  menu: () => import("./pages/menu.js"),
  cart: () => import("./pages/cart.js"),
  checkout: () => import("./pages/checkout.js"),
  order: () => import("./pages/order.js"),
  login: () => import("./pages/auth.js"),
  signup: () => import("./pages/auth.js"),
};

initImageFallback();
initHeader();
initFooter();

const page = document.body.dataset.page;
const loadPage = PAGE_MODULES[page];

if (loadPage) {
  loadPage()
    .then((module) => module.init())
    .catch((err) => console.error(`Failed to initialise page "${page}"`, err));
}
