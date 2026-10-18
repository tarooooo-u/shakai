"use client";

import { createProfileStore } from "./profiles";
import type { Category } from "./types";

// ───── データシート（赤シートのように、かくした所をタップでめくる）─────
// content/sheets/*.json から scripts/build-sheets.mjs が data/sheets.generated.json を作る。

/** かくし方。hide にある種類の文字がかくれる */
export type SheetMode = { id: string; label: string; hide: string[] };

/** 組織図の1つの箱。label だけのものは「中央」「地方」などのまとまり（かくさない） */
export type TreeNode = {
  name?: string;
  desc?: string;
  label?: string;
  tone?: "amber" | "green" | "gray" | "blue";
  children?: TreeNode[];
};

type SheetBase = {
  id: string;
  title: string;
  category: Category;
  unit: string;
  modes: SheetMode[];
  note?: string;
  source: string;
};

export type Sheet = SheetBase &
  (
    | { kind: "tree"; root: TreeNode }
    | {
        kind: "cards";
        columns: [string, string, string];
        /**
         * head は左の「1位」の代わりに出す見出し（「北海道」「日本」など。かくさない）。
         * hideTop は「大事なところだけ」でかくす行の数（なければ isMainRow の決まりで決める）
         */
        cards: { title: string; sub?: string; hideTop?: number; rows: { label: string; value: string; head?: string }[] }[];
      }
    | {
        kind: "bars";
        series: string[];
        /** percents は build で計算した割合（％、小数1けた） */
        rows: { label: string; percents: number[] }[];
      }
    | {
        kind: "lines";
        /** たて軸の単位（「%」など）。yMax はたて軸の上の値 */
        yUnit: string;
        yMax: number;
        years: number[];
        /** values は years と同じ並び（調査がない年は null）。labelAt は線に記号（A・B…）を置く年 */
        series: { name: string; labelAt: number; values: (number | null)[] }[];
        /** たての点線で示すできごと（かくさない） */
        marks: { year: number; label: string }[];
      }
  );

/** かくせる文字1つ。key はシートの中で重ならない */
export type Cell = { key: string; field: string };

type Card = Extract<Sheet, { kind: "cards" }>["cards"][number];

/** 「大事なところだけ」でかくす割合（％）。これ以上ならかくす */
export const MAIN_PERCENT = 10;
/** 3位までは、これ以上ならかくす（入試でよく聞かれる。茶の三重 6.8% など） */
export const TOP3_PERCENT = 5;

/**
 * 表の行が「大事なところ」か（「大事なところだけ」のときにかくす行か）。
 * カードに hideTop があれば上からその数だけ。なければ1位、MAIN_PERCENT 以上、3位までで TOP3_PERCENT 以上の行。
 * 値が割合（「36.5%」の形）でない行は、いつも大事なところとする
 */
export function isMainRow(card: Card, i: number) {
  if (card.hideTop !== undefined) return i < card.hideTop;
  if (i === 0) return true;
  const m = /^(\d+(?:\.\d+)?)%$/.exec(card.rows[i].value);
  if (!m) return true;
  const p = Number(m[1]);
  return p >= MAIN_PERCENT || (i < 3 && p >= TOP3_PERCENT);
}

/** 「大事なところだけ」と「ぜんぶ」で、かくす所が変わるシートか */
export function hasMinorRows(sheet: Sheet) {
  return sheet.kind === "cards" && sheet.cards.some((c) => c.rows.some((_, i) => !isMainRow(c, i)));
}

/** シートの中のかくせる文字を全部。onlyMain なら、表の大事でない行（isMainRow）の県名・割合はのぞく */
export function cellsOf(sheet: Sheet, onlyMain = false): Cell[] {
  const cells: Cell[] = [];
  if (sheet.kind === "tree") {
    const walk = (n: TreeNode) => {
      if (n.name) cells.push({ key: n.name, field: "name" });
      if (n.name && n.desc) cells.push({ key: `${n.name}.desc`, field: "desc" });
      n.children?.forEach(walk);
    };
    walk(sheet.root);
  } else if (sheet.kind === "cards") {
    for (const c of sheet.cards) {
      cells.push({ key: c.title, field: "title" });
      c.rows.forEach((_, i) => {
        if (onlyMain && !isMainRow(c, i)) return;
        cells.push({ key: `${c.title}/${i + 1}`, field: "label" });
        cells.push({ key: `${c.title}/${i + 1}.value`, field: "value" });
      });
    }
  } else if (sheet.kind === "lines") {
    sheet.series.forEach((s) => cells.push({ key: `series/${s.name}`, field: "series" }));
  } else {
    sheet.series.forEach((s) => cells.push({ key: `series/${s}`, field: "series" }));
    for (const r of sheet.rows) {
      cells.push({ key: `row/${r.label}`, field: "row" });
      r.percents.forEach((p, i) => {
        if (p >= BAR_LABEL_MIN) cells.push({ key: `${r.label}/${sheet.series[i]}`, field: "value" });
      });
    }
  }
  return cells;
}

/** 帯グラフで、これより細い所には数字を書かない（かくさない） */
export const BAR_LABEL_MIN = 4;

// ───── 記録 ─────
// 「シートid@かくし方」ごとに、× をつけた所と最後に開いた時刻をプロフィールごとに保存する。

export type SheetRecord = { ng: string[]; last: number };
export type SheetProgress = Record<string, SheetRecord>;

const store = createProfileStore<SheetProgress>("sheets:v1", {}, "entries");

export const useSheetProgress = store.use;

export const sheetKey = (sheetId: string, modeId: string) => `${sheetId}@${modeId}`;

export function setNg(sheetId: string, modeId: string, cellKey: string, on: boolean) {
  const current = store.get();
  const k = sheetKey(sheetId, modeId);
  const ng = new Set(current[k]?.ng ?? []);
  if (on) ng.add(cellKey);
  else ng.delete(cellKey);
  store.set({ ...current, [k]: { ng: [...ng], last: Date.now() } });
}

export function touchSheet(sheetId: string, modeId: string) {
  const current = store.get();
  const k = sheetKey(sheetId, modeId);
  store.set({ ...current, [k]: { ng: current[k]?.ng ?? [], last: Date.now() } });
}

/** シート全体（どのかくし方でも）で × が残っている数 */
export function ngCount(progress: SheetProgress, sheet: Sheet) {
  return sheet.modes.reduce((s, m) => s + (progress[sheetKey(sheet.id, m.id)]?.ng.length ?? 0), 0);
}
