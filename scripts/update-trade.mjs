// e-Stat の貿易統計（財務省「普通貿易統計」概況品別国別表）から、
// 主な貿易相手国からの輸入品の上位5品目を作り、データシート content/sheets/imports-by-country.json に保存する。
//   npm run trade
// 新しい年の確定値が出たら、TABLE・YEAR を差し替えて再実行する
// （表IDは `node scripts/estat.mjs search 概況品別国別表` で探す。「輸入 1-12月」の表）。
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { data } from "./estat.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "content", "sheets", "imports-by-country.json");
const TABLE = "0003425296"; // 概況品別国別表 輸入（2021〜2024年：確定、2025年：確々報）
const YEAR = "2025";
const TOP = 5;

// 国（e-Stat の国コード → 画面に出す名前）
const COUNTRIES = {
  50105: "中国",
  50304: "アメリカ",
  50601: "オーストラリア",
  50106: "台湾",
  50103: "韓国",
  50147: "アラブ首長国連邦",
  50110: "ベトナム",
  50137: "サウジアラビア",
  50111: "タイ",
  50213: "ドイツ",
  50118: "インドネシア",
  50113: "マレーシア",
  50220: "イタリア",
  50210: "フランス",
  50302: "カナダ",
  50410: "ブラジル",
  50409: "チリ",
  50205: "イギリス",
  50140: "カタール",
  50224: "ロシア",
};

// 品目のまとめ方。[名前, 足す概況品コード, 引くコード]。
// 「機械類」は一般機械＋電気機器（よく使われるまとめ方）。
// 1つの品目の中で半分以上をしめる細目があれば「（〇〇など）」をつける（SUBS）。
const ITEMS = [
  ["機械類", ["701", "703"]],
  ["輸送用機器", ["705"]],
  ["科学光学機器", ["81101"]],
  ["時計", ["81103"]],
  ["肉類", ["003"]],
  ["魚介類", ["007"]],
  ["酪農品", ["005"]],
  ["小麦", ["00901"]],
  ["とうもろこし", ["00907"]],
  ["果実", ["01101"]],
  ["野菜", ["01103"]],
  ["コーヒー", ["01501"]],
  ["アルコール飲料", ["10101"]],
  ["たばこ", ["103"]],
  ["大豆", ["20307"]],
  ["菜種", ["2030907"]],
  ["木材", ["20701"]],
  ["パルプ", ["20901"]],
  ["鉄鉱石", ["21501"]],
  ["銅鉱", ["2150501"]],
  ["石炭", ["30101"]],
  ["原油", ["30301"]],
  ["石油製品", ["30303"]],
  ["液化石油ガス", ["3050101"]],
  ["液化天然ガス", ["3050103"]],
  ["植物性油脂", ["403"]],
  ["有機化合物", ["50101"]],
  ["無機化合物", ["50103"]],
  ["医薬品", ["507"]],
  ["化粧品・香料", ["509"]],
  ["肥料", ["511"]],
  ["プラスチック", ["515"]],
  ["ゴム製品", ["603"]],
  ["木製品", ["605"]],
  ["紙類", ["607"]],
  ["織物・繊維製品", ["609"]],
  ["ダイヤモンド", ["61103"]],
  ["鉄鋼", ["613"]],
  ["銀・白金族", ["61501"]],
  ["銅", ["61503"]],
  ["ニッケル", ["61505"]],
  ["アルミニウム", ["61507"]],
  ["金属製品", ["617"]],
  ["家具", ["803"]],
  ["バッグ類", ["805"]],
  ["衣類", ["807"]],
  ["はき物", ["809"]],
  ["プラスチック製品", ["81307"]],
  ["がん具", ["81309"]],
  ["美術品・こっとう", ["81315"]],
  ["金", ["903"]],
];
const SUBS = {
  輸送用機器: { 70501: "自動車", 70503: "自動車の部品", 70505: "航空機", 70507: "船舶" },
  肉類: { "00301": "牛肉", "00305": "豚肉", "00307": "鶏肉" },
  魚介類: { "0070103": "さけ・ます", "0070101": "まぐろ", "00701131": "えび", "00701133": "かに", "00703": "調製品" },
  果実: { "0110103": "バナナ", "0110101": "かんきつ類", "0110108": "ぶどう" },
  アルコール飲料: { 10101011: "ウイスキー", 1010103: "ワイン" },
  たばこ: { 10303: "紙巻たばこなど", 10301: "葉たばこ" },
};

const full = (code) => String(code).padEnd(8, "0");
const codeOf = (name) => full(name.split("_")[0]);

console.log(`e-Stat ${TABLE} ${YEAR}年 を取得中 …`);
const { rows } = await data(TABLE, { cdTime: `${YEAR}000000`, cdCat02: "120", cdArea: Object.keys(COUNTRIES).join(",") });
const byArea = {};
for (const r of rows) {
  const area = Object.keys(COUNTRIES).find((c) => r.area.startsWith(`${c.slice(2)}_`));
  if (!area) continue;
  (byArea[area] ??= {})[codeOf(r.cat01)] = Number(r.value) || 0;
}

const cards = [];
for (const [area, name] of Object.entries(COUNTRIES)) {
  const v = byArea[area];
  if (!v) throw new Error(`${name} のデータがありません`);
  const get = (c) => v[full(c)] ?? 0;
  // 総額 = 大分類（0〜9）の合計
  const total = [..."0123456789"].reduce((s, d) => s + get(d), 0);
  const items = ITEMS.map(([label, add, sub = []]) => {
    const value = add.reduce((s, c) => s + get(c), 0) - sub.reduce((s, c) => s + get(c), 0);
    const top = Object.entries(SUBS[label] ?? {})
      .map(([c, n]) => [n, get(c)])
      .sort((a, b) => b[1] - a[1])[0];
    return { label: top && top[1] >= value / 2 ? `${label}（${top[0]}など）` : label, value };
  }).sort((a, b) => b.value - a.value);
  cards.push({
    title: name,
    total: Math.round(total / 1e5), // 千円 → 億円
    rows: items.slice(0, TOP).map((i) => ({ label: i.label, value: `${((i.value / total) * 100).toFixed(1)}%` })),
  });
}
cards.sort((a, b) => b.total - a.total);

const sheet = {
  id: "imports-by-country",
  title: "主な貿易相手国からの輸入品",
  category: "geography",
  unit: "交通・貿易",
  kind: "cards",
  modes: [
    { id: "label", label: "品目をかくす", hide: ["label"] },
    { id: "title", label: "国名をかくす", hide: ["title"] },
  ],
  columns: ["順位", "品目", "割合"],
  cards: cards.map(({ title, total, rows }) => ({ title, sub: `輸入額 ${total.toLocaleString("ja-JP")}億円`, rows })),
  note: `${YEAR}年。割合は、その国からの輸入額全体に占める割合。日本からの輸入額が多い順にならべている。「機械類」は一般機械と電気機器（コンピューター・半導体など）。「その他の〜」の品目は順位に入れていない。`,
  source: `財務省「貿易統計」（e-Stat 普通貿易統計 概況品別国別表 ${YEAR}年）`,
  sourceNote: `npm run trade で作る（scripts/update-trade.mjs）。表ID ${TABLE}。`,
};
writeFileSync(OUT, JSON.stringify(sheet, null, 2) + "\n");
for (const c of cards) console.log(`${c.title}: ${c.rows.map((r) => `${r.label} ${r.value}`).join(" / ")}`);
console.log(`→ ${OUT}`);
