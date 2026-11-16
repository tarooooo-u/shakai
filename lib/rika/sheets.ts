"use client";

import { createProfileStore } from "../profiles";
import type { RikaCategory } from "./types";

// ───── 理科のデータシート（表の一部を赤い紙でかくし、タップでめくる）─────
// content/rika/sheets/*.json から scripts/rika/build-sheets.mjs が data/rika/sheets.generated.json を作る。
// 社会のデータシート（lib/sheets.ts）とは別。記録も rika-sheets:v1 に分ける。

/** かくし方。cols に書いた列（0 が左はしの見出しの列）のマスがかくれる */
export type RikaSheetMode = { id: string; label: string; cols: number[] };

export type RikaSheet = {
  id: string;
  title: string;
  category: RikaCategory;
  unit: string;
  /** 表の見出し（左から） */
  columns: string[];
  /** 1行＝columns と同じ数のマス。左はしのマスは行の名前（シートの中で重ならない） */
  rows: string[][];
  modes: RikaSheetMode[];
  note?: string;
  source: string;
};

/** マス1つのキー（記録に使う）。左はしは行の名前、ほかは「行の名前/列の見出し」 */
export const cellKey = (sheet: RikaSheet, r: number, c: number) => (c === 0 ? sheet.rows[r][0] : `${sheet.rows[r][0]}/${sheet.columns[c]}`);

/** かくし方 mode でかくれるマスのキーを全部（空のマスはかくさない） */
export function hiddenKeys(sheet: RikaSheet, mode: RikaSheetMode) {
  const keys: string[] = [];
  sheet.rows.forEach((row, r) => row.forEach((v, c) => v && mode.cols.includes(c) && keys.push(cellKey(sheet, r, c))));
  return keys;
}

// ───── 記録 ─────
// 「シートid@かくし方」ごとに、× をつけたマスと最後に開いた時刻をプロフィールごとに保存する。

export type RikaSheetRecord = { ng: string[]; last: number };
export type RikaSheetProgress = Record<string, RikaSheetRecord>;

const store = createProfileStore<RikaSheetProgress>("rika-sheets:v1", {}, "entries");

export const useRikaSheetProgress = store.use;

export const sheetKey = (sheetId: string, modeId: string) => `${sheetId}@${modeId}`;

export function setNg(sheetId: string, modeId: string, key: string, on: boolean) {
  const current = store.get();
  const k = sheetKey(sheetId, modeId);
  const ng = new Set(current[k]?.ng ?? []);
  if (on) ng.add(key);
  else ng.delete(key);
  store.set({ ...current, [k]: { ng: [...ng], last: Date.now() } });
}

export function touchSheet(sheetId: string, modeId: string) {
  const current = store.get();
  const k = sheetKey(sheetId, modeId);
  store.set({ ...current, [k]: { ng: current[k]?.ng ?? [], last: Date.now() } });
}

/** シート全体（どのかくし方でも）で × が残っている数 */
export function ngCount(progress: RikaSheetProgress, sheet: RikaSheet) {
  return sheet.modes.reduce((s, m) => s + (progress[sheetKey(sheet.id, m.id)]?.ng.length ?? 0), 0);
}
