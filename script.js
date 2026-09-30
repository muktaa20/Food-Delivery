  // var swiper = new Swiper(".mySwiper", {
  //     spaceBetween: 30,
  //     centeredSlides: true,
  //     autoplay: {
  //       delay: 2500,
  //       disableOnInteraction: false,
  //     },
  //     pagination: {
  //       el: ".swiper-pagination",
  //       clickable: true,
  //     },
  //     navigation: {
  //       nextEl: "#next",
  //       prevEl: "#prev",
  //     },
  //   });

  /* ========== Data (products) ========== */
const PRODUCTS = [
  {
    id: "p1",
    title: "Cheese Burger",
    price: 49,
    img: "images/cheeseburger.jpg",
    category: "burger",
    popular: true,
    desc: "Juicy burger with melted cheese"
  },
  {
    id: "p2",
    title: "Pepperoni Pizza",
    price: 199,
    img: "images/pizza.jpg",
    category: "pizza",
    popular: true,
    desc: "Classic pepperoni pizza"
  },
  {
    id: "p3",
    title: "Veg Noodles",
    price: 89,
    img: "images/noodles.jpg",
    category: "noodles",
    popular: false,
    desc: "Stir-fried veg noodles"
  },
  {
    id: "p4",
    title: "Chicken Burger",
    price: 79,
    img: "images/cheeseburger.jpg",
    category: "burger",
    popular: true,
    desc: "Tender chicken patty"
  }
];

/* ========== LocalStorage keys ========== */
const LS_CART = "fd_cart_v1";
const LS_USERS = "fd_users_v1";
const LS_AUTH = "fd_auth_v1";

/* ========== Small helpers ========== */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/* ========== App State helpers ========== */
function getCart() {
  try {
    return JSON.parse(localStorage.getItem(LS_CART)) || {};
  } catch (e) {
    return {};
  }
}
function saveCart(cart) {
  localStorage.setItem(LS_CART, JSON.stringify(cart));
  renderCartCount();
}
function clearCart() {
  localStorage.removeItem(LS_CART);
  renderCartCount();
}
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(LS_USERS)) || [];
  } catch (e) {
    return [];
  }
}
function saveUsers(users) {
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}
function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(LS_AUTH)) || null;
  } catch (e) {
    return null;
  }
}
function saveAuth(user) {
  localStorage.setItem(LS_AUTH, JSON.stringify(user));
}

/* ========== DOM ready ========== */
document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  renderPopularOnHome();
  initMenuPage();
  initAuthForms();
  renderCartCount();
  initCartPage();
  initCheckoutPage();
  initSwiper();

  // mobile menu toggle
  const hamburgers = $$(".hamburger");
  hamburgers.forEach((h) => {
    h.addEventListener("click", (e) => {
      const mobile = document.querySelector(".mobile-menu");
      if (mobile) mobile.classList.toggle("mobile-menu-active");
    });
  });

  // auth button behaviour
  $$(".auth-btn").forEach(btn => {
    btn.addEventListener("click", (ev) => {
      const auth = getAuth();
      if (auth) {
        // logout
        localStorage.removeItem(LS_AUTH);
        saveAuth(null);
        alert("Logged out");
        updateAuthUi();
      } else {
        window.location.href = "login.html";
      }
    });
  });

  updateAuthUi();
});

/* ========== NAVBAR & auth UI ========== */
function initNavbar() {
  updateAuthUi();
}

function updateAuthUi() {
  const auth = getAuth();
  $$(".auth-btn").forEach(el => {
    if (!el) return;
    if (auth) {
      el.innerHTML = `Hi, ${escapeHtml(auth.name || auth.username)} &nbsp;<i class="fa-solid fa-right-from-bracket"></i>`;
      el.classList.remove("btn");
      // clicking it logs out (already wired in DOMContentLoaded)
    } else {
      el.innerHTML = `Sign in &nbsp;<i class="fa-solid fa-right-from-bracket"></i>`;
      el.classList.add("btn");
    }
  });
}

/* ========== RENDER Popular on Home ========== */
function renderPopularOnHome() {
  const container = document.querySelector("section .card-list");
  if (!container) return;
  container.innerHTML = "";
  const pop = PRODUCTS.filter(p => p.popular);
  pop.forEach(p => {
    const card = document.createElement("div");
    card.className = "order-card";
    card.innerHTML = `
      <img src="${p.img}" alt="${escapeHtml(p.title)}" />
      <h4>${escapeHtml(p.title)}</h4>
      <div class="price">₹${formatNumber(p.price)}</div>
      <div class="card-actions">
        <a class="btn" href="menu.html">View</a>
        <button class="btn add-to-cart" data-id="${p.id}">Add to Cart</button>
      </div>
    `;
    container.appendChild(card);
  });

  // attach listeners
  $$(".add-to-cart").forEach(btn => {
    btn.addEventListener("click", () => {
      addToCart(btn.dataset.id);
    });
  });
}

/* ========== MENU page ========== */
function initMenuPage() {
  const grid = $("#menu-grid");
  if (!grid) return; // not on menu page

  function renderList(items) {
    grid.innerHTML = "";
    items.forEach(p => {
      const card = document.createElement("div");
      card.className = "order-card";
      card.innerHTML = `
        <img src="${p.img}" alt="${escapeHtml(p.title)}" />
        <h4>${escapeHtml(p.title)}</h4>
        <div class="price">₹${formatNumber(p.price)}</div>
        <p class="small para">${escapeHtml(p.desc || "")}</p>
        <div class="card-actions">
          <button class="btn add-to-cart" data-id="${p.id}">Add to Cart</button>
          <a class="btn" href="cart.html">Go to Cart</a>
        </div>
      `;
      grid.appendChild(card);
    });

    // attach listeners
    $$(".add-to-cart").forEach(btn => {
      btn.addEventListener("click", () => {
        addToCart(btn.dataset.id);
      });
    });
  }

  // initial render
  renderList(PRODUCTS);

  // filters
  $$(".filter-btn").forEach(b => {
    b.addEventListener("click", () => {
      const cat = b.dataset.cat;
      if (cat === "all") renderList(PRODUCTS);
      else renderList(PRODUCTS.filter(p => p.category === cat));
    });
  });
}

/* ========== CART logic ========== */
function addToCart(id, qty = 1) {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return;
  const cart = getCart();
  if (cart[id]) {
    cart[id].qty = Number(cart[id].qty) + Number(qty);
  } else {
    cart[id] = {
      id: product.id,
      title: product.title,
      price: Number(product.price),
      img: product.img,
      qty: Number(qty)
    };
  }
  saveCart(cart);
  animateCartAdd();
}

function animateCartAdd() {
  renderCartCount();
  // small visual feedback - toast
  const el = document.createElement("div");
  el.textContent = "Added to cart";
  el.style.position = "fixed";
  el.style.right = "1rem";
  el.style.bottom = "1rem";
  el.style.padding = ".6rem 1rem";
  el.style.background = "var(--gold-finger)";
  el.style.color = "white";
  el.style.borderRadius = "8px";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function renderCartCount() {
  const c = getCart();
  const totalQty = Object.values(c).reduce((acc, it) => acc + Number(it.qty), 0);
  $$(".cart-value").forEach(el => el.textContent = totalQty);
}

/* ========== CART PAGE rendering ========== */
function initCartPage() {
  const container = $("#cart-container");
  if (!container) return;
  function render() {
    const cart = getCart();
    container.innerHTML = "";
    const items = Object.values(cart);
    if (items.length === 0) {
      container.innerHTML = `<div class="text-center"><p>Your cart is empty</p><a class="btn" href="menu.html">Browse Menu</a></div>`;
      $("#cart-summary").innerHTML = "";
      renderCartCount();
      return;
    }
    items.forEach(it => {
      const node = document.createElement("div");
      node.className = "cart-item";
      node.innerHTML = `
        <img src="${it.img}" alt="${escapeHtml(it.title)}" />
        <div style="flex:1">
          <h4>${escapeHtml(it.title)}</h4>
          <div>₹${formatNumber(it.price)}</div>
          <div style="margin-top:.6rem" class="qty-controls">
            <button class="qty-decrease" data-id="${it.id}">-</button>
            <div style="padding:.2rem .6rem; border:1px solid #eee; border-radius:.4rem">${it.qty}</div>
            <button class="qty-increase" data-id="${it.id}">+</button>
            <button class="btn remove-item" data-id="${it.id}" style="margin-left:1rem">Remove</button>
          </div>
        </div>
        <div style="min-width:110px; text-align:right">
          <div>₹${formatNumber(Number(it.price) * Number(it.qty))}</div>
        </div>
      `;
      container.appendChild(node);
    });

    // attach listeners
    $$(".qty-increase").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.id;
      const cart = getCart();
      cart[id].qty = Number(cart[id].qty) + 1;
      saveCart(cart);
      render();
    }));
    $$(".qty-decrease").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.id;
      const cart = getCart();
      cart[id].qty = Number(cart[id].qty) - 1;
      if (cart[id].qty <= 0) delete cart[id];
      saveCart(cart);
      render();
    }));
    $$(".remove-item").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.id;
      const cart = getCart();
      delete cart[id];
      saveCart(cart);
      render();
    }));
    renderSummary();
    renderCartCount();
  }

  function renderSummary() {
    const cart = getCart();
    const items = Object.values(cart);
    const subtotal = items.reduce((acc, it) => acc + Number(it.price) * Number(it.qty), 0);
    const delivery = subtotal > 0 ? 30 : 0;
    const total = subtotal + delivery;

    const summary = document.getElementById("cart-summary");
    summary.innerHTML = `
      <div style="background:white; padding:1rem; border-radius:1rem">
        <h3>Order Summary</h3>
        <div>Subtotal: ₹${formatNumber(subtotal)}</div>
        <div>Delivery: ₹${formatNumber(delivery)}</div>
        <div style="font-weight:700; margin-top:.6rem">Total: ₹${formatNumber(total)}</div>
        <div style="margin-top:1rem">
          <a href="checkout.html" class="btn">Proceed to Checkout</a>
        </div>
      </div>
    `;
  }

  render();
}

/* ========== CHECKOUT page ========== */
function initCheckoutPage() {
  const form = document.getElementById("checkout-form");
  const summaryBox = document.getElementById("checkout-summary");
  if (!form || !summaryBox) return;

  function renderCheckoutSummary() {
    const cart = getCart();
    const items = Object.values(cart);
    if (items.length === 0) {
      summaryBox.innerHTML = `<div class="text-center">Your cart is empty. <a class="btn" href="menu.html">Browse Menu</a></div>`;
      return;
    }
    const subtotal = items.reduce((acc, it) => acc + Number(it.price) * Number(it.qty), 0);
    const delivery = subtotal > 0 ? 30 : 0;
    const total = subtotal + delivery;

    let html = `<h3>Order</h3><ul style="list-style:none; padding:0">`;
    items.forEach(it => {
      html += `<li style="margin-bottom:.6rem">${escapeHtml(it.title)} x ${it.qty} — ₹${formatNumber(Number(it.price) * Number(it.qty))}</li>`;
    });
    html += `</ul>
      <div>Subtotal: ₹${formatNumber(subtotal)}</div>
      <div>Delivery: ₹${formatNumber(delivery)}</div>
      <div style="font-weight:700; margin-top:.6rem">Total: ₹${formatNumber(total)}</div>
    `;
    summaryBox.innerHTML = html;
  }

  renderCheckoutSummary();

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const name = form["name"].value.trim();
    const phone = form["phone"].value.trim();
    const address = form["address"].value.trim();
    if (!name || !phone || !address) {
      $("#checkout-msg").textContent = "Please fill all fields.";
      return;
    }

    // place order (simulate)
    const order = {
      id: "ord_" + Date.now(),
      user: getAuth() ? getAuth().username : "guest",
      items: Object.values(getCart()),
      name, phone, address,
      createdAt: new Date().toISOString()
    };

    // here we would call backend — but we simulate success:
    clearCart();
    form.reset();
    $("#checkout-msg").textContent = "Order placed! Thank you.";
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1400);
  });
}

/* ========== AUTH (signup/login) ========== */
function initAuthForms() {
  const signup = $("#signup-form");
  const login = $("#login-form");

  if (signup) {
    signup.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const name = signup["name"].value.trim();
      const username = signup["username"].value.trim();
      const email = signup["email"].value.trim();
      const password = signup["password"].value;

      // simple validation
      if (!name || !username || !email || !password) {
        $("#signup-error").textContent = "Please fill all fields.";
        return;
      }
      if (password.length < 5) {
        $("#signup-error").textContent = "Password should be at least 5 characters.";
        return;
      }

      const users = getUsers();
      if (users.find(u => u.username === username || u.email === email)) {
        $("#signup-error").textContent = "User with same username or email already exists.";
        return;
      }

      users.push({ name, username, email, password });
      saveUsers(users);
      saveAuth({ name, username, email });
      // redirect to home
      window.location.href = "index.html";
    });
  }

  if (login) {
    login.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const input = login["username"].value.trim();
      const password = login["password"].value;

      if (!input || !password) {
        $("#login-error").textContent = "Please fill all fields.";
        return;
      }

      const users = getUsers();
      const user = users.find(u => (u.username === input || u.email === input) && u.password === password);
      if (!user) {
        $("#login-error").textContent = "Invalid username/email or password.";
        return;
      }
      saveAuth({ name: user.name, username: user.username, email: user.email });
      window.location.href = "index.html";
    });
  }
}

/* ========== UTILS ========== */
function formatNumber(n) {
  // convert to integer/float step-by-step:
  const num = Number(n);
  if (Number.isInteger(num)) return num.toString();
  return num.toFixed(2);
}
function escapeHtml(s) {
  if (!s && s !== 0) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ========== Swiper init (you provided) but guarded) ========== */
function initSwiper() {
  try {
    if (typeof Swiper !== "undefined") {
      new Swiper(".mySwiper", {
        spaceBetween: 30,
        centeredSlides: true,
        autoplay: {
          delay: 2500,
          disableOnInteraction: false,
        },
        pagination: {
          el: ".swiper-pagination",
          clickable: true,
        },
        navigation: {
          nextEl: "#next",
          prevEl: "#prev",
        },
      });
    }
  } catch (e) {
    // silent
  }
}

/* ======= small safe fallback for module-less env ===== */
window.addToCart = addToCart;
