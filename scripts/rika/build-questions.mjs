// 理科：content/rika/questions/*.csv を検証して data/rika/questions.generated.json を作る。
// 社会（scripts/build-questions.mjs）とは別。`npm run questions` で両方走る。
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT = join(ROOT, "content", "rika");
const DIR = join(CONTENT, "questions");
const OUT_DIR = join(ROOT, "data", "rika");
const OUT = join(OUT_DIR, "questions.generated.json");
const UNITS = JSON.parse(readFileSync(join(CONTENT, "units.json"), "utf8"));

// 分野と id の頭文字（biology.csv → b0001）
const FILES = { biology: "b", earth: "e", chemistry: "c" };
const HEADER = ["id", "単元", "分類", "難易度", "学年", "問題", "答え", "別解", "誤答選択肢", "解説", "漢字注意", "タグ", "画像", "出典メモ", "確認"];
const DIFFICULTY = { 基本: "basic", 標準: "standard", 発展: "advanced", 最難関: "top" };
const NEEDS_CHOICES = /どれ(か|で|が)/;
const list = (s) => s.split(/[|｜]/).map((x) => x.trim()).filter(Boolean);

const errors = [];
const warnings = [];

// ダッシュボードの小見出し（content/rika/unit-groups.json）：units.json の単元を、どれか1つにちょうど1回ずつ入れる
{
  const groups = JSON.parse(readFileSync(join(CONTENT, "unit-groups.json"), "utf8"));
  for (const [category, units] of Object.entries(UNITS)) {
    if (!(category in FILES)) errors.push(`content/rika/units.json: 分野「${category}」は ${Object.keys(FILES).join(" / ")} のどれか`);
    const grouped = (groups[category] ?? []).flatMap((g) => g.units);
    for (const u of units) if (grouped.filter((x) => x === u).length !== 1) errors.push(`content/rika/unit-groups.json: 「${u}」が ${category} のまとまりにちょうど1回入っていません`);
    for (const u of grouped) if (!units.includes(u)) errors.push(`content/rika/unit-groups.json: 「${u}」は units.json の ${category} にありません`);
  }
}

const questions = [];
const ids = new Set();

for (const name of readdirSync(DIR).filter((f) => f.endsWith(".csv")).sort()) {
  const category = name.replace(/\.csv$/, "");
  if (!(category in FILES)) {
    errors.push(`${name}: ファイル名は ${Object.keys(FILES).map((f) => f + ".csv").join(" / ")} のどれか`);
    continue;
  }
  const text = readFileSync(join(DIR, name), "utf8");
  if (text.includes("�")) {
    errors.push(`${name}: 文字化けしています。Excel では「CSV UTF-8（コンマ区切り）」で保存してください`);
    continue;
  }
  const [head, ...rows] = parse(text, { bom: true, relax_column_count: true, skip_empty_lines: true, info: true });
  const header = head.record.map((h) => h.trim());
  const missing = HEADER.filter((h) => !header.includes(h));
  if (missing.length) {
    errors.push(`${name}: 列が足りません → ${missing.join(", ")}`);
    continue;
  }

  for (const { record, info } of rows) {
    const r = Object.fromEntries(header.map((h, i) => [h, (record[i] ?? "").trim()]));
    if (Object.values(r).every((v) => v === "")) continue;
    const err = (msg) => errors.push(`${name}:${info.lines} [${r.id || "id なし"}] ${msg}`);

    if (!new RegExp(`^${FILES[category]}\\d{4}$`).test(r.id)) err(`id は「${FILES[category]}0001」の形式`);
    if (ids.has(r.id)) err("id が重複しています");
    ids.add(r.id);
    if (!UNITS[category]?.includes(r.単元)) err(`単元「${r.単元}」は content/rika/units.json の ${category} にありません`);
    if (!(r.難易度 in DIFFICULTY)) err(`難易度は ${Object.keys(DIFFICULTY).join(" / ")} のどれか`);
    if (r.学年 && !["4", "5", "6"].includes(r.学年)) err("学年は 4 / 5 / 6 か空欄");
    if (!r.問題) err("問題が空です");
    if (!r.答え) err("答えが空です");
    if (!r.解説) err("解説が空です");
    // 画像は理科用の取得のしくみを作ってから（今は使えない）
    if (r.画像) err("理科の問題の画像はまだ使えません");
    const choices = list(r.誤答選択肢);
    if (choices.length < 3) err("誤答選択肢は | で区切って3つ以上");
    if (choices.includes(r.答え)) err("誤答選択肢に答えが入っています");
    const choiceOnly = r.出題形式 === "4択のみ";
    if (r.出題形式 && !choiceOnly) err("出題形式は「4択のみ」か空欄");
    if (!choiceOnly && NEEDS_CHOICES.test(r.問題)) warnings.push(`${name}:${info.lines} [${r.id}] 選択肢がないと答えられない問題は、出題形式を「4択のみ」にする`);

    questions.push({
      id: r.id,
      category,
      unit: r.単元,
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
      ...(choiceOnly && { choiceOnly }),
      ...(r.出典メモ && { source: r.出典メモ }),
      checked: r.確認 === "済",
    });
  }
}

if (warnings.length) {
  console.warn(`\n理科：注意が ${warnings.length} 件あります:\n`);
  for (const w of warnings) console.warn("  - " + w);
}
if (errors.length) {
  console.error(`\n理科の問題データにエラーが ${errors.length} 件あります:\n`);
  for (const e of errors) console.error("  - " + e);
  console.error("");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, JSON.stringify(questions, null, 1) + "\n");
const count = (c) => questions.filter((q) => q.category === c).length;
console.log(`理科の問題データ OK: ${questions.length}問（生物 ${count("biology")} / 地学 ${count("earth")} / 化学 ${count("chemistry")}）`);
