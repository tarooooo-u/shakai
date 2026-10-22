import type { RikaQuestion } from "@/lib/rika/types";
// content/rika/questions/*.csv から scripts/rika/build-questions.mjs が生成する
import generated from "./questions.generated.json";

export const RIKA_QUESTIONS = generated as RikaQuestion[];

export const RIKA_QUESTION_BY_ID = new Map(RIKA_QUESTIONS.map((q) => [q.id, q]));
