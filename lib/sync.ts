"use client";

import { useSyncExternalStore } from "react";

/**
 * 学習記録をサーバー（Cloudflare D1。functions/api/sync.ts）にも保存する。
 *
 * - 記録はまず端末（localStorage）に書く。変わったところに目印（outbox）をつけ、少しあとにまとめて送る
 * - 開いたとき・画面にもどったときにサーバーの記録を取ってきて、新しいほうを残してまぜる
 * - サーバーから取ってきても、端末の記録は消さない（データが飛ばないことを優先する）
 * - 送れなかった目印は localStorage に残るので、次に開いたときに送り直す
 *
 * 記録の種類（doc）は localStorage のキーから "shakai-drill:" を取ったもの（例 p:<プロフィールid>:progress:v2）。
 * - entries … 1つずつ last（更新時刻）を持つ記録の表（学習記録・データシート）。キーごとに新しいほうを残す
 * - whole   … まるごと1つの値（プロフィール一覧・お気に入り）。あとから書いたほうを残す
 */

export type DocKind = "entries" | "whole";
export type SyncDoc = { kind: DocKind; get(): unknown; setFromRemote(value: unknown): void };
type Registration = { resolve(doc: string): SyncDoc | null; list(): string[] };

const registrations: Registration[] = [];

/** 同期する記録を登録する（lib/profiles.ts から） */
export function registerDocs(r: Registration) {
  registrations.push(r);
}

function resolve(doc: string) {
  for (const r of registrations) {
    const d = r.resolve(doc);
    if (d) return d;
  }
  return null;
}

// ───── 送る目印（outbox）と、まるごとの記録を書いた時刻（at） ─────

type OutboxItem = { seq: number; keys: string[]; replace?: boolean };
type Outbox = Record<string, OutboxItem>;
type Meta = { joined?: string; at: Record<string, number> };

const OUTBOX_KEY = "shakai-drill:sync:outbox:v1";
const META_KEY = "shakai-drill:sync:meta:v1";

function readJson<T>(key: string, empty: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : empty;
  } catch {
    return empty;
  }
}
function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 保存できなくても、このタブの中では送れる
  }
}
const readOutbox = () => readJson<Outbox>(OUTBOX_KEY, {});
const writeOutbox = (o: Outbox) => {
  writeJson(OUTBOX_KEY, o);
  update({ pending: Object.keys(o).length });
};
const readMeta = () => readJson<Meta>(META_KEY, { at: {} });
function setAt(doc: string, at: number) {
  const meta = readMeta();
  meta.at[doc] = at;
  writeJson(META_KEY, meta);
}

type Rec = Record<string, { last?: number } | undefined>;

/** この端末で記録を書きかえたとき（lib/localStore.ts の onSet から） */
export function markChanged(doc: string, kind: DocKind, prev: unknown, next: unknown) {
  const outbox = readOutbox();
  const item: OutboxItem = outbox[doc] ?? { seq: 0, keys: [] };
  item.seq += 1;
  if (kind === "whole") {
    item.keys = ["_"];
    setAt(doc, Date.now());
  } else {
    const p = (prev ?? {}) as Rec;
    const n = (next ?? {}) as Rec;
    // 消えたキーがある（リセット）ときは、サーバーの記録もまるごと入れかえる
    if (Object.keys(p).some((k) => !(k in n))) item.replace = true;
    const keys = new Set(item.keys);
    for (const k in n) {
      if (p[k] !== n[k] && JSON.stringify(p[k]) !== JSON.stringify(n[k])) keys.add(k);
    }
    item.keys = [...keys];
  }
  outbox[doc] = item;
  writeOutbox(outbox);
  schedule(false, 2000);
}

/** 端末にある記録をすべて送る目印をつける（この端末で初めて同期するとき） */
function markAll() {
  const outbox = readOutbox();
  for (const r of registrations) {
    for (const doc of r.list()) {
      const d = resolve(doc);
      if (!d) continue;
      const keys = d.kind === "whole" ? ["_"] : Object.keys((d.get() ?? {}) as Rec);
      if (keys.length === 0) continue;
      const item = outbox[doc] ?? { seq: 0, keys: [] };
      outbox[doc] = { ...item, seq: item.seq + 1, keys: [...new Set([...item.keys, ...keys])] };
      if (d.kind === "whole") setAt(doc, Date.now());
    }
  }
  writeOutbox(outbox);
}

// ───── サーバーとのやりとり ─────

type Row = { doc: string; k: string; v: unknown; last: number };
type Op = { doc: string; replace?: boolean; entries: { k: string; v: unknown; last: number }[] };

class SyncError extends Error {
  constructor(readonly kind: "offline" | "login") {
    super(kind);
  }
}

async function api(init?: RequestInit) {
  let res: Response;
  try {
    // Access のログインが切れていると、ログイン画面へのリダイレクトが返る
    res = await fetch("/api/sync", { ...init, redirect: "manual", cache: "no-store" });
  } catch {
    throw new SyncError("offline");
  }
  if (res.type === "opaqueredirect" || res.status === 401 || res.status === 403) throw new SyncError("login");
  if (!res.ok) throw new SyncError("offline");
  return res;
}

/** サーバーの記録を端末にまぜる。first は、この端末で初めて同期するとき */
function apply(rows: Row[], first: boolean) {
  const byDoc = new Map<string, Row[]>();
  for (const r of rows) byDoc.set(r.doc, [...(byDoc.get(r.doc) ?? []), r]);
  // プロフィール一覧を先に入れる（そのプロフィールの記録を入れられるように）
  const docs = [...byDoc.keys()].sort((a, b) => Number(a.startsWith("p:")) - Number(b.startsWith("p:")));
  const outbox = readOutbox();
  const meta = readMeta();

  for (const doc of docs) {
    if (outbox[doc]?.replace) continue; // この端末でリセットした。送るまで待つ
    const d = resolve(doc);
    if (!d) continue;
    const docRows = byDoc.get(doc)!;

    if (d.kind === "whole") {
      const row = docRows.find((r) => r.k === "_");
      if (!row) continue;
      const local = d.get();
      if (first && Array.isArray(local) && Array.isArray(row.v) && local.length > 0) {
        // 初めての端末：プロフィールやお気に入りは、どちらにあるものも残す
        const idOf = (x: unknown) => JSON.stringify(typeof x === "object" && x && "id" in x ? x.id : x);
        const seen = new Set(row.v.map(idOf));
        d.setFromRemote([...row.v, ...local.filter((x) => !seen.has(idOf(x)))]);
      } else if (row.last > (meta.at[doc] ?? 0)) {
        d.setFromRemote(row.v);
        setAt(doc, row.last);
      }
      continue;
    }

    const local = (d.get() ?? {}) as Rec;
    const pending = new Set(outbox[doc]?.keys ?? []);
    const next: Rec = { ...local };
    let changed = false;
    for (const r of docRows) {
      if (pending.has(r.k)) continue; // まだ送っていない、この端末の新しい記録
      const l = local[r.k];
      if (!l || r.last > (l.last ?? 0)) {
        next[r.k] = r.v as Rec[string];
        changed = true;
      }
    }
    if (changed) d.setFromRemote(next);
  }
}

const CHUNK = 1000;

/** 目印のついた記録を送る */
async function push() {
  const outbox = readOutbox();
  const sent: Record<string, number> = {};
  const ops: Op[] = [];
  for (const [doc, item] of Object.entries(outbox)) {
    const d = resolve(doc);
    sent[doc] = item.seq;
    if (!d) continue; // 消したプロフィールの記録など
    const value = d.get();
    if (d.kind === "whole") {
      ops.push({ doc, entries: [{ k: "_", v: value, last: readMeta().at[doc] || Date.now() }] });
    } else {
      const rec = (value ?? {}) as Rec;
      const keys = item.replace ? Object.keys(rec) : item.keys.filter((k) => k in rec);
      ops.push({ doc, replace: item.replace, entries: keys.map((k) => ({ k, v: rec[k], last: rec[k]?.last ?? Date.now() })) });
    }
  }

  // 1回に送る量を区切る（大きな doc は分ける。replace は最初の1回だけ）
  let batch: Op[] = [];
  let size = 0;
  const send = async () => {
    if (batch.length === 0) return;
    await api({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ops: batch }) });
    batch = [];
    size = 0;
  };
  for (const op of ops) {
    if (op.entries.length === 0) {
      batch.push(op);
      continue;
    }
    for (let i = 0; i < op.entries.length; i += CHUNK) {
      const entries = op.entries.slice(i, i + CHUNK);
      if (size + entries.length > CHUNK) await send();
      batch.push({ doc: op.doc, replace: i === 0 ? op.replace : undefined, entries });
      size += entries.length;
    }
  }
  await send();

  // 送っている間に書きかわったものは、目印を残して次に送る
  const now = readOutbox();
  for (const [doc, seq] of Object.entries(sent)) if (now[doc]?.seq === seq) delete now[doc];
  writeOutbox(now);
}

// ───── いつ同期するか ─────

export type SyncStatus = "idle" | "syncing" | "ok" | "offline" | "login";
type SyncState = { status: SyncStatus; pending: number; email?: string };

let state: SyncState = { status: "idle", pending: 0 };
const listeners = new Set<() => void>();
function update(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

let running = false;
let again: boolean | null = null; // 走っている間にたのまれた次の回（true なら取ってくるところから）
let timer: ReturnType<typeof setTimeout> | null = null;

function schedule(pull: boolean, delay: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void run(pull);
  }, delay);
}

/** pull: サーバーの記録も取ってくる。false なら送るだけ */
async function run(pull: boolean) {
  if (!started) return;
  if (running) {
    again = again || pull;
    return;
  }
  running = true;
  update({ status: "syncing" });
  try {
    if (pull) {
      const { email, entries } = (await (await api()).json()) as { email: string; entries: Row[] };
      const first = readMeta().joined !== email;
      apply(entries, first);
      if (first) markAll();
      await push();
      if (first) writeJson(META_KEY, { ...readMeta(), joined: email });
      update({ email });
    } else {
      await push();
    }
    update({ status: "ok" });
  } catch (e) {
    const kind = e instanceof SyncError ? e.kind : "offline";
    update({ status: kind });
    // つながらないときは、しばらくしてからやり直す（ログイン切れは開き直すまで待つ）
    if (kind === "offline") schedule(true, 30_000);
  } finally {
    running = false;
    if (again !== null) {
      const p = again;
      again = null;
      void run(p);
    }
  }
}

let started = false;

/** アプリを開いたときに1回呼ぶ */
export function startSync() {
  if (started) return;
  started = true;
  update({ pending: Object.keys(readOutbox()).length });
  void run(true);
  document.addEventListener("visibilitychange", () => {
    // 画面を離れるときはすぐ送り、もどってきたら取ってくる
    void run(document.visibilityState === "visible");
  });
  window.addEventListener("online", () => void run(true));
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const serverState: SyncState = { status: "idle", pending: 0 };

export function useSyncState() {
  return useSyncExternalStore(subscribe, () => state, () => serverState);
}

/** ログインが切れたときなどに、すぐやり直す */
export const syncNow = () => void run(true);
