import units from "@/content/units.json";

export type Category = "history" | "geography" | "civics";

export type Difficulty = "basic" | "standard" | "advanced" | "top";

/** content/questions/*.csv の1行（scripts/build-questions.mjs が変換） */
export type Question = {
  id: string;
  category: Category;
  /** 単元。content/units.json のどれか */
  unit: string;
  /** 都道府県（地理で主に使う） */
  prefecture?: string;
  /** 問題の分類（山・河川・湖・旧国名 など） */
  kind?: string;
  difficulty: Difficulty;
  /** 4 / 5 / 6 年。未設定なら全学年 */
  grade?: number;
  question: string;
  answer: string;
  /** 入力式で正解にする別の書き方 */
  altAnswers: string[];
  /** 4択用の誤答。空なら4択では出さない */
  choices: string[];
  /** 背景知識・関連事項。最難関レベルで問われる「なぜ」まで書く */
  explanation: string;
  /** 書き間違えやすい漢字などの注意点 */
  kanjiNote?: string;
  /** 人物 / 漢字 / 統計 / 多答 / ひっかけ など */
  tags: string[];
  /** 地図・雨温図・人物写真など（public/ 以下のパスか URL） */
  imageUrl?: string;
  map?: { lat: number; lng: number };
  /** 統計の年・出典など */
  source?: string;
  /** 保護者が内容を確認済みか */
  checked: boolean;
};

/** 〇 完璧 / △ うろ覚え / × 間違い */
export type Grade = "ok" | "unsure" | "ng";

export const CATEGORY_LABEL: Record<Category, string> = {
  history: "歴史",
  geography: "地理",
  civics: "公民",
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  basic: "基本",
  standard: "標準",
  advanced: "発展",
  top: "最難関",
};

export const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];
export const DIFFICULTIES = Object.keys(DIFFICULTY_LABEL) as Difficulty[];
export const UNITS: Record<Category, string[]> = units;
