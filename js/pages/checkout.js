import { initTheme } from "../theme.js";
import { renderHeader, renderFooter, showError } from "../ui.js";
import { getProduct } from "../api.js";
import { getCart, clearCart } from "../cart.js";
import { formatPrice } from "../productCard.js";
import { calcTotals, getOrders, saveOrder, getStatus } from "../orders.js";

initTheme();
renderHeader();
renderFooter();

const checkoutEl = document.getElementById("view-checkout");
const ordersEl = document.getElementById("view-orders");

const productsById = new Map();
let step = 1;
let currentView = "checkout";
let ordersFilter = "previous";
let justPlaced = null;

// منع حقن HTML من اللي بيكتبه المستخدم
function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

/* =========================================================
   تعريف الحقول: منولّد منها الـ HTML ومنتحقق منها بنفس المكان
   ========================================================= */
function validExpiry(v) {
  const m = v.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  return new Date(year, month, 1) > new Date(); // لسا ما انتهت
}

const FIELDS = {
  1: [
    { id: "fullName", label: "Full Name", placeholder: "John Doe", autocomplete: "name" },
    { id: "email", label: "Email Address", type: "email", placeholder: "john@example.com",
      autocomplete: "email", rule: (v) => /^\S+@\S+\.\S+$/.test(v), msg: "Enter a valid email address" },
    { id: "phone", label: "Phone Number", type: "tel", placeholder: "+1 234 567 890",
      autocomplete: "tel", rule: (v) => v.replace(/\D/g, "").length >= 7, msg: "Enter a valid phone number" },
    { id: "address1", label: "Address Line 1", placeholder: "123 Main St", autocomplete: "address-line1", full: true },
    { id: "address2", label: "Address Line 2", placeholder: "Apartment, suite, etc.",
      autocomplete: "address-line2", full: true, optional: true },
    { id: "city", label: "City", placeholder: "New York", autocomplete: "address-level2" },
    { id: "state", label: "State", placeholder: "NY", autocomplete: "address-level1" },
    { id: "zip", label: "ZIP Code", placeholder: "10001", autocomplete: "postal-code",
      rule: (v) => /^[A-Za-z0-9 -]{3,10}$/.test(v), msg: "Enter a valid ZIP code" },
  ],
  2: [
    { id: "cardName", label: "Name on Card", placeholder: "John Doe", autocomplete: "cc-name", full: true },
    { id: "cardNumber", label: "Card Number", placeholder: "4242 4242 4242 4242", inputmode: "numeric",
      autocomplete: "cc-number", full: true,
      rule: (v) => /^\d{13,19}$/.test(v.replace(/\s/g, "")), msg: "Enter a valid card number" },
    { id: "expiry", label: "Expiry (MM/YY)", placeholder: "08/28", inputmode: "numeric",
      autocomplete: "cc-exp", rule: validExpiry, msg: "Enter a valid, future date" },
    { id: "cvv", label: "CVV", placeholder: "123", inputmode: "numeric",
      autocomplete: "cc-csc", rule: (v) => /^\d{3,4}$/.test(v), msg: "3 or 4 digits" },
  ],
};

function fieldHTML(f) {
  return `
    <div class="field ${f.full ? "full" : ""}">
      <label for="${f.id}">${f.label}${f.optional ? " (optional)" : ""}</label>
      <input id="${f.id}" name="${f.id}" type="${f.type || "text"}"
             placeholder="${f.placeholder || ""}"
             ${f.autocomplete ? `autocomplete="${f.autocomplete}"` : ""}
             ${f.inputmode ? `inputmode="${f.inputmode}"` : ""}>
      <small class="error" id="err-${f.id}"></small>
    </div>`;
}

// بيتحقق من حقول خطوة معينة ويعرض الأخطاء. بيرجّع true إذا كلها سليمة
function validateStep(n) {
  let ok = true;
  for (const f of FIELDS[n]) {
    const input = document.getElementById(f.id);
    const value = input.value.trim();
    let error = "";

    if (!value && !f.optional) error = "This field is required";
    else if (value && f.rule && !f.rule(value)) error = f.msg;

    document.getElementById(`err-${f.id}`).textContent = error;
    input.classList.toggle("invalid", Boolean(error));
    if (error && ok) input.focus(); // بيودّي المؤشر لأول خطأ
    if (error) ok = false;
  }
  return ok;
}

function values() {
  const v = {};
  [...FIELDS[1], ...FIELDS[2]].forEach((f) => {
    v[f.id] = document.getElementById(f.id).value.trim();
  });
  return v;
}

/* =========================================================
   بيانات السلة
   ========================================================= */
function getLines() {
  return getCart()
    .filter((i) => productsById.has(i.id))
    .map((i) => {
      const p = productsById.get(i.id);
      return { id: p.id, title: p.title, thumbnail: p.thumbnail, price: p.price, qty: i.qty };
    });
}

/* =========================================================
   عرض صفحة الـ Checkout
   ========================================================= */
function showCheckoutLoading() {
  checkoutEl.innerHTML = `
    <div class="checkout-layout">
      <div class="skeleton" style="height:420px"></div>
      <div class="skeleton" style="height:260px"></div>
    </div>`;
}

function showEmptyCheckout() {
  checkoutEl.innerHTML = `
    <div class="state-box">
      <div class="state-icon">🛒</div>
      <h3>Nothing to check out</h3>
      <p>Your cart is empty.</p>
      <a href="products.html" class="btn">Start shopping</a>
    </div>`;
}

function renderCheckout() {
  const lines = getLines();
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const totals = calcTotals(subtotal);
  step = 1;

  checkoutEl.innerHTML = `
    <div class="checkout-layout">

      <form class="form-card" id="checkout-form" novalidate>
        <h1>Checkout</h1>

        <ol class="stepper">
          <li data-step="1" class="active"><span>1</span> Shipping Info</li>
          <li data-step="2"><span>2</span> Payment</li>
          <li data-step="3"><span>3</span> Review</li>
        </ol>

        <div data-panel="1">
          <h2>Customer Information</h2>
          <div class="fields">${FIELDS[1].map(fieldHTML).join("")}</div>
        </div>

        <div data-panel="2" hidden>
          <h2>Payment</h2>
          <p class="notice">🔒 Demo only. Please don't enter a real card number.</p>
          <div class="fields">${FIELDS[2].map(fieldHTML).join("")}</div>
        </div>

        <div data-panel="3" hidden>
          <h2>Review your order</h2>
          <div id="review"></div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-ghost" id="back-btn" hidden>← Back</button>
          <button type="submit" class="btn" id="next-btn">Continue →</button>
        </div>
      </form>

      <aside class="summary">
        <h2>Order Summary</h2>
        <div class="mini-items">
          ${lines.map((l) => `
            <div class="mini-item">
              <img src="${l.thumbnail}" alt="${esc(l.title)}">
              <div>
                <div class="mini-title">${esc(l.title)}</div>
                <div class="muted">Qty ${l.qty}</div>
              </div>
              <strong>${formatPrice(l.price * l.qty)}</strong>
            </div>`).join("")}
        </div>
        <div class="summary-row"><span>Subtotal</span><span>${formatPrice(totals.subtotal)}</span></div>
        <div class="summary-row"><span>Shipping</span><span>${totals.shipping === 0 ? "Free" : formatPrice(totals.shipping)}</span></div>
        <div class="summary-row total"><span>Total</span><span>${formatPrice(totals.total)}</span></div>
      </aside>
    </div>`;

  bindCheckoutForm();
}

function goTo(n) {
  step = n;
  document.querySelectorAll("[data-panel]").forEach((p) => {
    p.hidden = Number(p.dataset.panel) !== n;
  });
  document.querySelectorAll(".stepper li").forEach((li) => {
    const i = Number(li.dataset.step);
    li.classList.toggle("active", i === n);
    li.classList.toggle("done", i < n);
  });
  document.getElementById("back-btn").hidden = n === 1;
  document.getElementById("next-btn").textContent = n === 3 ? "Place Order" : "Continue →";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function buildReview() {
  const v = values();
  const last4 = v.cardNumber.replace(/\s/g, "").slice(-4);
  document.getElementById("review").innerHTML = `
    <div class="review-block">
      <h4>Shipping to</h4>
      <p>${esc(v.fullName)}<br>
         ${esc(v.address1)}${v.address2 ? ", " + esc(v.address2) : ""}<br>
         ${esc(v.city)}, ${esc(v.state)} ${esc(v.zip)}<br>
         ${esc(v.email)} · ${esc(v.phone)}</p>
    </div>
    <div class="review-block">
      <h4>Payment</h4>
      <p>Card ending in <strong>${esc(last4)}</strong></p>
    </div>`;
}

function bindCheckoutForm() {
  const form = document.getElementById("checkout-form");

  // تنسيق تلقائي أثناء الكتابة + مسح رسالة الخطأ
  form.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "cardNumber") {
      const d = t.value.replace(/\D/g, "").slice(0, 19);
      t.value = d.replace(/(.{4})/g, "$1 ").trim();
    } else if (t.id === "expiry") {
      const d = t.value.replace(/\D/g, "").slice(0, 4);
      t.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    } else if (t.id === "cvv") {
      t.value = t.value.replace(/\D/g, "").slice(0, 4);
    }
    if (t.classList.contains("invalid")) {
      t.classList.remove("invalid");
      document.getElementById(`err-${t.id}`).textContent = "";
    }
  });

  document.getElementById("back-btn").addEventListener("click", () => goTo(step - 1));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (step < 3) {
      if (!validateStep(step)) return;
      if (step === 2) buildReview();
      goTo(step + 1);
    } else {
      placeOrder();
    }
  });
}

/* =========================================================
   تنفيذ الطلب (وهمي)
   ========================================================= */
function placeOrder() {
  const btn = document.getElementById("next-btn");
  btn.disabled = true;
  btn.textContent = "Processing...";

  // تأخير بسيط لمحاكاة الدفع
  setTimeout(() => {
    const v = values();
    const lines = getLines();
    const totals = calcTotals(lines.reduce((s, l) => s + l.price * l.qty, 0));

    const order = {
      id: `ORD-${String(Date.now()).slice(-6)}`,
      createdAt: Date.now(),
      items: lines,
      ...totals,
      customer: {
        fullName: v.fullName,
        email: v.email,
        phone: v.phone,
        address: `${v.address1}${v.address2 ? ", " + v.address2 : ""}, ${v.city}, ${v.state} ${v.zip}`,
      },
      cardLast4: v.cardNumber.replace(/\s/g, "").slice(-4), // مش الرقم كامل!
    };

    saveOrder(order);
    clearCart();
    justPlaced = order.id;
    ordersFilter = "active";
    showEmptyCheckout();
    setView("orders");
  }, 1200);
}

/* =========================================================
   عرض الطلبات السابقة
   ========================================================= */
function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function orderCard(o) {
  const status = getStatus(o);
  const shown = o.items.slice(0, 4);
  const extra = o.items.length - shown.length;

  return `
    <article class="order-card">
      <div class="order-head">
        <div>
          <strong>#${esc(o.id)}</strong>
          <div class="muted">${formatDate(o.createdAt)}</div>
        </div>
        <span class="status ${status.toLowerCase()}">${status}</span>
      </div>

      <div class="order-body">
        <div class="order-thumbs">
          ${shown.map((i) => `<img src="${i.thumbnail}" alt="${esc(i.title)}">`).join("")}
          ${extra > 0 ? `<span class="more-items">+${extra}</span>` : ""}
        </div>
        <strong>${formatPrice(o.total)}</strong>
      </div>

      <details class="order-details">
        <summary>View Details</summary>
        <ul>
          ${o.items.map((i) => `
            <li><span>${i.qty} × ${esc(i.title)}</span><span>${formatPrice(i.price * i.qty)}</span></li>`).join("")}
        </ul>
        <div class="order-meta">
          <div><strong>Ship to:</strong> ${esc(o.customer.fullName)}, ${esc(o.customer.address)}</div>
          <div><strong>Payment:</strong> Card ending in ${esc(o.cardLast4)}</div>
          <div><strong>Shipping:</strong> ${o.shipping === 0 ? "Free" : formatPrice(o.shipping)}</div>
        </div>
      </details>
    </article>`;
}

function renderOrders() {
  const all = getOrders();
  const active = all.filter((o) => getStatus(o) !== "Delivered");
  const previous = all.filter((o) => getStatus(o) === "Delivered");
  const list = ordersFilter === "active" ? active : previous;

  ordersEl.innerHTML = `
    <h1>My Orders</h1>

    ${justPlaced ? `
      <div class="banner success">
        ✓ Order <strong>#${esc(justPlaced)}</strong> was placed successfully. Thank you!
      </div>` : ""}

    <div class="sub-tabs">
      <button type="button" class="sub-tab ${ordersFilter === "previous" ? "active" : ""}" data-filter="previous">
        Previous Orders (${previous.length})
      </button>
      <button type="button" class="sub-tab ${ordersFilter === "active" ? "active" : ""}" data-filter="active">
        Active Orders (${active.length})
      </button>
    </div>

    ${list.length === 0 ? `
      <div class="state-box">
        <div class="state-icon">📦</div>
        <h3>${all.length === 0 ? "No orders yet" : `No ${ordersFilter} orders`}</h3>
        ${all.length === 0 ? `<p>When you place an order, it will show up here.</p>
          <a href="products.html" class="btn">Start shopping</a>` : ""}
      </div>` : `
      <div class="orders-list">${list.map(orderCard).join("")}</div>`}
  `;
}

ordersEl.addEventListener("click", (e) => {
  const tab = e.target.closest("[data-filter]");
  if (!tab) return;
  ordersFilter = tab.dataset.filter;
  justPlaced = null;
  renderOrders();
});

// تحديث الحالات كل 15 ثانية (بدون ما نسكّر تفاصيل فاتحة)
setInterval(() => {
  if (currentView === "orders" && !ordersEl.querySelector("details[open]")) renderOrders();
}, 15000);

/* =========================================================
   التبديل بين Checkout و Orders
   ========================================================= */
function setView(view) {
  currentView = view;
  document.querySelectorAll(".page-tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.view === view);
  });
  checkoutEl.hidden = view !== "checkout";
  ordersEl.hidden = view !== "orders";
  if (view === "orders") renderOrders();
  history.replaceState(null, "", view === "orders" ? "?tab=orders" : location.pathname);
}

document.querySelectorAll(".page-tab").forEach((t) => {
  t.addEventListener("click", () => {
    justPlaced = null;
    setView(t.dataset.view);
  });
});

/* =========================================================
   التحميل
   ========================================================= */
async function loadCheckout() {
  const cart = getCart();
  if (cart.length === 0) return showEmptyCheckout();

  showCheckoutLoading();
  try {
    const products = await Promise.all(cart.map((i) => getProduct(i.id)));
    products.forEach((p) => productsById.set(p.id, p));
    renderCheckout();
  } catch (err) {
    console.error(err);
    showError(checkoutEl, loadCheckout, "Couldn't load your checkout.");
  }
}

// الفلتر الابتدائي: إذا في طلبات نشطة بنعرضها أول
ordersFilter = getOrders().some((o) => getStatus(o) !== "Delivered") ? "active" : "previous";

const wantsOrders = new URLSearchParams(location.search).get("tab") === "orders";
const startView = wantsOrders || (getCart().length === 0 && getOrders().length > 0) ? "orders" : "checkout";

loadCheckout();
setView(startView);