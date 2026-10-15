// データシート：content/sheets/*.json を検証して data/sheets.generated.json を作る。
// `npm run questions` で問題データといっしょに走る。書き方は content/README.md の「データシート」。
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "content", "sheets");
const OUT = join(ROOT, "data", "sheets.generated.json");
const UNITS = JSON.parse(readFileSync(join(ROOT, "content", "units.json"), "utf8"));
const KINDS = ["tree", "cards", "bars"];
// かくし方の hide に書ける種類（lib/sheets.ts の cellsOf と同じ）
const FIELDS = { tree: ["name", "desc"], cards: ["title", "label", "value"], bars: ["series", "value", "row"] };
const TONES = ["amber", "green", "gray", "blue"];

const errors = [];
const sheets = [];
const ids = new Set();

for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json")).sort()) {
  const err = (msg) => errors.push(`${file}: ${msg}`);
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
  else if (!UNITS[s.category].includes(s.unit)) err(`unit「${s.unit}」が content/units.json の ${s.category} にありません`);
  if (!KINDS.includes(s.kind)) err(`kind は ${KINDS.join(" / ")} のどれか`);
  if (!s.source) err("source（出典）がありません");
  if (!Array.isArray(s.modes) || s.modes.length === 0) err("modes（かくし方）がありません");
  for (const m of s.modes ?? []) {
    if (!m.id || !m.label || !Array.isArray(m.hide) || m.hide.length === 0) err(`modes の書き方がちがいます：${JSON.stringify(m)}`);
    for (const h of m.hide ?? []) if (!FIELDS[s.kind]?.includes(h)) err(`modes「${m.label}」の hide「${h}」は ${FIELDS[s.kind]?.join(" / ")} のどれか`);
  }

  const out = { id: s.id, title: s.title, category: s.category, unit: s.unit, kind: s.kind, modes: s.modes, note: s.note, source: s.source };

  if (s.kind === "tree") {
    // 名前は記録のキーになるので、シートの中で重ならないようにする
    const names = new Set();
    const walk = (n, path) => {
      if (!n.name && !n.label) err(`${path}: name か label が必要です`);
      if (n.name && n.label) err(`${path}: name と label は片方だけ（label はまとまりの見出し）`);
      if (n.label && n.desc) err(`${path}: label のまとまりに desc は書けません`);
      if (n.tone && !TONES.includes(n.tone)) err(`${path}: tone は ${TONES.join(" / ")} のどれか`);
      if (n.name) {
        if (names.has(n.name)) err(`名前「${n.name}」が2つあります`);
        names.add(n.name);
      }
      (n.children ?? []).forEach((c, i) => walk(c, `${path} > ${c.name ?? c.label ?? i + 1}`));
    };
    if (!s.root) err("root がありません");
    else walk(s.root, s.root.name ?? s.root.label ?? "root");
    out.root = s.root;
  } else if (s.kind === "cards") {
    if (!Array.isArray(s.columns) || s.columns.length !== 3) err("columns は3つ（例：順位・品目・割合）");
    const titles = new Set();
    for (const c of s.cards ?? []) {
      if (titles.has(c.title)) err(`カード「${c.title}」が2つあります`);
      titles.add(c.title);
      if (!c.rows?.length) err(`カード「${c.title}」に rows がありません`);
      for (const r of c.rows ?? []) {
        if (!r.label || !r.value) err(`カード「${c.title}」の行に label・value がありません`);
        if (r.head !== undefined && (typeof r.head !== "string" || !r.head)) err(`カード「${c.title}」の head は文字で書く`);
      }
    }
    out.columns = s.columns;
    out.cards = s.cards;
  } else if (s.kind === "bars") {
    if (!s.series?.length) err("series がありません");
    out.series = s.series;
    out.rows = (s.rows ?? []).map((r) => {
      if (r.values?.length !== s.series?.length) err(`「${r.label}」の values の数が series（${s.series?.length}）とちがいます`);
      const total = r.values.reduce((a, b) => a + b, 0);
      if (!(total > 0)) err(`「${r.label}」の合計が0です`);
      return { label: r.label, percents: r.values.map((v) => Math.round((v / total) * 1000) / 10) };
    });
  }
  sheets.push(out);
}

if (errors.length) {
  console.error(`データシートにまちがいが ${errors.length} 件あります：\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
writeFileSync(OUT, JSON.stringify(sheets));
console.log(`データシート ${sheets.length} 枚 → data/sheets.generated.json`);
