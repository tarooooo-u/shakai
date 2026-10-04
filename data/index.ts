import type { Question } from "@/lib/types";
// content/questions/*.csv から scripts/build-questions.mjs が生成する
import generated from "./questions.generated.json";

export const QUESTIONS = generated as Question[];

export const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));
