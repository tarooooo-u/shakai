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

const veg = (name, id) => ({ key: `${name}の収穫量`, id, year: "2024年産", filter: { cdCat02: "1003" }, area: "cat01", check: /^(計_)?収穫量$/ });
const stock = (key, id, code, year) => ({ key, id, year, filter: { cdCat02: code }, area: "cat01" });

const DATASETS = [
  { key: "米（水稲）の収穫量", id: "0004046173", year: "2024年産", filter: { cdCat02: "1003" }, area: "cat01", check: /^収穫量（子実用）$/ },
  veg("キャベツ", "0004045957"),
  veg("レタス", "0004045968"),
  veg("はくさい", "0004045955"),
  veg("だいこん", "0004045947"),
  veg("にんじん", "0004045949"),
  veg("ばれいしょ（じゃがいも）", "0004045952"),
  veg("たまねぎ", "0004045971"),
  veg("ねぎ", "0004045969"),
  veg("きゅうり", "0004045973"),
  veg("なす", "0004045975"),
  veg("トマト", "0004045976"),
  veg("ピーマン", "0004045977"),
  veg("ほうれんそう", "0004045959"),
  veg("いちご", "0004045985"),
  veg("メロン", "0004045986"),
  veg("すいか", "0004045987"),
  stock("乳用牛の飼養頭数", "0004047181", "1002", "2025年2月1日"),
  stock("肉用牛の飼養頭数", "0004047183", "1003", "2025年2月1日"),
  stock("豚の飼養頭数", "0004041866", "1001", "2024年2月1日"),
  stock("採卵鶏（成鶏めす）の飼養羽数", "0004041879", "1001", "2024年2月1日"),
  stock("ブロイラーの飼養羽数", "0004041880", "1002", "2024年2月1日"),
  {
    key: "都道府県の人口（多い順）",
    id: "0004026264",
    year: "2024年10月1日",
    filter: { cdCat01: "204", cdCat02: "000", cdCat03: "001", cdTime: "2024001001" },
    area: "area",
  },
  {
    key: "都道府県の人口（少ない順）",
    id: "0004026264",
    year: "2024年10月1日",
    filter: { cdCat01: "204", cdCat02: "000", cdCat03: "001", cdTime: "2024001001" },
    area: "area",
    asc: true,
  },
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

/** 「(都道府県)_青森」「全国_青森」「青森」「青森県」→「青森県」。全国・地域の合計は null */
function prefecture(name) {
  if (/全国農業地域|農政局|沖縄総合事務局|計$/.test(name)) return null;
  const s = name.replace(/^[（(]?都道府県[）)]?_|^全国_/, "");
  if (s === "全国" || s === "都府県") return null;
  if (s === "北海道" || /[都府県]$/.test(s)) return s;
  return { 東京: "東京都", 大阪: "大阪府", 京都: "京都府" }[s] ?? `${s}県`;
}

const rows = [];
for (const d of DATASETS) {
  process.stdout.write(`${d.key} … `);
  const res = await data(d.id, d.filter);
  if (d.check && res.rows.some((r) => !Object.values(r).some((v) => d.check.test(String(v))))) {
    throw new Error(`${d.key}: 想定した列（${d.check}）ではありません。表 ${d.id} の分類コードを確認してください`);
  }
  const list = res.rows
    .map((r) => {
      const label = r[d.area];
      const name = d.port ? (/計$/.test(label) ? label.replace(/計$/, "") : null) : prefecture(label);
      return { name, value: Number(r.value), unit: r.unit };
    })
    .filter((r) => r.name && Number.isFinite(r.value))
    .sort((a, b) => (d.asc ? a.value - b.value : b.value - a.value))
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
