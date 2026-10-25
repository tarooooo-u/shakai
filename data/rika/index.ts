import type { RikaImageInfo, RikaQuestion } from "@/lib/rika/types";
// content/rika/questions/*.csv から scripts/rika/build-questions.mjs が生成する
import generated from "./questions.generated.json";
// 問題で使っている写真の出典（同じく scripts/rika/build-questions.mjs が生成する）
import images from "./images.generated.json";

export const RIKA_QUESTIONS = generated as RikaQuestion[];

export const RIKA_QUESTION_BY_ID = new Map(RIKA_QUESTIONS.map((q) => [q.id, q]));

export const RIKA_IMAGES = images as RikaImageInfo[];
