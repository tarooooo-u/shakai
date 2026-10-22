import type { Question } from "@/lib/types";
// content/questions/*.csv から scripts/build-questions.mjs が生成する
import generated from "./questions.generated.json";
import imagesData from "./images.generated.json";
// content/maps/places.csv・sets.csv から scripts/build-mapsets.mjs が生成する
import mapSetsData from "./mapsets.generated.json";
import type { MapSet, Place } from "@/lib/mapSets";
// content/sheets/*.json から scripts/build-sheets.mjs が生成する
import sheetsData from "./sheets.generated.json";
import type { Sheet } from "@/lib/sheets";
// content/kanji/words.csv から scripts/build-kanji.mjs が生成する
import kanjiData from "./kanji.generated.json";
import type { KanjiWord } from "@/lib/kanji";

// 漢字ドリルの語句
export const KANJI_WORDS = kanjiData.words as KanjiWord[];

export const KANJI_BY_ID = new Map(KANJI_WORDS.map((w) => [w.id, w]));

const KANJI_LINKS = kanjiData.links as Record<string, string[]>;

// 答えに漢字ドリルの語句が入っている問題には kanjiWords をつけ、テーマ「漢字」にも入れる（4択のみの問題はのぞく）
export const QUESTIONS = (generated as Question[]).map((q) => {
  const kanjiWords = KANJI_LINKS[q.id];
  if (!kanjiWords) return q;
  const tags = q.choiceOnly || q.tags.includes("漢字") ? q.tags : [...q.tags, "漢字"];
  return { ...q, kanjiWords, tags };
});

export const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

// 画像の出典一覧（content/images.csv から生成）
export const IMAGES = imagesData as { name: string; src: string; kind: string; file: string; artist: string; license: string; url: string }[];

// 白地図ドリルの地名と地図セット
export const PLACES = mapSetsData.places as Place[];

export const PLACE_BY_ID = new Map(PLACES.map((p) => [p.id, p]));

export const MAP_SETS = mapSetsData.sets as MapSet[];

// データシート（赤シートのようにかくした所をめくる）
export const SHEETS = sheetsData as Sheet[];
