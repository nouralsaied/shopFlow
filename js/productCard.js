import { isFavorite } from "./favorites.js";

export function formatPrice(n) {
  return `$${n.toFixed(2)}`;
}

export function stars(rating) {
  const pct = Math.round((rating / 5) * 100);
  return `<span class="stars" style="--pct:${pct}%" aria-label="${rating} out of 5"></span>`;
}

export function productCard(p) {
  const fav = isFavorite(p.id);
  return `
    <article class="product-card">
      <a href="product.html?id=${p.id}" class="product-img">
        <img src="${p.thumbnail}" alt="${p.title}" loading="lazy">
      </a>

      <button class="fav-btn ${fav ? "active" : ""}" data-id="${p.id}" aria-label="Toggle favorite">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>
        </svg>
      </button>

      <a href="product.html?id=${p.id}" class="product-info">
        <h3 class="product-title">${p.title}</h3>
        <div class="product-rating">
          ${stars(p.rating)} <span>${p.rating.toFixed(1)}</span>
        </div>
        <div class="product-price">${formatPrice(p.price)}</div>
      </a>
    </article>`;
}

export function renderProducts(container, products) {
  container.innerHTML = `
    <div class="product-grid">
      ${products.map(productCard).join("")}
    </div>`;
}