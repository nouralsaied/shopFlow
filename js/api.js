const BASE = "https://dummyjson.com";

export const CATEGORY_MAP = {
  Electronics: ["smartphones", "laptops", "tablets", "mobile-accessories"],
  Fashion: ["mens-shirts", "mens-shoes", "mens-watches", "womens-bags",
            "womens-dresses", "womens-jewellery", "womens-shoes",
            "womens-watches", "sunglasses", "tops"],
  "Home & Living": ["furniture", "home-decoration", "kitchen-accessories", "groceries"],
  Sports: ["sports-accessories", "motorcycle", "vehicle"],
  Beauty: ["beauty", "fragrances", "skin-care"],
};

async function request(path) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function getProducts() {
  const data = await request("/products?limit=0");
  return data.products;
}

export function getProduct(id) {
  return request(`/products/${id}`);
}

export async function searchProducts(query) {
  const data = await request(`/products/search?q=${encodeURIComponent(query)}`);
  return data.products;
}

export function getGroup(apiCategory) {
  for (const [group, list] of Object.entries(CATEGORY_MAP)) {
    if (list.includes(apiCategory)) return group;
  }
  return "Other";
}