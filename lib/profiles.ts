"use client";

import { useSyncExternalStore } from "react";
import { createLocalStore } from "./localStore";
import { markChanged, registerDocs, type DocKind } from "./sync";

/**
 * 同じ端末をきょうだいで使うためのプロフィール。
 * 学習記録・お気に入りはプロフィールごとに分けて保存する（端末の localStorage と、サーバー。lib/sync.ts）。
 * サーバーでは、Cloudflare Access でログインした保護者のメールの下にプロフィールが並ぶ。
 * id はランダムな値にしておき、将来ログインを入れたときにそのままアカウントへ取り込めるようにする。
 */
export type Profile = { id: string; name: string; color: ProfileColor };

export const PROFILE_COLORS = ["accent", "ok", "unsure", "ng"] as const;
export type ProfileColor = (typeof PROFILE_COLORS)[number];

const PROFILES_DOC = "profiles:v1";
const store = createLocalStore<Profile[]>(`shakai-drill:${PROFILES_DOC}`, [], (prev, next) =>
  markChanged(PROFILES_DOC, "whole", prev, next),
);

registerDocs({
  resolve: (doc) => (doc === PROFILES_DOC ? { kind: "whole", get: store.get, setFromRemote: (v) => store.setFromRemote(v as Profile[]) } : null),
  list: () => [PROFILES_DOC],
});

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
 * kind はサーバーとのまぜ方（lib/sync.ts）。entries は値が { [キー]: { last, ... } } の形のときだけ
 */
export function createProfileStore<T>(name: string, empty: T, kind: DocKind) {
  const docOf = (id: string) => `p:${id}:${name}`;
  const stores = new Map<string, ReturnType<typeof createLocalStore<T>>>();
  const storeFor = (id: string) => {
    let s = stores.get(id);
    if (!s) {
      s = createLocalStore<T>(`${profileKeyPrefix(id)}${name}`, empty, (prev, next) => markChanged(docOf(id), kind, prev, next));
      stores.set(id, s);
    }
    return s;
  };
  registerDocs({
    resolve: (doc) => {
      const id = store.get().find((p) => doc === docOf(p.id))?.id;
      if (!id) return null;
      const s = storeFor(id);
      return { kind, get: s.get, setFromRemote: (v) => s.setFromRemote(v as T) };
    },
    list: () => store.get().map((p) => docOf(p.id)),
  });
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

  // getFor … 選んでいない人の記録を読む（「だれがやる？」の画面で、解いた数を出すため）
  return { get: () => current().get(), getFor: (id: string) => storeFor(id).get(), set: (v: T) => current().set(v), use };
}

const subscribeNothing = () => () => {};

/** 画面の最初の描画（サーバー側と同じ）が終わったか。localStorage を読む前のちらつきを防ぐ */
export function useHydrated() {
  return useSyncExternalStore(subscribeNothing, () => true, () => false);
}
