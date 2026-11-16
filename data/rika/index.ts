import type { RikaSheet } from "@/lib/rika/sheets";
import type { RikaImageInfo, RikaQuestion } from "@/lib/rika/types";
// content/rika/questions/*.csv から scripts/rika/build-questions.mjs が生成する
import generated from "./questions.generated.json";
// 問題で使っている写真の出典（同じく scripts/rika/build-questions.mjs が生成する）
import images from "./images.generated.json";
// データシート（content/rika/sheets/*.json から scripts/rika/build-sheets.mjs が生成する）
import sheets from "./sheets.generated.json";

export const RIKA_QUESTIONS = generated as RikaQuestion[];

export const RIKA_QUESTION_BY_ID = new Map(RIKA_QUESTIONS.map((q) => [q.id, q]));

export const RIKA_IMAGES = images as RikaImageInfo[];

export const RIKA_SHEETS = sheets as RikaSheet[];

export const RIKA_SHEET_BY_ID = new Map(RIKA_SHEETS.map((s) => [s.id, s]));
