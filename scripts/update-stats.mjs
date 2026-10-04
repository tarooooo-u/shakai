// e-Stat から統計のランキングを取得して content/stats/rankings.csv に保存する。
//   npm run stats
// 新しい年の統計が出たら、下の DATASETS の表ID・年を差し替えて再実行する
// （表IDは `node scripts/estat.mjs search <語>` で探す）。
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { data } from "./estat.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "content", "stats", "rankings.csv");
const TOP = 10;

const fruit = (name, id) => ({
  key: `${name}の収穫量`,
  id,
  year: "2024年産",
  filter: { cdCat02: "1003" }, // 収穫量
  area: "cat01",
});

const DATASETS = [
  fruit("みかん", "0004046674"),
  fruit("りんご", "0004046679"),
  fruit("日本なし", "0004046680"),
  fruit("もも", "0004046684"),
  fruit("おうとう（さくらんぼ）", "0004046686"),
  fruit("うめ", "0004046687"),
  fruit("ぶどう", "0004046688"),
  { key: "茶（荒茶）の生産量", id: "0004046428", year: "2024年産", filter: { cdCat02: "1005" }, area: "cat01" },
  {
    key: "漁港別の出荷量（主要品目の合計）",
    id: "0004046259",
    year: "2024年",
    filter: { cdCat02: "1001" },
    area: "cat01",
    port: true,
    note: "主要品目のみの合計。全魚種の水揚量とは異なる",
  },
];

const FULL = { 北海道: "北海道", 東京: "東京都", 大阪: "大阪府", 京都: "京都府" };
/** 「(都道府県)_青森」「全国_青森」「青森」→「青森県」。全国・地域の合計は null */
function prefecture(name) {
  if (/\(全国農業地域\)|計$/.test(name)) return null;
  const s = name.replace(/^\(都道府県\)_|^全国_/, "");
  if (s === "全国") return null;
  return FULL[s] ?? `${s}県`;
}

const rows = [];
for (const d of DATASETS) {
  process.stdout.write(`${d.key} … `);
  const res = await data(d.id, d.filter);
  const list = res.rows
    .map((r) => {
      const label = r[d.area];
      const name = d.port ? (/計$/.test(label) ? label.replace(/計$/, "") : null) : prefecture(label);
      return { name, value: Number(r.value), unit: r.unit };
    })
    .filter((r) => r.name && Number.isFinite(r.value))
    .sort((a, b) => b.value - a.value)
    .slice(0, TOP);
  if (list.length === 0) throw new Error(`${d.key}: データが取れませんでした（表 ${d.id}）`);
  list.forEach((r, i) =>
    rows.push([d.key, i + 1, r.name, r.value, r.unit ?? "", d.year, res.stat, d.id, d.note ?? ""]),
  );
  console.log(list.slice(0, 3).map((r) => r.name).join(" > "));
}

const esc = (v) => `"${String(v).replaceAll('"', '""')}"`;
const header = ["指標", "順位", "名前", "値", "単位", "年", "統計名", "表ID", "注記"];
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, "﻿" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n");
console.log(`\n保存しました: content/stats/rankings.csv（${rows.length}行）`);
console.log("出典：政府統計の総合窓口(e-Stat)");
