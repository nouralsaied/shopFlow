import { read, write } from "./storage.js";

const KEY = "shopflow-orders";

export const FREE_SHIPPING_FROM = 50;
export const SHIPPING_COST = 5.99;

const round = (n) => Math.round(n * 100) / 100;

export function calcTotals(subtotal) {
  const shipping = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_COST;
  return {
    subtotal: round(subtotal),
    shipping,
    total: round(subtotal + shipping),
  };
}

export function getOrders() {
  return read(KEY, []);
}

export function saveOrder(order) {
  const list = getOrders();
  list.unshift(order); // الأحدث أول شي
  write(KEY, list);
  window.dispatchEvent(new Event("orders-changed"));
}

// محاكاة: الحالة بتتغير حسب الوقت اللي مرّ على الطلب
export function getStatus(order) {
  const minutes = (Date.now() - order.createdAt) / 60000;
  if (minutes < 1) return "Processing";
  if (minutes < 3) return "Shipped";
  return "Delivered";
}