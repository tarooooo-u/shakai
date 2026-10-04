// content/questions/*.csv を検証して data/questions.generated.json を作る。
// npm run dev / npm run build の前に自動で走る。単体では `npm run questions`。
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "content", "questions");
const OUT = join(ROOT, "data", "questions.generated.json");
const UNITS = JSON.parse(readFileSync(join(ROOT, "content", "units.json"), "utf8"));

const HEADER = ["id", "単元", "都道府県", "分類", "難易度", "学年", "問題", "答え", "別解", "誤答選択肢", "解説", "漢字注意", "タグ", "画像", "地図", "出典メモ", "確認"];
const FILES = { history: "h", geography: "g", civics: "c" };
const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県", "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県",
  "東京都", "神奈川県", "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県",
  "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];
const DIFFICULTY = { 基本: "basic", 標準: "standard", 発展: "advanced", 最難関: "top" };
const list = (s) => s.split(/[|｜]/).map((x) => x.trim()).filter(Boolean);

const errors = [];
const questions = [];
const ids = new Map();

for (const name of readdirSync(DIR).filter((f) => f.endsWith(".csv")).sort()) {
  const category = name.replace(/\.csv$/, "");
  const where = (line) => `${name}:${line}`;
  if (!(category in FILES)) {
    errors.push(`${name}: ファイル名は ${Object.keys(FILES).map((f) => f + ".csv").join(" / ")} のどれか`);
    continue;
  }
  const text = readFileSync(join(DIR, name), "utf8");
  if (text.includes("�")) {
    errors.push(`${name}: 文字化けしています。Excel では「CSV UTF-8（コンマ区切り）」で保存してください`);
    continue;
  }
  const records = parse(text, { bom: true, relax_column_count: true, skip_empty_lines: true, info: true });
  const [head, ...rows] = records;
  const header = head.record.map((h) => h.trim());
  const missing = HEADER.filter((h) => !header.includes(h));
  if (missing.length) {
    errors.push(`${name}: 列が足りません → ${missing.join(", ")}`);
    continue;
  }

  for (const { record, info } of rows) {
    const line = info.lines;
    const r = Object.fromEntries(header.map((h, i) => [h, (record[i] ?? "").trim()]));
    if (Object.values(r).every((v) => v === "")) continue;
    const err = (msg) => errors.push(`${where(line)} [${r.id || "id なし"}] ${msg}`);

    if (!new RegExp(`^${FILES[category]}\\d{4}$`).test(r.id)) err(`id は「${FILES[category]}0001」の形式`);
    else if (ids.has(r.id)) err(`id が重複（${ids.get(r.id)} と同じ）`);
    else ids.set(r.id, where(line));

    if (!UNITS[category].includes(r.単元)) err(`単元「${r.単元}」は content/units.json にありません`);
    if (r.都道府県 && !PREFECTURES.includes(r.都道府県)) err(`都道府県「${r.都道府県}」は正式名で（例: 東京都・京都府・北海道）`);
    if (!(r.難易度 in DIFFICULTY)) err(`難易度は ${Object.keys(DIFFICULTY).join(" / ")} のどれか`);
    if (r.学年 && !["4", "5", "6"].includes(r.学年)) err("学年は 4 / 5 / 6 か空欄");
    for (const k of ["問題", "答え", "解説"]) if (!r[k]) err(`${k}が空です`);

    const choices = list(r.誤答選択肢);
    if (choices.length > 0 && choices.length < 3) err("誤答選択肢は 3つ以上（| 区切り）か空欄");
    if (choices.includes(r.答え)) err("誤答選択肢に正解が入っています");
    if (new Set(choices).size !== choices.length) err("誤答選択肢が重複しています");

    let map;
    if (r.地図) {
      const m = r.地図.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
      if (!m) err("地図は「緯度,経度」（例: 35.6812,139.7671）");
      else map = { lat: Number(m[1]), lng: Number(m[2]) };
    }

    questions.push({
      id: r.id,
      category,
      unit: r.単元,
      ...(r.都道府県 && { prefecture: r.都道府県 }),
      ...(r.分類 && { kind: r.分類 }),
      difficulty: DIFFICULTY[r.難易度],
      ...(r.学年 && { grade: Number(r.学年) }),
      question: r.問題,
      answer: r.答え,
      altAnswers: list(r.別解),
      choices,
      explanation: r.解説,
      ...(r.漢字注意 && { kanjiNote: r.漢字注意 }),
      tags: list(r.タグ),
      ...(r.画像 && { imageUrl: r.画像 }),
      ...(map && { map }),
      ...(r.出典メモ && { source: r.出典メモ }),
      checked: r.確認 === "済",
    });
  }
}

if (errors.length) {
  console.error(`\n問題データにエラーが ${errors.length} 件あります:\n`);
  for (const e of errors) console.error("  - " + e);
  console.error("");
  process.exit(1);
}

writeFileSync(OUT, JSON.stringify(questions, null, 1) + "\n");
const count = (c) => questions.filter((q) => q.category === c).length;
console.log(
  `問題データ OK: ${questions.length}問（歴史 ${count("history")} / 地理 ${count("geography")} / 公民 ${count("civics")}）`,
);
