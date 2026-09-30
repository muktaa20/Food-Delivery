/** Landing page: popular dishes, reviews carousel and the "Get the App" teaser. */
import { $, $$ } from "../utils/dom.js";
import { getPopularProducts } from "../data/products.js";
import { renderProductCards, bindAddToCart } from "../ui/productCard.js";
import { showToast } from "../ui/toast.js";

function renderPopular() {
  const container = $("#popular-list");
  if (!container) return;
  renderProductCards(container, getPopularProducts(), { variant: "home" });
  bindAddToCart(container);
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
  renderPopular();
  initReviewsCarousel();
  bindComingSoon();
}
