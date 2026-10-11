import { initTheme } from "../theme.js";
import { renderHeader, renderFooter, showLoading, showEmpty, showError } from "../ui.js";
import { getProducts, getGroup, CATEGORY_MAP } from "../api.js";
import { renderProducts } from "../productCard.js";

initTheme();
renderHeader();
renderFooter();


const PAGE_SIZE = 24;

const resultsEl = document.getElementById("results");
const countEl = document.getElementById("result-count");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");
const priceRange = document.getElementById("price-range");
const priceValue = document.getElementById("price-value");
const categoryList = document.getElementById("category-list");
const paginationEl = document.getElementById("pagination");
const resetBtn = document.getElementById("reset-btn");

const params = new URLSearchParams(location.search);
const favoritesMode = params.get("favorites") === "1";

let allProducts = [];
let maxPrice = 1000;
let currentPage = 1;

const state = {
  q: params.get("q") || "",
  categories: new Set(),
  maxPrice: 1000,
  minRating: 0,
  sort: "popularity",
};

function readFavorites() {
  try {
    return JSON.parse(localStorage.getItem("shopflow-favorites")) || [];
  } catch {
    return [];
  }
}

function buildCategories() {
  categoryList.innerHTML = Object.keys(CATEGORY_MAP)
    .map((name) => `
      <label class="check">
        <input type="checkbox" value="${name}"> ${name}
      </label>`)
    .join("");
}

function getFiltered() {
  const q = state.q.trim().toLowerCase();
  const favs = favoritesMode ? readFavorites() : null;

  const list = allProducts.filter((p) => {
    if (favs && !favs.includes(p.id)) return false;

    if (q) {
      const text = `${p.title} ${p.brand || ""} ${p.category} ${(p.tags || []).join(" ")}`.toLowerCase();
      if (!text.includes(q)) return false;
    }

    if (state.categories.size && !state.categories.has(getGroup(p.category))) return false;
    if (p.price > state.maxPrice) return false;
    if (p.rating < state.minRating) return false;
    return true;
  });

  switch (state.sort) {
    case "price-asc":  list.sort((a, b) => a.price - b.price); break;
    case "price-desc": list.sort((a, b) => b.price - a.price); break;
    case "name":       list.sort((a, b) => a.title.localeCompare(b.title)); break;
    default:           list.sort((a, b) => b.rating - a.rating);
  }
  return list;
}

function render() {
  const list = getFiltered();
  countEl.textContent = `${list.length} product${list.length === 1 ? "" : "s"}`;

  if (list.length === 0) {
    paginationEl.hidden = true;
    return showEmpty(
      resultsEl,
      favoritesMode && !state.q ? "No favorites yet." : "No products match your filters."
    );
  }

  const pageCount = Math.ceil(list.length / PAGE_SIZE);
  currentPage = Math.min(currentPage, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  renderProducts(resultsEl, list.slice(start, start + PAGE_SIZE));

  paginationEl.hidden = pageCount <= 1;
  paginationEl.innerHTML = `
    <button class="pagination-btn" type="button" data-page="${currentPage - 1}"
      aria-label="Previous page" ${currentPage === 1 ? "disabled" : ""}>Previous</button>
    ${Array.from({ length: pageCount }, (_, index) => {
      const page = index + 1;
      return `<button class="pagination-btn${page === currentPage ? " active" : ""}"
        type="button" data-page="${page}" aria-label="Page ${page}"
        ${page === currentPage ? 'aria-current="page"' : ""}>${page}</button>`;
    }).join("")}
    <button class="pagination-btn" type="button" data-page="${currentPage + 1}"
      aria-label="Next page" ${currentPage === pageCount ? "disabled" : ""}>Next</button>`;
}

function update() {
  currentPage = 1;
  render();
}

searchInput.addEventListener("input", () => {
  state.q = searchInput.value;
  update();
});

sortSelect.addEventListener("change", () => {
  state.sort = sortSelect.value;
  update();
});

priceRange.addEventListener("input", () => {
  state.maxPrice = Number(priceRange.value);
  priceValue.textContent = state.maxPrice;
  update();
});

categoryList.addEventListener("change", (e) => {
  const { value, checked } = e.target;
  if (checked) state.categories.add(value);
  else state.categories.delete(value);
  update();
});

document.querySelectorAll('input[name="rating"]').forEach((r) => {
  r.addEventListener("change", () => {
    state.minRating = Number(r.value);
    update();
  });
});

paginationEl.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-page]");
  if (!button || button.disabled) return;

  currentPage = Number(button.dataset.page);
  render();
});

resetBtn.addEventListener("click", () => {
  state.q = "";
  state.categories.clear();
  state.maxPrice = maxPrice;
  state.minRating = 0;
  state.sort = "popularity";

  searchInput.value = "";
  sortSelect.value = "popularity";
  priceRange.value = maxPrice;
  priceValue.textContent = maxPrice;
  categoryList.querySelectorAll("input").forEach((i) => (i.checked = false));
  document.querySelector('input[name="rating"][value="0"]').checked = true;
  update();
});

async function load() {
  showLoading(resultsEl, 8);
  try {
    allProducts = await getProducts();

    maxPrice = Math.ceil(Math.max(...allProducts.map((p) => p.price)));
    priceRange.max = maxPrice;
    priceRange.value = maxPrice;
    priceValue.textContent = maxPrice;
    state.maxPrice = maxPrice;

    render();
  } catch (err) {
    console.error(err);
    showError(resultsEl, load, "Couldn't load products.");
  }
}

buildCategories();
searchInput.value = state.q;
if (favoritesMode) document.getElementById("page-title").textContent = "Favorites";
load();
// بوضع المفضلة: لما تشيل منتج بيختفي فوراً
window.addEventListener("favorites-changed", () => {
  if (favoritesMode && allProducts.length) render();
});

// فتح/إغلاق الفلاتر على الموبايل
const filtersEl = document.getElementById("filters");
const filtersToggle = document.getElementById("filters-toggle");
filtersToggle.addEventListener("click", () => {
  const open = filtersEl.classList.toggle("open");
  filtersToggle.setAttribute("aria-expanded", open);
});