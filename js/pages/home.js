import { initTheme } from "../theme.js";
import { renderHeader, renderFooter, showLoading, showEmpty, showError } from "../ui.js";
import { getProducts, getGroup } from "../api.js";
import { renderProducts } from "../productCard.js";

initTheme();
renderHeader();
renderFooter();

const featured = document.getElementById("featured");

// أفضل منتج تقييماً من كل فئة، حتى يكون التنويع حلو
function pickFeatured(products) {
  const groups = ["Electronics", "Fashion", "Home & Living", "Sports", "Beauty"];
  const picks = [];
  for (const g of groups) {
    const best = products
      .filter((p) => getGroup(p.category) === g)
      .sort((a, b) => b.rating - a.rating)[0];
    if (best) picks.push(best);
  }
  return picks.slice(0, 4);
}

async function load() {
  showLoading(featured);
  try {
    const products = await getProducts();
    const picks = pickFeatured(products);

    if (picks.length === 0) return showEmpty(featured, "No featured products.");
    renderProducts(featured, picks);
  } catch (err) {
    console.error(err);
    showError(featured, load, "Couldn't load products.");
  }
}

load();