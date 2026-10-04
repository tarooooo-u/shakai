"use client";

import { createLocalStore } from "./localStore";

// ★を付けた問題の id（付けた順）
const store = createLocalStore<string[]>("shakai-drill:favorites:v1", []);

export const useFavorites = store.use;

export function toggleFavorite(id: string) {
  const current = store.get();
  store.set(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
}
