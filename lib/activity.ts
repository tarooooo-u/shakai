"use client";

import { createProfileStore } from "./profiles";

// 日ごとに解いた数（プロフィールごと。サーバーにも同期）。ダッシュボードの「れんぞく」に使う。
// キーはその端末の日付（YYYY-MM-DD）。

export type DayRecord = { n: number; last: number };
export type Days = Record<string, DayRecord>;

const store = createProfileStore<Days>("days:v1", {}, "entries");

export const useDays = store.use;

export function dayKey(time: number) {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 1問解いたら呼ぶ */
export function recordDay(now = Date.now()) {
  const current = store.get();
  const k = dayKey(now);
  store.set({ ...current, [k]: { n: (current[k]?.n ?? 0) + 1, last: now } });
}

/**
 * 何日続けて解いているか。今日まだ解いていなくても、きのうまで続いていれば数える。
 * extra は日ごとの記録を始める前に解いた日（問題ごとの最後に解いた時刻）
 */
export function streakDays(days: Days, extra: number[], now = Date.now()) {
  const set = new Set([...Object.keys(days), ...extra.map(dayKey)]);
  const day = new Date(now);
  if (!set.has(dayKey(day.getTime()))) day.setDate(day.getDate() - 1);
  let n = 0;
  while (set.has(dayKey(day.getTime()))) {
    n++;
    day.setDate(day.getDate() - 1);
  }
  return n;
}
