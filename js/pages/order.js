import { $ } from "../utils/dom.js";
import { escapeHtml, formatPrice } from "../utils/format.js";
import { api } from "../services/api.js";
import { clearActiveOrder, getActiveOrderId, getCart, restoreCart } from "../store.js";
import { isCartEmpty } from "../domain/cart.js";
import { pointAlongRoute, routeUntil } from "../domain/geo.js";
import { ORDER_STAGES, stageMessage } from "../domain/orderStatus.js";
import { billDetailsHTML } from "../ui/billDetails.js";
import { confirmDialog } from "../ui/confirmDialog.js";
import { renderEmpty, renderError } from "../ui/states.js";
import { showToast } from "../ui/toast.js";
import { hasGoogleMapsKey, loadGoogleMaps } from "../services/googleMaps.js";

const POLL_MS = 4000;
const MAX_BACKOFF_MS = 30_000;
const OUT_FOR_DELIVERY = ORDER_STAGES.findIndex((s) => s.id === "OUT_FOR_DELIVERY");
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const formatTime = (date) => new Date(date).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function layoutHTML(order) {
  const items = order.items
    .map((i) => `<li class="summary-line"><span>${escapeHtml(i.title)} × ${i.qty}</span><span>${formatPrice(i.price * i.qty)}</span></li>`)
    .join("");
  return `
    <div class="track" data-loaded>
      <div class="track-head">
        <div>
          <p class="eyebrow">Order #${escapeHtml(order.id)} · ${escapeHtml(order.restaurant.name)}</p>
          <h2 id="track-title"></h2>
          <p id="track-text" class="muted"></p>
        </div>
        <div class="eta-card" id="eta-card">
          <span class="small" id="eta-label">Arriving in</span>
          <strong id="eta-countdown">--:--</strong>
          <span class="small muted" id="eta-clock"></span>
        </div>
      </div>

      <ol class="track-steps" id="track-steps">
        ${ORDER_STAGES.map(
          (s) => `
          <li data-stage="${s.id}">
            <span class="track-step-icon"><i class="fa-solid ${s.icon}" aria-hidden="true"></i></span>
            <span class="track-step-label">${s.label}</span>
            <span class="track-step-time small muted"></span>
          </li>`
        ).join("")}
      </ol>
      <p id="connection-status" class="small warning-msg" role="status" hidden></p>

      <div class="track-grid">
        <div class="map-card">
          <div id="order-map" role="region" aria-label="Live map of your delivery"></div>
          <p class="small muted map-legend">
            <span><i class="fa-solid fa-store" aria-hidden="true"></i> ${escapeHtml(order.restaurant.name)}</span>
            <span><i class="fa-solid fa-motorcycle" aria-hidden="true"></i> Rider</span>
            <span><i class="fa-solid fa-house" aria-hidden="true"></i> You</span>
            <span>${order.distanceKm} km route</span>
          </p>
        </div>

        <aside class="track-aside">
          <div class="summary-card rider-card" id="rider-card" hidden>
            <span class="rider-avatar"><i class="fa-solid fa-user" aria-hidden="true"></i></span>
            <div>
              <strong>${escapeHtml(order.rider.name)}</strong>
              <p class="small muted">${escapeHtml(order.rider.vehicle)}</p>
            </div>
            <button type="button" class="btn btn-sm" id="call-rider" aria-label="Call ${escapeHtml(order.rider.name)}">
              <i class="fa-solid fa-phone" aria-hidden="true"></i>
            </button>
          </div>

          <div class="summary-card" id="notify-card" hidden>
            <p class="small">Get a notification when your order status changes, even in another tab.</p>
            <button type="button" class="btn btn-sm mt-2" id="notify-btn">
              <i class="fa-solid fa-bell" aria-hidden="true"></i> Turn on notifications
            </button>
          </div>

          <div class="summary-card" id="delivered-card" hidden>
            <p>Hungry again? Add the same dishes to your cart in one tap.</p>
            <button type="button" class="btn btn-block mt-2" id="reorder">Order again</button>
          </div>

          <div class="summary-card">
            <h3>Order details</h3>
            <ul class="summary-lines">${items}</ul>
            ${billDetailsHTML(order.pricing)}
            <div class="order-meta small">
              <p><strong>Payment:</strong> ${escapeHtml(order.payment.label)}${order.payment.paid ? " (paid)" : ""}</p>
              <p><strong>Deliver to:</strong> ${escapeHtml(order.customer.name)}, ${escapeHtml(order.customer.address)}</p>
              <p><strong>Placed at:</strong> ${formatTime(order.createdAt)}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `;
}

const skeletonHTML = `
  <div aria-hidden="true">
    <div class="skeleton skeleton-line short"></div>
    <div class="skeleton skeleton-line" style="height:2.5rem;width:50%"></div>
    <div class="skeleton" style="height:420px;margin-top:2rem;border-radius:1rem"></div>
  </div>
`;

const toLatLng = ([lat, lng]) => ({ lat, lng });

/** Round marker icon drawn as SVG, so Google Maps needs no extra assets. */
function googlePin(maps, color, glyph) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="17" fill="#fff" stroke="${color}" stroke-width="3"/>
    <text x="20" y="26" font-size="17" text-anchor="middle">${glyph}</text></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new maps.Size(40, 40),
    anchor: new maps.Point(20, 20),
  };
}

/** Google Maps version of the tracking map; same interface as the Leaflet one. */
function createGoogleMap(maps, el, order) {
  el.innerHTML = "";
  const map = new maps.Map(el, {
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    gestureHandling: "cooperative",
    clickableIcons: false,
  });
  const path = order.route.map(toLatLng);

  new maps.Polyline({
    map,
    path,
    strokeOpacity: 0,
    icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.7, strokeColor: "#616161", scale: 3 }, offset: "0", repeat: "14px" }],
  });
  const travelled = new maps.Polyline({ map, path: [], strokeColor: "#ea580c", strokeWeight: 5 });

  new maps.Marker({ map, position: toLatLng(order.restaurant.location), title: order.restaurant.name, icon: googlePin(maps, "#c0392b", "🏪") });
  new maps.Marker({ map, position: toLatLng(order.customer.location), title: "Delivery location", icon: googlePin(maps, "#15803d", "🏠") });
  const rider = new maps.Marker({ position: path[0], title: order.rider.name, icon: googlePin(maps, "#ea580c", "🛵"), zIndex: 1000 });

  const bounds = new maps.LatLngBounds();
  path.forEach((p) => bounds.extend(p));
  map.fitBounds(bounds, 48);

  return {
    setRider(fraction, visible) {
      rider.setMap(visible ? map : null);
      rider.setPosition(toLatLng(pointAlongRoute(order.route, fraction)));
      travelled.setPath(visible ? routeUntil(order.route, fraction).map(toLatLng) : []);
    },
  };
}

/**
 * Returns a map controller right away. With a Google Maps key it shows a Google
 * map once the API loads (replaying the latest rider position); without a key,
 * or if Google fails, it uses the Leaflet/OpenStreetMap map.
 */
function createMap(el, order) {
  if (!hasGoogleMapsKey()) return createLeafletMap(el, order);

  let impl = null;
  let last = null;
  const useFallback = () => {
    impl = createLeafletMap(el, order);
    if (impl && last) impl.setRider(...last);
  };

  el.innerHTML = `<div class="map-fallback"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><p>Loading map…</p></div>`;
  loadGoogleMaps()
    .then((maps) => {
      window.gm_authFailure = useFallback;
      impl = createGoogleMap(maps, el, order);
      if (last) impl.setRider(...last);
    })
    .catch((err) => {
      console.warn(err.message, "Falling back to OpenStreetMap.");
      useFallback();
    });

  return {
    setRider(fraction, visible) {
      last = [fraction, visible];
      impl?.setRider(fraction, visible);
    },
  };
}

/** Leaflet map with restaurant, customer and rider markers. Returns null if Leaflet didn't load. */
function createLeafletMap(el, order) {
  el.innerHTML = "";
  const L = window.L;
  if (!L) {
    el.innerHTML = `<div class="map-fallback"><i class="fa-solid fa-map-location-dot" aria-hidden="true"></i><p>Map unavailable right now. Tracking still works.</p></div>`;
    return null;
  }
  const map = L.map(el, { scrollWheelZoom: false });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  const pin = (className, icon) =>
    L.divIcon({ className: `map-pin ${className}`, html: `<i class="fa-solid ${icon}"></i>`, iconSize: [38, 38], iconAnchor: [19, 19] });

  L.polyline(order.route, { color: "#616161", weight: 4, opacity: 0.8, dashArray: "6 8" }).addTo(map);
  const travelled = L.polyline([], { color: "#fc8019", weight: 5 }).addTo(map);
  L.marker(order.restaurant.location, { icon: pin("pin-restaurant", "fa-store"), keyboard: false })
    .bindTooltip(order.restaurant.name)
    .addTo(map);
  L.marker(order.customer.location, { icon: pin("pin-home", "fa-house"), keyboard: false })
    .bindTooltip("Delivery location")
    .addTo(map);
  const rider = L.marker(order.route[0], { icon: pin("pin-rider", "fa-motorcycle"), keyboard: false, zIndexOffset: 1000 })
    .bindTooltip(order.rider.name);

  map.fitBounds(L.latLngBounds(order.route), { padding: [40, 40] });

  return {
    /** Place the rider at `fraction` of the route and extend the travelled line. */
    setRider(fraction, visible) {
      if (visible && !map.hasLayer(rider)) rider.addTo(map);
      if (!visible && map.hasLayer(rider)) rider.remove();
      rider.setLatLng(pointAlongRoute(order.route, fraction));
      travelled.setLatLngs(visible ? routeUntil(order.route, fraction) : []);
    },
  };
}

export function init() {
  const root = $("#order-root");
  if (!root) return;

  const params = new URLSearchParams(location.search);
  const orderId = params.get("id") ?? getActiveOrderId();
  if (!orderId) {
    renderEmpty(root, "You don't have an active order right now.", {
      label: "Browse menu",
      onClick: () => (location.href = "menu.html"),
    });
    return;
  }
  if (!params.has("id")) history.replaceState(null, "", `order.html?id=${encodeURIComponent(orderId)}`);

  let order = null;
  let map = null;
  let lastStatus = null;
  let etaDeadline = 0;
  let riderShown = 0;
  let riderFrame = 0;
  let pollTimer = 0;
  let tickTimer = 0;
  let failures = 0;
  let delivered = false;

  /* ---------- Rendering ---------- */

  function animateRider(target, visible, { snap = false } = {}) {
    cancelAnimationFrame(riderFrame);
    if (!map) return;
    const from = riderShown;
    if (snap || !visible || prefersReducedMotion() || target < from) {
      riderShown = target;
      map.setRider(target, visible);
      return;
    }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / POLL_MS);
      riderShown = from + (target - from) * t;
      map.setRider(riderShown, true);
      if (t < 1) riderFrame = requestAnimationFrame(step);
    };
    riderFrame = requestAnimationFrame(step);
  }

  function renderCountdown() {
    const countdown = $("#eta-countdown");
    if (!countdown) return;
    const title = $("#track-title").textContent;
    if (delivered) {
      document.title = "Delivered · Foodie";
      return;
    }
    const remaining = formatCountdown(etaDeadline - Date.now());
    countdown.textContent = remaining;
    document.title = `(${remaining}) ${title} · Foodie`;
  }

  function notifyStatusChange(status) {
    const { title, text } = stageMessage(status, order);
    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
      new Notification(`Foodie: ${title}`, { body: text, tag: order.id });
    } else {
      showToast(`${title}. ${text}`, { duration: 4000 });
    }
  }

  function update(progress) {
    const { status, stageIndex, timeline, etaSeconds, riderProgress } = progress;
    const { title, text } = stageMessage(status, order);
    $("#track-title").textContent = title;
    $("#track-text").textContent = text;

    timeline.forEach((stage, i) => {
      const li = $(`#track-steps [data-stage="${stage.id}"]`);
      li.classList.toggle("is-done", stage.reached && i < stageIndex);
      li.classList.toggle("is-current", i === stageIndex);
      if (i === stageIndex) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
      li.querySelector(".track-step-time").textContent = stage.reached ? formatTime(stage.reachedAt) : "";
    });

    delivered = progress.delivered;
    etaDeadline = Date.now() + etaSeconds * 1000;
    if (delivered) {
      $("#eta-label").textContent = "Delivered at";
      $("#eta-countdown").textContent = formatTime(timeline[timeline.length - 1].reachedAt);
      $("#eta-clock").textContent = "";
    } else {
      $("#eta-clock").textContent = `by ${formatTime(etaDeadline)}`;
    }
    renderCountdown();

    const riderVisible = stageIndex >= OUT_FOR_DELIVERY && !delivered;
    $("#rider-card").hidden = !riderVisible;
    $("#delivered-card").hidden = !delivered;
    $("#notify-card").hidden = delivered || !("Notification" in window) || Notification.permission !== "default";
    animateRider(delivered ? 1 : riderProgress, stageIndex >= OUT_FOR_DELIVERY, { snap: lastStatus === null });

    if (lastStatus && status !== lastStatus) notifyStatusChange(status);
    lastStatus = status;

    if (delivered) {
      stopLive();
      clearActiveOrder(order.id);
    }
  }

  /* ---------- Live updates ---------- */

  function stopLive() {
    clearTimeout(pollTimer);
    clearInterval(tickTimer);
  }

  function schedulePoll(delay = POLL_MS) {
    clearTimeout(pollTimer);
    pollTimer = setTimeout(poll, delay);
  }

  async function poll() {
    if (delivered) return;
    if (document.hidden) return; // resumed by visibilitychange
    const status = $("#connection-status");
    try {
      const fresh = await api.getOrder(orderId);
      failures = 0;
      status.hidden = true;
      update(fresh.progress);
    } catch {
      failures++;
      status.hidden = false;
      status.textContent = "Connection lost. Retrying…";
    }
    if (!delivered) schedulePoll(failures ? Math.min(MAX_BACKOFF_MS, POLL_MS * 2 ** failures) : POLL_MS);
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && order && !delivered) poll();
  });

  /* ---------- Actions ---------- */

  root.addEventListener("click", async (e) => {
    if (e.target.closest("#call-rider")) {
      showToast("Calling is disabled in this demo", { duration: 2000 });
    }
    if (e.target.closest("#notify-btn")) {
      const result = await Notification.requestPermission();
      $("#notify-card").hidden = true;
      showToast(result === "granted" ? "Notifications on. We'll keep you posted." : "Notifications are blocked in your browser settings.", {
        duration: 2500,
      });
    }
    if (e.target.closest("#reorder")) {
      if (!isCartEmpty(getCart())) {
        const ok = await confirmDialog({
          title: "Replace your cart?",
          message: "Your cart already has dishes. Ordering again will replace them with this order's items.",
          confirmLabel: "Replace cart",
        });
        if (!ok) return;
      }
      restoreCart({
        restaurant: { id: order.restaurant.id, name: order.restaurant.name },
        items: Object.fromEntries(order.items.map((i) => [i.id, i.qty])),
      });
      location.href = "cart.html";
    }
  });

  /* ---------- Start ---------- */

  async function load() {
    root.innerHTML = skeletonHTML;
    try {
      order = await api.getOrder(orderId);
    } catch (err) {
      if (err.status === 404) {
        clearActiveOrder(orderId);
        renderEmpty(root, "We couldn't find that order.", { label: "Browse menu", onClick: () => (location.href = "menu.html") });
      } else {
        renderError(root, err.message, load);
      }
      return;
    }
    root.innerHTML = layoutHTML(order);
    map = createMap($("#order-map"), order);
    update(order.progress);
    if (!delivered) {
      tickTimer = setInterval(renderCountdown, 1000);
      schedulePoll();
    }
  }

  load();
}
