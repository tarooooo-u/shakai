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
        /** head は左の「1位」の代わりに出す見出し（「北海道」「日本」など。かくさない） */
        cards: { title: string; sub?: string; rows: { label: string; value: string; head?: string }[] }[];
      }
    | {
        kind: "bars";
        series: string[];
        /** percents は build で計算した割合（％、小数1けた） */
        rows: { label: string; percents: number[] }[];
      }
  );

/** かくせる文字1つ。key はシートの中で重ならない */
export type Cell = { key: string; field: string };

/** シートの中のかくせる文字を全部 */
export function cellsOf(sheet: Sheet): Cell[] {
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
        cells.push({ key: `${c.title}/${i + 1}`, field: "label" });
        cells.push({ key: `${c.title}/${i + 1}.value`, field: "value" });
      });
    }
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

const store = createProfileStore<SheetProgress>("sheets:v1", {});

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
