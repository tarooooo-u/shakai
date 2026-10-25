import units from "@/content/rika/units.json";
import unitGroups from "@/content/rika/unit-groups.json";
import type { Difficulty } from "../types";

/** 理科の分野。社会の Category とは別 */
export type RikaCategory = "biology" | "earth" | "chemistry";

/** 問題用の写真。credit は「作者（ライセンス）」 */
export type RikaPicture = { src: string; credit: string };

/** 「画像・データの出典」ページに出す写真の情報（scripts/rika/build-questions.mjs が書き出す） */
export type RikaImageInfo = { name: string; src: string; kind: string; file: string; artist: string; license: string; url: string };

/** content/rika/questions/*.csv の1行（scripts/rika/build-questions.mjs が変換） */
export type RikaQuestion = {
  id: string;
  category: RikaCategory;
  /** 単元。content/rika/units.json のどれか */
  unit: string;
  kind?: string;
  difficulty: Difficulty;
  grade?: number;
  question: string;
  answer: string;
  altAnswers: string[];
  /** 誤答の選択肢 */
  choices: string[];
  explanation: string;
  kanjiNote?: string;
  tags: string[];
  /** 問題といっしょに見せる写真（content/rika/images.csv） */
  imageUrl?: string;
  imageCredit?: string;
  /** 2〜6枚の写真にア・イ・ウ…を付けて並べる */
  images?: RikaPicture[];
  /** 写真で選ぶ問題：選択肢の名前 → 写真（いつも4択で出す） */
  imageChoices?: Record<string, RikaPicture>;
  /** 選択肢を見ないと答えられない問題（カードでは出さない） */
  choiceOnly?: boolean;
  source?: string;
  checked: boolean;
};

export const RIKA_CATEGORY_LABEL: Record<RikaCategory, string> = {
  biology: "生物",
  earth: "地学",
  chemistry: "化学（一部）",
};

export const RIKA_CATEGORY_MARK: Record<RikaCategory, string> = { biology: "生", earth: "地", chemistry: "化" };

export const RIKA_CATEGORIES = Object.keys(RIKA_CATEGORY_LABEL) as RikaCategory[];
export const RIKA_UNITS: Record<RikaCategory, string[]> = units;
/** ダッシュボードの小見出し（植物・動物・人体 など） */
export const RIKA_UNIT_GROUPS: Record<RikaCategory, { label: string; units: string[] }[]> = unitGroups;
