"use client";

import { createProfileStore } from "./profiles";
import { DEFAULT_FILTER, type Filter } from "./session";
import { CATEGORIES } from "./types";

// ホームで最後にスタートしたときの条件（プロフィールごと）。次に開いたときの初期値にする
const store = createProfileStore<Partial<Filter> | null>("homefilter:v1", null, "whole");

export function loadLastFilter(): Filter | null {
  const saved = store.get();
  // あとから Filter に項目が増えても動くように、足りない所は初期値でうめる
  if (!saved) return null;
  // 時事を足す前に「歴史・地理・公民ぜんぶ」を選んでいた人は、時事もふくめる
  const old = ["history", "geography", "civics"];
  const categories =
    saved.categories?.length === old.length && old.every((c) => saved.categories!.includes(c as never)) ? [...CATEGORIES] : saved.categories;
  return { ...DEFAULT_FILTER, ...saved, ...(categories && { categories }) };
}

export function saveLastFilter(filter: Filter) {
  store.set(filter);
}
