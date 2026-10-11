import { addToCart } from "./cart.js";
import { isFavorite, toggleFavorite } from "./favorites.js";
import { showToast } from "./ui.js";

// بيربط زرّي Add to Cart و Add to Favorites بصفحة التفاصيل
export function bindProductActions(p) {
  const addBtn = document.getElementById("add-to-cart");
  const favBtn = document.getElementById("add-to-fav");
  const qtyInput = document.getElementById("qty-input");

  addBtn.addEventListener("click", () => {
    addToCart(p.id, Number(qtyInput.value) || 1);
    showToast(`Added to cart: ${p.title}`);
  });

  const paint = () => {
    const fav = isFavorite(p.id);
    favBtn.classList.toggle("active", fav);
    favBtn.textContent = fav ? "♥ In Favorites" : "♡ Add to Favorites";
  };

  favBtn.addEventListener("click", () => toggleFavorite(p.id));
  window.addEventListener("favorites-changed", paint);
  paint();
}