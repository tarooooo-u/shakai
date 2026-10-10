"use client";

import { useSyncExternalStore } from "react";
import { createLocalStore } from "./localStore";

/**
 * 同じ端末をきょうだいで使うためのプロフィール（ログインなし）。
 * 学習記録・お気に入りはプロフィールごとに分けて保存する。
 * id はランダムな値にしておき、将来ログインを入れたときにそのままアカウントへ取り込めるようにする。
 */
export type Profile = { id: string; name: string; color: ProfileColor };

export const PROFILE_COLORS = ["accent", "ok", "unsure", "ng"] as const;
export type ProfileColor = (typeof PROFILE_COLORS)[number];

const store = createLocalStore<Profile[]>("shakai-drill:profiles:v1", []);

export const useProfiles = store.use;

// 今だれが使っているかは保存しない（開くたびに「だれがやる？」と聞いて、取り違えを防ぐ）
let currentId: string | null = null;
const listeners = new Set<() => void>();

function setCurrent(id: string | null) {
  currentId = id;
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function getCurrentProfileId() {
  return currentId;
}

export function useCurrentProfileId() {
  return useSyncExternalStore(subscribe, getCurrentProfileId, () => null);
}

export function useCurrentProfile(): Profile | null {
  const profiles = useProfiles();
  const id = useCurrentProfileId();
  return profiles.find((p) => p.id === id) ?? null;
}

export const selectProfile = (id: string) => setCurrent(id);
export const leaveProfile = () => setCurrent(null);

export function addProfile(name: string) {
  const profiles = store.get();
  const profile: Profile = {
    id: crypto.randomUUID(),
    name,
    color: PROFILE_COLORS[profiles.length % PROFILE_COLORS.length],
  };
  store.set([...profiles, profile]);
  return profile;
}

export function renameProfile(id: string, name: string) {
  store.set(store.get().map((p) => (p.id === id ? { ...p, name } : p)));
}

export function removeProfile(id: string) {
  store.set(store.get().filter((p) => p.id !== id));
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(profileKeyPrefix(id))) window.localStorage.removeItem(key);
    }
  } catch {
    // 消せなくても、プロフィール一覧からは外れている
  }
  if (currentId === id) setCurrent(null);
}

const profileKeyPrefix = (id: string) => `shakai-drill:p:${id}:`;

/**
 * プロフィールごとに別々の localStorage キーに保存するストア。
 * プロフィールが選ばれていないときは読み書きしない（空の値を返す）。
 */
export function createProfileStore<T>(name: string, empty: T) {
  const stores = new Map<string, ReturnType<typeof createLocalStore<T>>>();
  const storeFor = (id: string) => {
    let s = stores.get(id);
    if (!s) {
      s = createLocalStore<T>(`${profileKeyPrefix(id)}${name}`, empty);
      stores.set(id, s);
    }
    return s;
  };
  const noop = { get: () => empty, set: () => {} };
  const current = () => (currentId ? storeFor(currentId) : noop);

  const use = (): T => {
    const id = useCurrentProfileId();
    // id が変わると別のストアを購読する
    const s = id ? storeFor(id) : null;
    return useSyncExternalStore(
      s ? s.subscribe : subscribeNothing,
      s ? s.get : () => empty,
      () => empty,
    );
  };

  return { get: () => current().get(), set: (v: T) => current().set(v), use };
}

const subscribeNothing = () => () => {};

/** 画面の最初の描画（サーバー側と同じ）が終わったか。localStorage を読む前のちらつきを防ぐ */
export function useHydrated() {
  return useSyncExternalStore(subscribeNothing, () => true, () => false);
}
