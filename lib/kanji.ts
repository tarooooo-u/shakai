// 漢字ドリル：まちがえやすい字のある語句を「どっち？」（正しい書き方をえらぶ）と「書く」で練習する。
// 語句は content/kanji/words.csv（scripts/build-kanji.mjs が data/kanji.generated.json にする）。
// 学習記録は「語句 × 答え方」ごと（例: k0001@write）。ふだんの問題の記録とは別に数える。
import { isActive, isGraduated, type Progress } from "./progress";
import { shuffle } from "./session";
import type { Category } from "./types";

export type KanjiField = Exclude<Category, "current">;

export type KanjiWord = {
  id: string;
  word: string;
  reading: string;
  field: KanjiField;
  /** 読みだけでは同じ読みの語句と区別できないので、短い説明をそえる */
  hint: string;
  /** 書きまちがえやすい字（お手本で赤くする） */
  chars: string;
  /** まちがった書き方（「どっち？」の選択肢）。空なら「書く」だけで出す */
  wrong: string[];
  note: string;
  source?: string;
  checked: boolean;
};

/** pick = どっち？（正しい書き方をえらぶ） / write = 読みとヒントを見て書く */
export type KanjiMode = "pick" | "write";

export const KANJI_MODE_LABEL: Record<KanjiMode, string> = {
  pick: "どっち？",
  write: "書く",
};

export const kanjiKey = (id: string, mode: KanjiMode) => `${id}@${mode}`;

/** その答え方で出せる語句か（「どっち？」はまちがった書き方があるものだけ） */
export const canAsk = (w: KanjiWord, mode: KanjiMode) => mode === "write" || w.wrong.length > 0;

export type KanjiRun = {
  mode: KanjiMode;
  /** 出す語句（この順に出す） */
  targets: string[];
  /** 「どっち？」の選択肢（開始時に決めておく） */
  choices: Record<string, string[]>;
  /** 始めたときにもう卒業していた語句 */
  graduatedBefore: string[];
};

/** 出す語句：卒業していないものからランダムに count 個（0 なら全部）。全部卒業していたら卒業したものから */
export function kanjiTargets(words: KanjiWord[], mode: KanjiMode, progress: Progress, count: number) {
  const pool = words.filter((w) => canAsk(w, mode));
  const active = pool.filter((w) => isActive(progress[kanjiKey(w.id, mode)]));
  const ids = shuffle(active.length ? active : pool).map((w) => w.id);
  return count > 0 ? ids.slice(0, count) : ids;
}

/** 正しい書き方とまちがった書き方（3つまで）をまぜる */
export const kanjiChoices = (w: KanjiWord) => shuffle([w.word, ...shuffle(w.wrong).slice(0, 3)]);

export function kanjiProgress(words: KanjiWord[], mode: KanjiMode, progress: Progress) {
  const records = words.filter((w) => canAsk(w, mode)).map((w) => progress[kanjiKey(w.id, mode)]);
  return {
    total: records.length,
    seen: records.filter(Boolean).length,
    graduated: records.filter(isGraduated).length,
  };
}
