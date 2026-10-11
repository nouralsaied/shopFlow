import { read, write } from "./storage.js";

const KEY = "shopflow-favorites";

export function getFavorites() {
  return read(KEY, []);
}

export function isFavorite(id) {
  return getFavorites().includes(Number(id));
}

// بترجّع true إذا صار المنتج مفضل، false إذا انشال
export function toggleFavorite(id) {
  id = Number(id);
  const list = getFavorites();
  const i = list.indexOf(id);
  if (i === -1) list.push(id);
  else list.splice(i, 1);
  write(KEY, list);
  window.dispatchEvent(new Event("favorites-changed"));
  return i === -1;
}