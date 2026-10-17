"use client";

import { createProfileStore } from "./profiles";
import { DEFAULT_FILTER, type Filter } from "./session";

// ホームで最後にスタートしたときの条件（プロフィールごと）。次に開いたときの初期値にする
const store = createProfileStore<Partial<Filter> | null>("homefilter:v1", null, "whole");

export function loadLastFilter(): Filter | null {
  const saved = store.get();
  // あとから Filter に項目が増えても動くように、足りない所は初期値でうめる
  return saved ? { ...DEFAULT_FILTER, ...saved } : null;
}

export function saveLastFilter(filter: Filter) {
  store.set(filter);
}
