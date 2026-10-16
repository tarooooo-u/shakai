// e-Stat の経済構造実態調査（製造業事業所調査）から、工業地帯・工業地域の業種別の製造品出荷額等を作り、
// データシート content/sheets/industry-belts.json に保存する。
//   npm run industry
// 新しい年のデータが出たら、TABLE と YEAR を差し替えて再実行する
// （表IDは `node scripts/estat.mjs search 製造業事業所調査` の「地域編 産業中分類別…（全事業所）」）。
// 年を変えたら note・source の年も直す。
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { data } from "./estat.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TABLE = "0004068336"; // 2025年経済構造実態調査 製造業事業所調査 地域編（2024年の実績）
const YEAR = "2024";
const SHIPMENTS = "000004010050"; // 製造品出荷額等【百万円】

// 工業地帯・工業地域にふくめる都府県（県全体で数える）
const BELTS = [
  ["中京工業地帯", ["愛知県", "三重県"]],
  ["阪神工業地帯", ["大阪府", "兵庫県"]],
  ["京浜工業地帯", ["東京都", "神奈川県"]],
  ["瀬戸内工業地域", ["岡山県", "広島県", "山口県", "香川県", "愛媛県"]],
  ["関東内陸工業地域", ["栃木県", "群馬県", "埼玉県"]],
  ["東海工業地域", ["静岡県"]],
  ["京葉工業地域", ["千葉県"]],
  ["北陸工業地域", ["新潟県", "富山県", "石川県", "福井県"]],
  ["北九州工業地域", ["福岡県"]],
  ["全国", ["全国計"]],
];

// 業種のまとめ方（産業中分類の番号）
const SERIES = [
  ["金属", ["22", "23", "24"]],
  ["機械", ["25", "26", "27", "28", "29", "30", "31"]],
  ["化学", ["16", "17"]],
  ["食料品", ["09", "10"]],
  ["せんい", ["11"]],
];

const d = await data(TABLE, { cdCat01: SHIPMENTS });
// cat02 は「2024000000_2024_22_鉄鋼業_23_愛知県」のような名前
const table = {}; // 地域 → 中分類番号 → 百万円
const secret = [];
for (const r of d.rows) {
  const p = r.cat02.split("_");
  if (p[1] !== YEAR) continue;
  const [code, , , area] = [p[2], p[3], p[4], p[5]];
  const v = /^\d+$/.test(r.value) ? Number(r.value) : null;
  if (v === null) {
    if (r.value !== "-") secret.push(`${area}:${code}:${r.value}`);
    continue;
  }
  ((table[area] ??= {})[code] = v);
}

const rows = BELTS.map(([label, areas]) => {
  const sum = (codes) => areas.reduce((s, a) => s + codes.reduce((t, c) => t + (table[a]?.[c] ?? 0), 0), 0);
  const total = sum(["00"]);
  if (!total) throw new Error(`${label}: 製造業計がありません`);
  const parts = SERIES.map(([, codes]) => sum(codes));
  const other = total - parts.reduce((s, v) => s + v, 0);
  if (other < 0) throw new Error(`${label}: その他がマイナスです`);
  const values = [...parts, other].map((v) => Math.round(v / 1000)); // 十億円
  const pct = values.map((v) => ((v / (total / 1000)) * 100).toFixed(1));
  console.log(`${label}: 計 ${(total / 1e6).toFixed(1)}兆円  ${SERIES.map(([n], i) => `${n}${pct[i]}`).join(" ")} その他${pct[5]}`);
  const hidden = secret.filter((s) => areas.some((a) => s.startsWith(`${a}:`)));
  if (hidden.length) console.warn(`  注意 ${label}: 数字がかくされた業種 ${hidden.join(" ")}（その他に入る）`);
  return { label, values, _total: total, _hidden: hidden };
});

const sheet = {
  id: "industry-belts",
  title: "工業地帯・工業地域の業種別出荷額",
  category: "geography",
  unit: "工業",
  kind: "bars",
  modes: [
    { id: "row", label: "工業地帯の名前をかくす", hide: ["row"] },
    { id: "value", label: "割合をかくす", hide: ["value"] },
    { id: "series", label: "業種をかくす", hide: ["series"] },
  ],
  valueUnit: "十億円",
  series: [...SERIES.map(([n]) => n), "その他"],
  rows: rows.map(({ label, values }) => ({ label, values })),
  note: `${YEAR}年の製造品出荷額等の、業種ごとの割合（％）。上の3つが三大工業地帯、その下の工業地域は出荷額の多い順。中京は機械（とくに自動車）が7割近くで、出荷額も2位の阪神のおよそ2倍。三大工業地帯の中では阪神が金属の割合がいちばん高い。京葉は化学が4割をこえ、機械が少ない。北九州は、かつての中心だった金属より機械（自動車）のほうが多くなっている。工業地帯の範囲は都府県全体で数えた（京浜＝東京都・神奈川県、阪神＝大阪府・兵庫県、中京＝愛知県・三重県、北九州＝福岡県 など）。金属は鉄鋼・非鉄金属・金属製品、化学は石油製品をふくみ、食料品は飲料・飼料をふくむ。塾の資料と数字が少しちがうのは、年と業種のまとめ方がちがうため。`,
  source: `経済産業省「経済構造実態調査（製造業事業所調査）」${YEAR}年実績（2025年調査）`,
  sourceNote: `npm run industry（scripts/update-industry.mjs）で e-Stat から作成。表ID：${TABLE}。値は十億円（製造品出荷額等、全事業所）。秘匿（X）の業種はその他に入る：${rows.flatMap((r) => r._hidden).join(" ") || "なし"}。合計（兆円）：${rows.map((r) => `${r.label} ${(r._total / 1e6).toFixed(1)}`).join("、")}`,
};
writeFileSync(join(ROOT, "content", "sheets", "industry-belts.json"), JSON.stringify(sheet, null, 2) + "\n");
console.log("→ content/sheets/industry-belts.json");
