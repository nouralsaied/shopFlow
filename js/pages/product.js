import { initTheme } from "../theme.js";
import { renderHeader, renderFooter, showError, showEmpty } from "../ui.js";
import { getProduct } from "../api.js";
import { formatPrice, stars } from "../productCard.js";
  import { bindProductActions } from "../actions.js";

initTheme();
renderHeader();
renderFooter();

const detailEl = document.getElementById("product-detail");
const breadcrumbEl = document.getElementById("breadcrumb");

const id = new URLSearchParams(location.search).get("id");

// Skeleton خاص بصفحة التفاصيل
function showDetailLoading() {
  detailEl.innerHTML = `
    <div class="detail-grid">
      <div class="skeleton" style="aspect-ratio:1"></div>
      <div>
        <div class="skeleton skeleton-line" style="height:28px;width:70%"></div>
        <div class="skeleton skeleton-line" style="width:40%"></div>
        <div class="skeleton skeleton-line" style="height:32px;width:30%"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line short"></div>
      </div>
    </div>`;
}

function titleCase(slug) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// تبويب المواصفات: بنعرض بس الحقول الموجودة فعلاً
function specsTable(p) {
  const rows = [
    ["Brand", p.brand],
    ["Category", p.category && titleCase(p.category)],
    ["SKU", p.sku],
    ["Weight", p.weight && `${p.weight} g`],
    ["Dimensions", p.dimensions && `${p.dimensions.width} × ${p.dimensions.height} × ${p.dimensions.depth} cm`],
    ["Warranty", p.warrantyInformation],
    ["Shipping", p.shippingInformation],
    ["Return policy", p.returnPolicy],
  ].filter(([, v]) => v);

  return `
    <table class="specs">
      ${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}
    </table>`;
}

function reviewsList(p) {
  if (!p.reviews || p.reviews.length === 0) {
    return `<p class="muted">No reviews yet.</p>`;
  }
  return p.reviews.map((r) => `
    <div class="review">
      <div class="review-head">
        <strong>${r.reviewerName}</strong>
        ${stars(r.rating)}
        <span class="muted">${new Date(r.date).toLocaleDateString()}</span>
      </div>
      <p>${r.comment}</p>
    </div>`).join("");
}

function render(p) {
  document.title = `${p.title} — ShopFlow`;

  breadcrumbEl.innerHTML = `
    <a href="index.html">Home</a> /
    <a href="products.html">Products</a> /
    <span>${p.title}</span>`;

  const images = p.images && p.images.length ? p.images : [p.thumbnail];
  const inStock = p.stock > 0;
  const reviewCount = p.reviews ? p.reviews.length : 0;

  detailEl.innerHTML = `
    <div class="detail-grid">

      <div class="gallery">
        <div class="thumbs" id="thumbs">
          ${images.map((src, i) => `
            <button type="button" class="thumb ${i === 0 ? "active" : ""}" data-src="${src}">
              <img src="${src}" alt="${p.title} image ${i + 1}">
            </button>`).join("")}
        </div>
        <div class="main-image">
          <img id="main-img" src="${images[0]}" alt="${p.title}">
        </div>
      </div>

      <div class="detail-info">
        <h1>${p.title}</h1>

        <div class="detail-rating">
          ${stars(p.rating)}
          <strong>${p.rating.toFixed(1)}</strong>
          <span class="muted">(${reviewCount} reviews)</span>
        </div>

        <div class="detail-price">
          <span class="price">${formatPrice(p.price)}</span>
          <span class="stock ${inStock ? "in" : "out"}">
            ${inStock ? "In Stock" : "Out of Stock"}
          </span>
        </div>

        <p class="detail-desc">${p.description}</p>

        <div class="detail-actions">
          <div class="qty" id="qty">
            <button type="button" id="qty-minus" aria-label="Decrease">−</button>
            <input type="number" id="qty-input" value="1" min="1" max="${Math.max(p.stock, 1)}">
            <button type="button" id="qty-plus" aria-label="Increase">+</button>
          </div>
          <button class="btn btn-lg" id="add-to-cart" data-id="${p.id}" ${inStock ? "" : "disabled"}>
            Add to Cart
          </button>
        </div>

        <button class="btn-outline" id="add-to-fav" data-id="${p.id}">
          ♡ Add to Favorites
        </button>

        <div class="detail-perks">
          <div><strong>Free Shipping</strong><span>On orders over $50</span></div>
          <div><strong>Easy Returns</strong><span>Within 30 days</span></div>
        </div>
      </div>
    </div>

    <div class="tabs">
      <div class="tab-list" role="tablist">
        <button class="tab active" data-tab="description">Description</button>
        <button class="tab" data-tab="specs">Specifications</button>
        <button class="tab" data-tab="reviews">Reviews (${reviewCount})</button>
      </div>
      <div class="tab-panel" id="panel-description">
        <p>${p.description}</p>
        ${p.tags && p.tags.length ? `<p class="muted">Tags: ${p.tags.join(", ")}</p>` : ""}
      </div>
      <div class="tab-panel" id="panel-specs" hidden>${specsTable(p)}</div>
      <div class="tab-panel" id="panel-reviews" hidden>${reviewsList(p)}</div>
    </div>
  `;

  bindGallery();
  bindQuantity(p.stock);
  bindTabs();
  bindProductActions(p);
}

// ===== معرض الصور: كبسة على صورة مصغرة بتغيّر الصورة الكبيرة =====
function bindGallery() {
  const mainImg = document.getElementById("main-img");
  document.getElementById("thumbs").addEventListener("click", (e) => {
    const btn = e.target.closest(".thumb");
    if (!btn) return;
    mainImg.src = btn.dataset.src;
    document.querySelectorAll(".thumb").forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
  });
}

// ===== الكمية: بين 1 وكمية المخزون =====
function bindQuantity(stock) {
  const input = document.getElementById("qty-input");
  const max = Math.max(stock, 1);

  const clamp = () => {
    let v = parseInt(input.value, 10);
    if (isNaN(v) || v < 1) v = 1;
    if (v > max) v = max;
    input.value = v;
  };

  document.getElementById("qty-minus").addEventListener("click", () => {
    input.value = Number(input.value) - 1;
    clamp();
  });
  document.getElementById("qty-plus").addEventListener("click", () => {
    input.value = Number(input.value) + 1;
    clamp();
  });
  input.addEventListener("change", clamp);
}

// ===== التبويبات =====
function bindTabs() {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      document.querySelectorAll(".tab-panel").forEach((p) => (p.hidden = true));
      document.getElementById(`panel-${tab.dataset.tab}`).hidden = false;
    });
  });
}

// ===== التحميل =====
async function load() {
  if (!id) {
    breadcrumbEl.innerHTML = `<a href="products.html">← Back to products</a>`;
    return showEmpty(detailEl, "No product selected.");
  }

  showDetailLoading();
  try {
    const product = await getProduct(id);
    render(product);
  } catch (err) {
    console.error(err);
    // منتج مش موجود (404) أو مشكلة اتصال
    showError(detailEl, load, "Couldn't load this product.");
  }
}

load();