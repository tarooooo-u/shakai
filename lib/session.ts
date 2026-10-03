import { needsReview, type Progress } from "./progress";
import type { Category, Difficulty, Question } from "./types";

export type Mode = "all" | "unseen" | "review" | "ng";

export const MODE_LABEL: Record<Mode, string> = {
  all: "すべて",
  unseen: "まだ解いていない問題",
  review: "要復習（△・×）",
  ng: "×だけ",
};

export type Filter = {
  categories: Category[];
  difficulties: Difficulty[];
  mode: Mode;
  /** 0 = 全部 */
  count: number;
  shuffle: boolean;
};

export function matchesMode(mode: Mode, q: Question, progress: Progress) {
  const r = progress[q.id];
  switch (mode) {
    case "all":
      return true;
    case "unseen":
      return r === undefined;
    case "review":
      return needsReview(r);
    case "ng":
      return r?.grade === "ng";
  }
}

export function pickQuestions(all: Question[], filter: Filter, progress: Progress) {
  let list = all.filter(
    (q) =>
      filter.categories.includes(q.category) &&
      filter.difficulties.includes(q.difficulty) &&
      matchesMode(filter.mode, q, progress),
  );
  if (filter.shuffle) list = shuffle(list);
  if (filter.count > 0) list = list.slice(0, filter.count);
  return list.map((q) => q.id);
}

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
