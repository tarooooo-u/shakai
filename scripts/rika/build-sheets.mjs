// 理科のデータシート：content/rika/sheets/*.json を検証して data/rika/sheets.generated.json を作る。
// 社会（scripts/build-sheets.mjs）とは別。`npm run questions` で走る。書き方は content/rika/README.md の「データシート」。
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT = join(ROOT, "content", "rika");
const DIR = join(CONTENT, "sheets");
const OUT_DIR = join(ROOT, "data", "rika");
const OUT = join(OUT_DIR, "sheets.generated.json");
const UNITS = JSON.parse(readFileSync(join(CONTENT, "units.json"), "utf8"));

const errors = [];
const sheets = [];
const ids = new Set();

for (const file of existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith(".json")).sort() : []) {
  const err = (msg) => errors.push(`content/rika/sheets/${file}: ${msg}`);
  let s;
  try {
    s = JSON.parse(readFileSync(join(DIR, file), "utf8").replace(/^﻿/, ""));
  } catch (e) {
    err(`JSON として読めません（${e.message}）`);
    continue;
  }
  if (!s.id || !/^[a-z0-9-]+$/.test(s.id)) err("id は英小文字・数字・- で書く（学習記録のキー。一度付けたら変えない）");
  if (ids.has(s.id)) err(`id「${s.id}」が重なっています`);
  ids.add(s.id);
  if (!s.title) err("title がありません");
  if (!UNITS[s.category]) err(`category は ${Object.keys(UNITS).join(" / ")} のどれか`);
  else if (!UNITS[s.category].includes(s.unit)) err(`unit「${s.unit}」が content/rika/units.json の ${s.category} にありません`);
  if (!s.source) err("source（出典）がありません");

  const n = s.columns?.length ?? 0;
  if (!Array.isArray(s.columns) || n < 2) err("columns（表の見出し）は2つ以上");
  if (!Array.isArray(s.rows) || s.rows.length === 0) err("rows がありません");
  const heads = new Set();
  for (const [i, row] of (s.rows ?? []).entries()) {
    if (!Array.isArray(row) || row.length !== n) err(`${i + 1}行目のマスの数が columns（${n}）とちがいます`);
    else if (row.some((v) => typeof v !== "string")) err(`${i + 1}行目：マスは文字で書く（空のマスは ""）`);
    if (!row?.[0]) err(`${i + 1}行目：左はしのマス（行の名前）は空にできません`);
    if (heads.has(row?.[0])) err(`行の名前「${row?.[0]}」が2つあります（記録のキー）`);
    heads.add(row?.[0]);
  }
  if (new Set(s.columns ?? []).size !== n) err("columns の見出しが重なっています（記録のキー）");

  if (!Array.isArray(s.modes) || s.modes.length === 0) err("modes（かくし方）がありません");
  const modeIds = new Set();
  for (const m of s.modes ?? []) {
    if (!m.id || !/^[a-z0-9-]+$/.test(m.id) || !m.label) err(`modes の id（英小文字）・label がありません：${JSON.stringify(m)}`);
    if (modeIds.has(m.id)) err(`modes の id「${m.id}」が重なっています`);
    modeIds.add(m.id);
    if (!Array.isArray(m.cols) || m.cols.length === 0 || m.cols.some((c) => !Number.isInteger(c) || c < 0 || c >= n))
      err(`modes「${m.label}」の cols は 0〜${n - 1} の列番号（0 が左はし）`);
  }

  sheets.push({
    id: s.id,
    title: s.title,
    category: s.category,
    unit: s.unit,
    columns: s.columns,
    rows: s.rows,
    modes: s.modes,
    ...(s.note && { note: s.note }),
    source: s.source,
  });
}

if (errors.length) {
  console.error(`\n理科のデータシートにまちがいが ${errors.length} 件あります：\n- ${errors.join("\n- ")}\n`);
  process.exit(1);
}
// 一覧に出す順：分野ごとに units.json の単元の順。同じ単元の中はファイル名の順
const unitIndex = (s) => UNITS[s.category]?.indexOf(s.unit) ?? 0;
sheets.sort((a, b) => unitIndex(a) - unitIndex(b));
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, JSON.stringify(sheets));
console.log(`理科のデータシート ${sheets.length} 枚 → data/rika/sheets.generated.json`);
