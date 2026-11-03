// 正誤ドリル：content/seigo/statements.csv を検証して data/seigo.generated.json を作る。
// `npm run questions` で、問題データ（data/questions.generated.json）を作ったあとに走る。
// 文の書き方：{語句} = タップできる語句、{正しい語句→誤りの語句} = 誤りの形で入れかわる語句（1文に1つだけ）
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "content", "seigo", "statements.csv");
const QUESTIONS = JSON.parse(readFileSync(join(ROOT, "data", "questions.generated.json"), "utf8"));
const UNITS = JSON.parse(readFileSync(join(ROOT, "content", "units.json"), "utf8"));
const OUT = join(ROOT, "data", "seigo.generated.json");

const FIELDS = { 歴史: "history", 地理: "geography", 公民: "civics", 時事: "current" };
const TRAPS = ["人物", "時期", "場所", "言い過ぎ", "用語", "数字", "因果"];
// 誤りの語句をさがすとき、ほかにタップできる語句がこれより少ないと当てずっぽうで当たりやすい
const MIN_DECOYS = 2;

const errors = [];
const warnings = [];
const QUESTION_IDS = new Set(QUESTIONS.map((q) => q.id));

const text = readFileSync(FILE, "utf8");
if (text.includes("�")) {
  console.error("content/seigo/statements.csv: 文字化けしています。Excel では「CSV UTF-8（コンマ区切り）」で保存してください");
  process.exit(1);
}
const [head, ...rows] = parse(text, { bom: true, relax_column_count: true, skip_empty_lines: true, info: true });
const header = head.record.map((h) => h.trim());
const statements = [];
const seenId = new Set();
const seenText = new Map();

/** 「{…}」で区切って、文のかけらにする */
function toParts(s, err) {
  const parts = [];
  let rest = s;
  while (rest) {
    const open = rest.indexOf("{");
    if (open < 0) {
      if (rest.includes("}")) err("「}」に対応する「{」がない");
      parts.push({ text: rest });
      break;
    }
    if (open > 0) parts.push({ text: rest.slice(0, open) });
    const close = rest.indexOf("}", open);
    if (close < 0) {
      err("「{」が閉じていない");
      break;
    }
    const inner = rest.slice(open + 1, close).trim();
    if (!inner) err("{ } の中が空");
    if (inner.includes("{")) err("{ } が入れ子になっている");
    if (inner.includes("→")) {
      const [right, wrong, ...more] = inner.split("→").map((x) => x.trim());
      if (more.length || !right || !wrong) err(`{${inner}} は {正しい語句→誤りの語句} の形で書く`);
      else if (right === wrong) err(`{${inner}} の前後が同じ`);
      else parts.push({ right, wrong });
    } else parts.push({ chunk: inner });
    rest = rest.slice(close + 1);
  }
  return parts;
}

for (const { record, info } of rows) {
  const r = Object.fromEntries(header.map((h, i) => [h, (record[i] ?? "").trim()]));
  if (!Object.values(r).some(Boolean)) continue;
  const at = `statements.csv ${info.lines}行目（${r.id}）`;
  const err = (m) => errors.push(`${at}: ${m}`);

  if (!/^s\d{4}$/.test(r.id)) err("id は s0001 の形");
  if (seenId.has(r.id)) err(`id ${r.id} が重複`);
  seenId.add(r.id);

  const field = FIELDS[r["分野"]];
  if (!field) err(`分野は ${Object.keys(FIELDS).join(" / ")} のどれか`);
  const unit = r["単元"];
  if (field && !UNITS[field]?.includes(unit)) err(`単元「${unit}」は content/units.json の ${r["分野"]} にない`);

  const parts = toParts(r["文"], err);
  const swaps = parts.filter((p) => "right" in p);
  if (swaps.length !== 1) err(`{正しい語句→誤りの語句} は1文に1つだけ（いま ${swaps.length} 個）`);
  const decoys = parts.filter((p) => "chunk" in p).length;
  if (decoys < MIN_DECOYS) warnings.push(`${at}: タップできるほかの語句 {…} が ${decoys} 個。${MIN_DECOYS} 個以上にすると当てずっぽうで当たりにくい`);
  const plain = parts.map((p) => ("text" in p ? p.text : "chunk" in p ? p.chunk : p.right)).join("");
  if (!/[。]$/.test(plain)) err("文は「。」で終える");
  if (seenText.has(plain)) err(`同じ文が ${seenText.get(plain)} にある`);
  seenText.set(plain, r.id);

  const trap = r["ひっかけ"];
  if (!TRAPS.includes(trap)) err(`ひっかけは ${TRAPS.join(" / ")} のどれか`);

  const note = r["解説"];
  if (!note) err("解説が空");

  const related = r["関連"].split(/[|｜]/).map((x) => x.trim()).filter(Boolean);
  for (const id of related) if (!QUESTION_IDS.has(id)) err(`関連の ${id} という問題がない`);

  statements.push({
    id: r.id,
    field,
    unit,
    parts,
    trap,
    note,
    related,
    ...(r["出典メモ"] && { source: r["出典メモ"] }),
    checked: r["確認"] === "済",
  });
}

if (errors.length) {
  console.error(`content/seigo/statements.csv にまちがいがあります：\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
for (const w of warnings) console.warn(`注意: ${w}`);

writeFileSync(OUT, JSON.stringify(statements));
const count = (f) => statements.filter((s) => s.field === f).length;
console.log(
  `正誤ドリル：${statements.length}文（歴史 ${count("history")} / 地理 ${count("geography")} / 公民 ${count("civics")} / 時事 ${count("current")}）`,
);
