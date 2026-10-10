"use client";

import { createProfileStore } from "./profiles";
import type { Grade } from "./types";

export type QuestionRecord = {
  /** 最後につけた評価 */
  grade: Grade;
  ok: number;
  unsure: number;
  ng: number;
  /** 〇 が何回続いているか（△・× で 0 にもどる） */
  streak: number;
  /** 最後に解いた時刻 (ms) */
  last: number;
};

export type Progress = Record<string, QuestionRecord>;

// 学習記録はこの端末のブラウザ（localStorage）に、プロフィールごとに保存する。
// 形式を変えるときは名前のバージョンを上げる。
const store = createProfileStore<Progress>("progress:v2", {});

export const useProgress = store.use;

export function recordGrade(id: string, grade: Grade) {
  const current = store.get();
  const prev = current[id] ?? { ok: 0, unsure: 0, ng: 0, streak: 0 };
  store.set({
    ...current,
    [id]: {
      ...prev,
      grade,
      [grade]: prev[grade] + 1,
      streak: grade === "ok" ? prev.streak + 1 : 0,
      last: Date.now(),
    },
  });
}

export function resetProgress() {
  store.set({});
}

/** 最後の評価が △ か × のもの */
export function needsReview(record: QuestionRecord | undefined) {
  return record !== undefined && record.grade !== "ok";
}

// ───── 卒業 ─────
// 〇 が2回続いたら「卒業」。ふだんの出題からは外す。
// 卒業した問題も、しばらくたったら「確認」として1回出す。〇ならまた卒業、△・× なら卒業を取り消し。
// 確認で〇が続くほど、次の確認までの間をあける。

export const GRADUATE_STREAK = 2;
const DAY = 24 * 60 * 60 * 1000;
/** 卒業してから（前の確認から）何日後に確認で出すか。streak 2, 3, 4以上 */
const CHECK_AFTER_DAYS = [14, 30, 60];

export type Status = "new" | "learning" | "graduated" | "check";

export const STATUS_LABEL: Record<Status, string> = {
  new: "まだ",
  learning: "練習中",
  graduated: "卒業",
  check: "確認の時期",
};

export function statusOf(record: QuestionRecord | undefined, now = Date.now()): Status {
  if (!record) return "new";
  if (record.streak < GRADUATE_STREAK) return "learning";
  const days = CHECK_AFTER_DAYS[Math.min(record.streak - GRADUATE_STREAK, CHECK_AFTER_DAYS.length - 1)];
  return now - record.last >= days * DAY ? "check" : "graduated";
}

export const isGraduated = (record: QuestionRecord | undefined) => statusOf(record) === "graduated";

/** ふだんの出題に入るもの：まだ・練習中・確認の時期 */
export const isActive = (record: QuestionRecord | undefined) => !isGraduated(record);

// 前の形式（プロフィールに分ける前）の記録。保護者の判断でリセットする
export function removeLegacyData() {
  try {
    window.localStorage.removeItem("shakai-drill:progress:v1");
    window.localStorage.removeItem("shakai-drill:favorites:v1");
  } catch {
    // 消せなくても使わないだけ
  }
}
