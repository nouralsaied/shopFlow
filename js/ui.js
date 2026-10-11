import { toggleTheme } from "./theme.js";
import { toggleFavorite, getFavorites } from "./favorites.js";
import { cartCount } from "./cart.js";

function currentPage() {
  return location.pathname.split("/").pop() || "index.html";
}

function isActive(href) {
  return currentPage() === href ? "active" : "";
}

function navLink(href, label) {
  return `<a href="${href}" class="nav-link ${isActive(href)}">${label}</a>`;
}

/* ===== أيقونات ===== */
const ICON = {
  home: `<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>`,
  grid: `<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>`,
  cart: `<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>`,
  box: `<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>`,
  heart: `<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>`,
};

function svg(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</svg>`;
}

/* ===== عدّادات (الهيدر + الشريط السفلي) ===== */
export function updateBadges() {
  const favN = getFavorites().length;
  const cartN = cartCount();

  document.querySelectorAll('[data-badge="fav"]').forEach((el) => {
    el.textContent = favN;
    el.hidden = favN === 0;
  });
  document.querySelectorAll('[data-badge="cart"]').forEach((el) => {
    el.textContent = cartN;
    el.hidden = cartN === 0;
  });
}

window.addEventListener("favorites-changed", updateBadges);
window.addEventListener("cart-changed", updateBadges);
window.addEventListener("storage", updateBadges);

/* ===== أزرار القلب على الكروت ===== */
let favHandlerBound = false;
function bindFavButtons() {
  if (favHandlerBound) return;
  favHandlerBound = true;
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".fav-btn");
    if (!btn) return;
    const nowFav = toggleFavorite(btn.dataset.id);
    btn.classList.toggle("active", nowFav);
  });
}

/* ===== Toast ===== */
export function showToast(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

/* ===== Header ===== */
export function renderHeader() {
  const el = document.getElementById("app-header");

  el.innerHTML = `
    <header class="site-header">
      <div class="container header-inner">

        <a href="index.html" class="logo">
          <span class="logo-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <path d="M3 6h18"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </span>
          <span class="logo-text">ShopFlow</span>
        </a>

        <form class="header-search" data-search>
          <input type="search" placeholder="Search for products..." aria-label="Search products">
        </form>

        <nav class="main-nav">
          ${navLink("index.html", "Home")}
          ${navLink("products.html", "Products")}
          <a href="checkout.html?tab=orders" class="nav-link ${isActive("checkout.html")}">Orders</a>
        </nav>

        <div class="header-actions">

          <button class="icon-btn" id="theme-btn" aria-label="Toggle theme">
            <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>
            </svg>
            <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
            </svg>
          </button>

          <a href="products.html?favorites=1" class="icon-btn" aria-label="Favorites">
            ${svg("heart")}
            <span class="badge" data-badge="fav" hidden>0</span>
          </a>

          <a href="cart.html" class="icon-btn header-cart" aria-label="Cart">
            ${svg("cart")}
            <span class="badge" data-badge="cart" hidden>0</span>
          </a>

          <button class="icon-btn menu-btn" id="menu-btn" aria-label="Menu" aria-expanded="false">
            <svg class="icon-open" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            <svg class="icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>

        </div>
      </div>

      <div class="mobile-panel" id="mobile-panel">
        <form class="mobile-search" data-search>
          <input type="search" placeholder="Search for products..." aria-label="Search products">
        </form>
        <a href="index.html" class="${isActive("index.html")}">Home</a>
        <a href="products.html" class="${isActive("products.html")}">Products</a>
        <a href="products.html?favorites=1">Favorites</a>
        <a href="cart.html" class="${isActive("cart.html")}">Cart</a>
        <a href="checkout.html?tab=orders" class="${isActive("checkout.html")}">Orders</a>
      </div>
    </header>
  `;

  // شريط التنقل السفلي (بيظهر بالموبايل بس)
  document.getElementById("bottom-nav")?.remove();
  const bottom = document.createElement("nav");
  bottom.id = "bottom-nav";
  bottom.className = "bottom-nav";
  bottom.setAttribute("aria-label", "Mobile navigation");
  bottom.innerHTML = `
    <a href="index.html" class="${isActive("index.html")}">${svg("home")}<span>Home</span></a>
    <a href="products.html" class="${isActive("products.html")}">${svg("grid")}<span>Products</span></a>
    <a href="cart.html" class="${isActive("cart.html")}">
      <span class="bn-icon">${svg("cart")}<span class="badge" data-badge="cart" hidden>0</span></span>
      <span>Cart</span>
    </a>
    <a href="checkout.html?tab=orders" class="${isActive("checkout.html")}">${svg("box")}<span>Orders</span></a>
  `;
  document.body.appendChild(bottom);

  // زر الثيم
  document.getElementById("theme-btn").addEventListener("click", toggleTheme);

  // زر القائمة
  const menuBtn = document.getElementById("menu-btn");
  const panel = document.getElementById("mobile-panel");
  menuBtn.addEventListener("click", () => {
    const open = panel.classList.toggle("open");
    menuBtn.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", open);
  });

  // البحث (الهيدر + قائمة الموبايل)
  el.querySelectorAll("form[data-search]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = form.querySelector("input").value.trim();
      location.href = q ? `products.html?q=${encodeURIComponent(q)}` : "products.html";
    });
  });

  updateBadges();
  bindFavButtons();
}

/* ===== حالات الواجهة ===== */
export function showLoading(container, count = 4) {
  container.innerHTML = `
    <div class="product-grid">
      ${Array.from({ length: count }, () => `
        <div class="skeleton-card">
          <div class="skeleton skeleton-img"></div>
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-line short"></div>
        </div>`).join("")}
    </div>`;
}

export function showEmpty(container, message = "Nothing here yet.") {
  container.innerHTML = `
    <div class="state-box">
      <div class="state-icon">📭</div>
      <h3>${message}</h3>
    </div>`;
}

export function showError(container, retryFn, message = "Something went wrong.") {
  container.innerHTML = `
    <div class="state-box">
      <div class="state-icon">⚠️</div>
      <h3>${message}</h3>
      <p>Please check your connection and try again.</p>
      <button class="btn" id="retry-btn">Try again</button>
    </div>`;
  container.querySelector("#retry-btn").addEventListener("click", retryFn);
}

/* ===== Footer ===== */
export function renderFooter() {
  const el = document.getElementById("app-footer");
  el.innerHTML = `
    <footer class="site-footer">
      <div class="container footer-inner">
        <span>© ${new Date().getFullYear()} ShopFlow — Shop smarter, live better.</span>
        <nav class="footer-links">
          <a href="index.html">Home</a>
          <a href="products.html">Products</a>
          <a href="cart.html">Cart</a>
        </nav>
      </div>
    </footer>`;
}