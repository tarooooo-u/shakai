// 気象庁の平年値（2020年平年値）から、各気象台の月平均気温・月降水量を取り出して
// content/climate/normals.csv に保存する。雨温図の問題で使う。
//   npm run climate
// 平年値は10年ごとに更新される（次は2030年平年値）。版が変わったら URL を差し替えて再実行する。
// 出典：気象庁ホームページ https://www.data.jma.go.jp/stats/data/mdrr/normal/index.html
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const URL = "https://www.data.jma.go.jp/stats/data/mdrr/normal/2020/data/normal_surface.zip";
const EDITION = "2020年平年値（1991〜2020年）第5版";
const CACHE = join(tmpdir(), "jma_normal_surface_2020.zip");
const OUT = join(ROOT, "content", "climate", "normals.csv");

// 要素番号（format_surface.pdf「月・年別平年値」）
const TEMP = "0500"; // 気温 月・年平均（0.1℃）
const PRECIP = "4000"; // 降水量 月・年合計（0.1mm）
const OK = "8"; // RMK=8 が正常値

if (!existsSync(CACHE)) {
  console.log("ダウンロード中 …", URL);
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  writeFileSync(CACHE, Buffer.from(await res.arrayBuffer()));
}
const files = unzipSync(new Uint8Array(readFileSync(CACHE)), {
  filter: (f) => f.name.endsWith("surface_station_index.csv") || /\/monthly\/nml_sfc_m_\d+\.csv$/.test(f.name),
});
const sjis = new TextDecoder("shift_jis");
const read = (name) => sjis.decode(files[name]);

// 地点情報：番号, 漢字名, カナ, ローマ字, 緯度(度,分), 経度(度,分), 標高
const stations = new Map();
const indexName = Object.keys(files).find((n) => n.endsWith("surface_station_index.csv"));
for (const line of read(indexName).split(/\r?\n/).slice(2)) {
  const p = line.split(",").map((s) => s.trim());
  if (!/^\d+$/.test(p[0] ?? "")) continue;
  stations.set(p[0], {
    name: p[1].replace(/　/g, ""),
    lat: +(Number(p[4]) + Number(p[5]) / 60).toFixed(4),
    lng: +(Number(p[6]) + Number(p[7]) / 60).toFixed(4),
  });
}

const rows = [];
for (const [name, bytes] of Object.entries(files)) {
  const m = name.match(/nml_sfc_m_(\d+)\.csv$/);
  if (!m) continue;
  const st = stations.get(m[1]);
  if (!st) continue;
  const values = {};
  for (const line of sjis.decode(bytes).split(/\r?\n/)) {
    const p = line.split(",").map((s) => s.trim());
    if (p[2] !== TEMP && p[2] !== PRECIP) continue;
    // 1〜12月と年：値は 6,8,10,…,30 列目、RMK はその次
    const v = [];
    for (let i = 0; i < 13; i++) {
      const value = p[6 + i * 2];
      const rmk = p[7 + i * 2];
      v.push(rmk === OK ? Number(value) / 10 : null);
    }
    values[p[2]] = v;
  }
  const t = values[TEMP];
  const r = values[PRECIP];
  if (!t || !r || [...t, ...r].some((x) => x === null)) continue; // 欠けている地点（富士山など）は除く
  rows.push([m[1], st.name, st.lat, st.lng, ...t, ...r]);
}
rows.sort((a, b) => a[0].localeCompare(b[0]));

const MONTHS = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);
const header = [
  "地点番号",
  "地点名",
  "緯度",
  "経度",
  ...MONTHS.map((m) => `気温${m}`),
  "気温年",
  ...MONTHS.map((m) => `降水量${m}`),
  "降水量年",
];
mkdirSync(dirname(OUT), { recursive: true });
const esc = (v) => `"${String(v).replaceAll('"', '""')}"`;
writeFileSync(
  OUT,
  "﻿" +
    `"# 出典：気象庁ホームページ（${EDITION}）。気温は℃、降水量はmm"\r\n` +
    [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n") +
    "\r\n",
);
console.log(`保存しました: content/climate/normals.csv（${rows.length}地点）`);
