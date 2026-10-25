import { isActive, type Progress } from "../progress";
import type { RikaQuestion } from "./types";

/** card = 答えを見て自己採点 / choice = 4択 */
export type RikaStyle = "card" | "choice";

export const RIKA_STYLE_LABEL: Record<RikaStyle, string> = { card: "カード", choice: "4択" };

/** 1回に出す問題の数。0 = 全部 */
export const RIKA_COUNTS = [10, 0] as const;
export type RikaCount = (typeof RIKA_COUNTS)[number];

/** 理科の1回分の出題 */
export type RikaSession = {
  ids: string[];
  style: RikaStyle;
  /** 4択で出す問題の選択肢（カードで出す問題は入れない） */
  choices: Record<string, string[]>;
  /** 始める前に卒業していた問題（結果画面で「この回で卒業」を数えるため） */
  graduatedBefore: string[];
};

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 4択の選択肢（正解＋誤答3つ）。誤答が足りない問題は null（カードで出す） */
export function buildRikaChoices(q: RikaQuestion): string[] | null {
  if (q.choices.length < 3) return null;
  return shuffle([q.answer, ...shuffle(q.choices).slice(0, 3)]);
}

/**
 * 単元から出す問題を選ぶ。卒業していない問題を優先し、
 * 全部卒業していたら卒業した問題もふくめて出す。
 */
export function pickRikaQuestions(list: RikaQuestion[], progress: Progress, count: RikaCount) {
  const active = list.filter((q) => isActive(progress[q.id]));
  const picked = shuffle(active.length > 0 ? active : list);
  return (count > 0 ? picked.slice(0, count) : picked).map((q) => q.id);
}
