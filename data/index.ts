import { QUESTIONS } from "./questions";

export { QUESTIONS };

export const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));
