export type Category = "history" | "geography" | "politics" | "economy";

export type Difficulty = "basic" | "standard" | "advanced" | "top";

export type Question = {
  id: string;
  category: Category;
  /** 例: "江戸時代", "気候", "国会" */
  subCategory: string;
  difficulty: Difficulty;
  question: string;
  answer: string;
  /** 背景知識・関連事項。最難関レベルで問われる「なぜ」まで書く */
  explanation: string;
  /** 書き間違えやすい漢字などの注意点 */
  kanjiNote?: string;
  /** 地図・雨温図・人物写真など（public/ 以下のパスか URL） */
  imageUrl?: string;
};

/** 〇 完璧 / △ うろ覚え / × 間違い */
export type Grade = "ok" | "unsure" | "ng";

export const CATEGORY_LABEL: Record<Category, string> = {
  history: "歴史",
  geography: "地理",
  politics: "政治",
  economy: "経済",
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  basic: "基本",
  standard: "標準",
  advanced: "発展",
  top: "最難関",
};

export const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];
export const DIFFICULTIES = Object.keys(DIFFICULTY_LABEL) as Difficulty[];
