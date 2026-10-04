"use client";

import { createLocalStore } from "./localStore";
import type { Grade } from "./types";

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

// 学習記録はすべてこの端末のブラウザ（localStorage）に保存する。
// 形式を変えるときはキーのバージョンを上げる。
const store = createLocalStore<Progress>("shakai-drill:progress:v1", {});

export const useProgress = store.use;

export function recordGrade(id: string, grade: Grade) {
  const current = store.get();
  const prev = current[id] ?? { ok: 0, unsure: 0, ng: 0 };
  store.set({
    ...current,
    [id]: { ...prev, grade, [grade]: prev[grade] + 1, last: Date.now() },
  });
}

export function resetProgress() {
  store.set({});
}

/** 最後の評価が △ か × のもの */
export function needsReview(record: QuestionRecord | undefined) {
  return record !== undefined && record.grade !== "ok";
}
