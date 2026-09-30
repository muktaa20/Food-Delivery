/** Landing page: popular dishes, reviews carousel and the "Get the App" teaser. */
import { $, $$ } from "../utils/dom.js";
import { api } from "../services/api.js";
import { renderProductCards, bindAddToCart } from "../ui/productCard.js";
import { renderLoading, renderError, renderEmpty } from "../ui/states.js";
import { showToast } from "../ui/toast.js";

const productsById = new Map();

async function loadPopular(container) {
  renderLoading(container, 6);
  try {
    const items = await api.getMenu({ popular: true });
    items.forEach((item) => productsById.set(item.id, item));
    if (items.length === 0) renderEmpty(container, "No popular dishes right now. Check back soon!");
    else renderProductCards(container, items, { variant: "home" });
  } catch (err) {
    renderError(container, err.message, () => loadPopular(container));
  }
}

/** Swiper is loaded as a classic <script> from a CDN, so it's a window global. */
function initReviewsCarousel() {
  if (typeof window.Swiper === "undefined" || !$(".mySwiper")) return;
  try {
    new window.Swiper(".mySwiper", {
      spaceBetween: 30,
      centeredSlides: true,
      autoplay: { delay: 2500, disableOnInteraction: false },
      pagination: { el: ".swiper-pagination", clickable: true },
      navigation: { nextEl: "#next", prevEl: "#prev" },
    });
  } catch (err) {
    console.warn("Reviews carousel failed to initialise", err);
  }
}

function bindComingSoon() {
  $$("[data-coming-soon]").forEach((btn) => {
    btn.addEventListener("click", () => showToast(btn.dataset.comingSoon));
  });
}

export function init() {
  const popular = $("#popular-list");
  if (popular) {
    bindAddToCart(popular, (id) => productsById.get(id));
    loadPopular(popular);
  }
  initReviewsCarousel();
  bindComingSoon();
}
