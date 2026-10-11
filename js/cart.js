import { read, write } from "./storage.js";

const KEY = "shopflow-cart";

function save(cart) {
  write(KEY, cart);
  window.dispatchEvent(new Event("cart-changed"));
}

export function getCart() {
  return read(KEY, []);
}

// مجموع الكميات (مش عدد الأصناف)
export function cartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

export function addToCart(id, qty = 1) {
  id = Number(id);
  const cart = getCart();
  const item = cart.find((i) => i.id === id);
  if (item) item.qty += qty;
  else cart.push({ id, qty });
  save(cart);
}

export function setQty(id, qty) {
  id = Number(id);
  const cart = getCart();
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, qty);
  save(cart);
}

export function removeFromCart(id) {
  save(getCart().filter((i) => i.id !== Number(id)));
}

export function clearCart() {
  save([]);
}