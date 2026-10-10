"use client";

import { createProfileStore } from "./profiles";

// ★を付けた問題の id（付けた順）。プロフィールごと
const store = createProfileStore<string[]>("favorites:v1", []);

export const useFavorites = store.use;

export function toggleFavorite(id: string) {
  const current = store.get();
  store.set(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
}
