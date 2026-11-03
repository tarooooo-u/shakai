// 正誤ドリル：入試の「次の文X・Yの正誤の組合せ」の形で練習する。
// 文は content/seigo/statements.csv（scripts/build-seigo.mjs が data/seigo.generated.json にする）。
// 1つの文に「正しい形」と「1語だけ入れかえた誤りの形」があり、出すたびにどちらかをえらぶ。
// 誤りの形を「誤り」と見ぬけたら、どの語句がまちがいかもタップで答える。
// 学習記録は文ごと（例: s0001@seigo）。ふだんの問題の記録とは別に数える。
import { isActive, isGraduated, type Progress } from "./progress";
import { shuffle } from "./session";
import type { Category } from "./types";

/** 文のかけら。text = ふつうの文字 / chunk = タップできる語句 / swap = 正しい形と誤りの形で入れかわる語句 */
export type SeigoPart = { text: string } | { chunk: string } | { right: string; wrong: string };

export type SeigoStatement = {
  id: string;
  field: Category;
  unit: string;
  parts: SeigoPart[];
  /** ひっかけの型（人物・時期・場所・言い過ぎ・用語・数字・因果） */
  trap: string;
  note: string;
  /** つながっているふだんの問題の id */
  related: string[];
  source?: string;
  checked: boolean;
};

export const seigoKey = (id: string) => `${id}@seigo`;

export type SeigoRun = {
  /** 出す文（2つずつ X・Y として出す） */
  targets: string[];
  /** true = 誤りの形で出す（開始時に決めておく） */
  wrong: Record<string, boolean>;
  graduatedBefore: string[];
};

/** 文を正しい形か誤りの形で、文字だけにする */
export const sentence = (s: SeigoStatement, wrong: boolean) =>
  s.parts.map((p) => ("text" in p ? p.text : "chunk" in p ? p.chunk : wrong ? p.wrong : p.right)).join("");

export const swapOf = (s: SeigoStatement) => s.parts.find((p): p is { right: string; wrong: string } => "right" in p)!;

/** 出す文：卒業していないものからランダムに count 個（0 なら全部）。全部卒業していたら卒業したものから。2つずつ組にするので偶数にする */
export function seigoTargets(list: SeigoStatement[], progress: Progress, count: number) {
  const active = list.filter((s) => isActive(progress[seigoKey(s.id)]));
  let ids = shuffle(active.length >= 2 ? active : list).map((s) => s.id);
  if (count > 0) ids = ids.slice(0, count);
  return ids.length % 2 ? ids.slice(0, -1) : ids;
}

/** それぞれの文を正しい形・誤りの形のどちらで出すか（半分ずつの確率。入試と同じく「両方正しい」「両方誤り」もある） */
export const seigoVersions = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, Math.random() < 0.5]));

export function seigoProgress(list: SeigoStatement[], progress: Progress) {
  const records = list.map((s) => progress[seigoKey(s.id)]);
  return {
    total: records.length,
    seen: records.filter(Boolean).length,
    graduated: records.filter(isGraduated).length,
  };
}

/** 入試の答え方の番号（1 X正Y正 / 2 X正Y誤 / 3 X誤Y正 / 4 X誤Y誤） */
export const examNumber = (xWrong: boolean, yWrong: boolean) => 1 + (xWrong ? 2 : 0) + (yWrong ? 1 : 0);
