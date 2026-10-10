"use client";

import { useSyncExternalStore } from "react";

/**
 * localStorage に JSON で保存する小さなストア。
 * 保存できない環境（プライベートモード等）でも、そのタブの中では動き続ける。
 * 別タブでの変更も storage イベントで反映する。
 */
export function createLocalStore<T>(key: string, empty: T) {
  let cache: { value: T } | null = null;
  const listeners = new Set<() => void>();

  const read = (): T => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : empty;
    } catch {
      return empty;
    }
  };

  const get = (): T => {
    if (cache === null) cache = { value: read() };
    return cache.value;
  };

  const set = (next: T) => {
    cache = { value: next };
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // 保存できなくても、このタブの中では動かし続ける
    }
    listeners.forEach((l) => l());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      cache = { value: read() };
      listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  };

  // サーバー側（と最初のハイドレーション）では空の値を使う
  const use = (): T => useSyncExternalStore(subscribe, get, () => empty);

  return { get, set, use, subscribe };
}
