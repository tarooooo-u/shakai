"use client";

import { useSyncExternalStore } from "react";
import type { Grade } from "./types";

// 学習記録はすべてこの端末のブラウザ（localStorage）に保存する。
// 形式を変えるときはキーのバージョンを上げる。
const KEY = "shakai-drill:progress:v1";

export type QuestionRecord = {
  /** 最後につけた評価 */
  grade: Grade;
  ok: number;
  unsure: number;
  ng: number;
  /** 最後に解いた時刻 (ms) */
  last: number;
};

export type Progress = Record<string, QuestionRecord>;

const EMPTY: Progress = {};
let cache: Progress | null = null;
const listeners = new Set<() => void>();

function read(): Progress {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Progress) : {};
  } catch {
    return {};
  }
}

function write(next: Progress) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // プライベートモード等で保存できなくても、このタブの中では動かし続ける
  }
  listeners.forEach((l) => l());
}

function getSnapshot(): Progress {
  if (cache === null) cache = read();
  return cache;
}

function getServerSnapshot(): Progress {
  return EMPTY;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // 別タブで解いた結果も反映する
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = read();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function recordGrade(id: string, grade: Grade) {
  const current = getSnapshot();
  const prev = current[id] ?? { ok: 0, unsure: 0, ng: 0 };
  write({
    ...current,
    [id]: { ...prev, grade, [grade]: prev[grade] + 1, last: Date.now() },
  });
}

export function resetProgress() {
  write({});
}

/** 最後の評価が △ か × のもの */
export function needsReview(record: QuestionRecord | undefined) {
  return record !== undefined && record.grade !== "ok";
}
