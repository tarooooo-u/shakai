import type { Question } from "@/lib/types";
// content/questions/*.csv から scripts/build-questions.mjs が生成する
import generated from "./questions.generated.json";
import imagesData from "./images.generated.json";

export const QUESTIONS = generated as Question[];

export const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

// 画像の出典一覧（content/images.csv から生成）
export const IMAGES = imagesData as { name: string; src: string; kind: string; file: string; artist: string; license: string; url: string }[];
