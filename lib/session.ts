import { isActive, needsReview, type Progress } from "./progress";
import { CATEGORIES, DIFFICULTIES, type Category, type Difficulty, type Question } from "./types";

export type Mode = "active" | "unseen" | "review" | "ng" | "all";
/** card = 答えを見て自己採点 / choice = 4択 */
export type Style = "card" | "choice";

export const MODE_LABEL: Record<Mode, string> = {
  active: "卒業していない問題",
  unseen: "まだ解いていない問題",
  review: "要復習（△・×）",
  ng: "×だけ",
  all: "卒業した問題もふくめて全部",
};

export const STYLE_LABEL: Record<Style, string> = {
  card: "カード（自己採点）",
  choice: "4択",
};

export type Filter = {
  categories: Category[];
  /** 空なら選んだ分野の全単元 */
  units: string[];
  /** 空なら絞り込まない。山・河川・旧国名 など */
  kinds: string[];
  difficulties: Difficulty[];
  /** 空なら絞り込まない。どれか1つでも持っていれば対象 */
  tags: string[];
  mode: Mode;
  /** 0 = 全部 */
  count: number;
  style: Style;
  shuffle: boolean;
};

export const DEFAULT_FILTER: Filter = {
  categories: [...CATEGORIES],
  units: [],
  kinds: [],
  difficulties: [...DIFFICULTIES],
  tags: [],
  mode: "active",
  count: 7,
  style: "card",
  shuffle: true,
};

export function matchesMode(mode: Mode, q: Question, progress: Progress) {
  const r = progress[q.id];
  switch (mode) {
    case "active":
      return isActive(r);
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

export function matches(filter: Filter, q: Question, progress: Progress) {
  return (
    filter.categories.includes(q.category) &&
    (filter.units.length === 0 || filter.units.includes(q.unit)) &&
    (filter.kinds.length === 0 || (q.kind !== undefined && filter.kinds.includes(q.kind))) &&
    filter.difficulties.includes(q.difficulty) &&
    (filter.tags.length === 0 || filter.tags.some((t) => q.tags.includes(t))) &&
    matchesMode(filter.mode, q, progress)
  );
}

export function pickQuestions(all: Question[], filter: Filter, progress: Progress) {
  let list = all.filter((q) => matches(filter, q, progress));
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

/** 4択の選択肢（正解＋誤答3つ）。誤答が足りない問題は null（カードで出す） */
export function buildChoices(q: Question): string[] | null {
  // 画像で選ぶ問題は、画像がそろっている選択肢から出す
  if (q.imageChoices) {
    const wrong = Object.keys(q.imageChoices).filter((k) => k !== q.answer);
    return shuffle([q.answer, ...shuffle(wrong).slice(0, 3)]);
  }
  if (q.choices.length < 3) return null;
  return shuffle([q.answer, ...shuffle(q.choices).slice(0, 3)]);
}

// ───── URL での共有（例: ?u=江戸,幕末&n=7&s=choice）─────

const csv = (v: string | null) => (v ? v.split(",").filter(Boolean) : null);

export function filterToQuery(f: Filter): string {
  const p = new URLSearchParams();
  const d = DEFAULT_FILTER;
  if (f.categories.length !== d.categories.length) p.set("c", f.categories.join(","));
  if (f.units.length) p.set("u", f.units.join(","));
  if (f.kinds.length) p.set("k", f.kinds.join(","));
  if (f.difficulties.length !== d.difficulties.length) p.set("d", f.difficulties.join(","));
  if (f.tags.length) p.set("t", f.tags.join(","));
  if (f.mode !== d.mode) p.set("m", f.mode);
  if (f.count !== d.count) p.set("n", String(f.count));
  if (f.style !== d.style) p.set("s", f.style);
  if (!f.shuffle) p.set("o", "1");
  return p.toString();
}

export function filterFromQuery(params: URLSearchParams): Filter | null {
  if (params.size === 0) return null;
  const d = DEFAULT_FILTER;
  const pick = <T extends string>(values: string[] | null, allowed: readonly T[]) =>
    values ? (values.filter((v) => (allowed as readonly string[]).includes(v)) as T[]) : null;
  const n = Number(params.get("n"));
  const m = params.get("m") as Mode | null;
  const s = params.get("s") as Style | null;
  return {
    categories: pick(csv(params.get("c")), CATEGORIES) ?? d.categories,
    units: csv(params.get("u")) ?? [],
    kinds: csv(params.get("k")) ?? [],
    difficulties: pick(csv(params.get("d")), DIFFICULTIES) ?? d.difficulties,
    tags: csv(params.get("t")) ?? [],
    mode: m && m in MODE_LABEL ? m : d.mode,
    count: Number.isInteger(n) && n >= 0 && params.has("n") ? n : d.count,
    style: s && s in STYLE_LABEL ? s : d.style,
    shuffle: params.get("o") !== "1",
  };
}
