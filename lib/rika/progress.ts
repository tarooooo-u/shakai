"use client";

import { createProfileStore } from "../profiles";
import type { Progress } from "../progress";

// 理科の学習記録。社会（lib/progress.ts の progress:v2）とは別の記録にする。
// 形は社会と同じ（〇が2回で卒業・14/30/60日後に確認。判定は lib/progress.ts の statusOf などを使う）
const store = createProfileStore<Progress>("rika-progress:v1", {}, "entries");

export const useRikaProgress = store.use;

/** その人が理科で解いた問題の数 */
export function rikaSolvedCount(profileId: string) {
  return Object.keys(store.getFor(profileId)).filter((k) => !k.includes("@")).length;
}
