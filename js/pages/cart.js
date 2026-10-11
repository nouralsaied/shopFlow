import { initTheme } from "../theme.js";
import { renderHeader, renderFooter, showError } from "../ui.js";
import { getProduct } from "../api.js";
import { getCart, setQty, removeFromCart } from "../cart.js";
import { formatPrice } from "../productCard.js";
import { calcTotals } from "../orders.js";

initTheme();
renderHeader();
renderFooter();

const contentEl = document.getElementById("cart-content");
const subtitleEl = document.getElementById("cart-subtitle");



// بيانات المنتجات اللي جبناها من الـ API (id ← منتج)
const productsById = new Map();

function showCartLoading() {
  contentEl.innerHTML = `
    <div class="cart-layout">
      <div>
        ${Array.from({ length: 3 }, () =>
          `<div class="skeleton" style="height:110px;margin-bottom:14px"></div>`).join("")}
      </div>
      <div class="skeleton" style="height:220px"></div>
    </div>`;
}

function showEmptyCart() {
  subtitleEl.textContent = "";
  contentEl.innerHTML = `
    <div class="state-box">
      <div class="state-icon">🛒</div>
      <h3>Your cart is empty</h3>
      <p>Looks like you haven't added anything yet.</p>
      <a href="products.html" class="btn">Start shopping</a>
    </div>`;
}

function itemRow(item) {
  const p = productsById.get(item.id);
  return `
    <div class="cart-item" data-id="${p.id}">
      <a href="product.html?id=${p.id}" class="cart-thumb">
        <img src="${p.thumbnail}" alt="${p.title}">
      </a>

      <div class="cart-info">
        <a href="product.html?id=${p.id}" class="cart-title">${p.title}</a>
        <div class="muted">${formatPrice(p.price)} each</div>
      </div>

      <div class="qty">
        <button type="button" data-action="minus" aria-label="Decrease">−</button>
        <input type="number" value="${item.qty}" min="1" max="${Math.max(p.stock, 1)}" data-action="input">
        <button type="button" data-action="plus" aria-label="Increase">+</button>
      </div>

      <div class="cart-line-total">${formatPrice(p.price * item.qty)}</div>

           <button type="button" class="cart-remove" data-action="remove" aria-label="Remove item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18"/>
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
        </svg>
      </button>
    </div>`;
}

function render() {
  const cart = getCart().filter((i) => productsById.has(i.id));

  if (cart.length === 0) return showEmptyCart();

  const count = cart.reduce((s, i) => s + i.qty, 0);
    const rawSubtotal = cart.reduce((s, i) => s + productsById.get(i.id).price * i.qty, 0);
  const { subtotal, shipping, total } = calcTotals(rawSubtotal);

  subtitleEl.textContent = `${count} item${count === 1 ? "" : "s"}`;

  contentEl.innerHTML = `
    <div class="cart-layout">
      <div class="cart-items">
        ${cart.map(itemRow).join("")}
      </div>

      <aside class="summary">
        <h2>Order Summary</h2>
        <div class="summary-row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
        <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? "Free" : formatPrice(shipping)}</span></div>
        <div class="summary-row total"><span>Total</span><span>${formatPrice(total)}</span></div>
        <a href="checkout.html" class="btn btn-block">Proceed to Checkout →</a>
        <a href="products.html" class="continue-link">← Continue Shopping</a>
      </aside>
    </div>`;
}

// حدث واحد لكل أزرار السلة (event delegation)
contentEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const row = btn.closest(".cart-item");
  if (!row) return;

  const id = Number(row.dataset.id);
  const item = getCart().find((i) => i.id === id);
  if (!item) return;
  const max = Math.max(productsById.get(id).stock, 1);

  switch (btn.dataset.action) {
    case "plus":
      setQty(id, Math.min(item.qty + 1, max));
      break;
    case "minus":
      setQty(id, item.qty - 1);
      break;
    case "remove":
      removeFromCart(id);
      break;
  }
});

contentEl.addEventListener("change", (e) => {
  if (e.target.dataset.action !== "input") return;
  const id = Number(e.target.closest(".cart-item").dataset.id);
  const max = Math.max(productsById.get(id).stock, 1);
  let v = parseInt(e.target.value, 10);
  if (isNaN(v) || v < 1) v = 1;
  setQty(id, Math.min(v, max));
});

// أي تغيير بالسلة (من هون أو من تبويب تاني) بيعيد الرسم
window.addEventListener("cart-changed", render);
window.addEventListener("storage", render);

async function load() {
  const cart = getCart();
  if (cart.length === 0) return showEmptyCart();

  showCartLoading();
  try {
    const products = await Promise.all(cart.map((i) => getProduct(i.id)));
    products.forEach((p) => productsById.set(p.id, p));
    render();
  } catch (err) {
    console.error(err);
    showError(contentEl, load, "Couldn't load your cart.");
  }
}

load();