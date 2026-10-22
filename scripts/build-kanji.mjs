// 漢字ドリル：content/kanji/words.csv を検証して data/kanji.generated.json を作る。
// `npm run questions` で、問題データ（data/questions.generated.json）を作ったあとに走る。
// 問題の答え（別解もふくむ）に語句が入っていれば、その問題とつなぐ（解説に注意を出す・テーマ「漢字」に入れる）。
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "content", "kanji", "words.csv");
const QUESTIONS = JSON.parse(readFileSync(join(ROOT, "data", "questions.generated.json"), "utf8"));
const OUT = join(ROOT, "data", "kanji.generated.json");

const FIELDS = { 歴史: "history", 地理: "geography", 公民: "civics" };
// 「どっち？」で並べる選択肢の数の上限（正しい書き方＋まちがった書き方）
const MAX_OPTIONS = 4;

const errors = [];
const warnings = [];
const list = (s) => s.split(/[|｜]/).map((x) => x.trim()).filter(Boolean);
const chars = (s) => [...s];

const text = readFileSync(FILE, "utf8");
if (text.includes("�")) {
  console.error("content/kanji/words.csv: 文字化けしています。Excel では「CSV UTF-8（コンマ区切り）」で保存してください");
  process.exit(1);
}
const [head, ...rows] = parse(text, { bom: true, relax_column_count: true, skip_empty_lines: true, info: true });
const header = head.record.map((h) => h.trim());
const words = [];
const seenId = new Set();
const seenWord = new Map();

for (const { record, info } of rows) {
  const r = Object.fromEntries(header.map((h, i) => [h, (record[i] ?? "").trim()]));
  if (!Object.values(r).some(Boolean)) continue;
  const at = `words.csv ${info.lines}行目（${r["語句"] || r.id}）`;
  const err = (m) => errors.push(`${at}: ${m}`);

  if (!/^k\d{4}$/.test(r.id)) err("id は k0001 の形");
  if (seenId.has(r.id)) err(`id ${r.id} が重複`);
  seenId.add(r.id);

  const word = r["語句"];
  if (!word) err("語句が空");
  if (seenWord.has(word)) err(`語句「${word}」は ${seenWord.get(word)} と重複`);
  seenWord.set(word, r.id);

  const reading = r["読み"];
  if (!/^[ぁ-ゖァ-ヺー・]+$/.test(reading)) err("読みは ひらがな（カタカナ・「・」も可）で書く");

  const field = FIELDS[r["分野"]];
  if (!field) err(`分野は ${Object.keys(FIELDS).join(" / ")} のどれか`);

  const hint = r["ヒント"];
  if (!hint) err("ヒントが空（読みだけでは同じ読みの語句と区別できないため）");
  if (word && hint.includes(word)) err("ヒントに答えの語句が入っている");

  const watch = chars(r["注意字"]);
  if (watch.length === 0) err("注意字が空");
  for (const c of watch) if (!chars(word).includes(c)) err(`注意字「${c}」が語句にない`);

  const wrong = list(r["誤字"]);
  for (const w of wrong) {
    if (w === word) err(`誤字「${w}」が語句と同じ`);
    else if (chars(w).length !== chars(word).length) err(`誤字「${w}」は語句と同じ字数にする（1字を別の字に変えた形）`);
    else {
      const diff = chars(word).filter((c, i) => c !== chars(w)[i]);
      const outside = diff.filter((c) => !watch.includes(c));
      if (outside.length) warnings.push(`${at}: 誤字「${w}」で変えた字「${outside.join("")}」が注意字にない`);
    }
  }
  if (new Set(wrong).size !== wrong.length) err("誤字が重複");
  if (wrong.length > MAX_OPTIONS - 1) warnings.push(`${at}: 誤字が ${wrong.length} 個。「どっち？」では ${MAX_OPTIONS - 1} 個までしか出さない`);

  const note = r["注意"];
  if (!note) err("注意が空");

  words.push({
    id: r.id,
    word,
    reading,
    field,
    hint,
    chars: [...new Set(watch)].join(""),
    wrong,
    note,
    ...(r["出典メモ"] && { source: r["出典メモ"] }),
    checked: r["確認"] === "済",
  });
}

// ほかの語句をふくむ語句（「古墳」と「前方後円墳」はふくまないが、たとえば「紀伊」と「紀伊半島」のような組）は、
// 長いほうだけをつなぐ（同じ注意が2回出ないように）
// 理由などを文で答える問題（「〜から」「〜が増えている」）はつながない
const isSentence = (a) => /[、。]/.test(a) || (chars(a).length > 8 && /[ぁ-ゖ]$/.test(a));
const links = {};
const linkedCount = new Map(words.map((w) => [w.id, 0]));
for (const q of QUESTIONS) {
  const answers = [q.answer, ...q.altAnswers].filter((a) => !isSentence(a));
  // 1字の語句は、答えがその1字のときだけ
  const hits = words.filter((w) => answers.some((a) => (chars(w.word).length === 1 ? a === w.word : a.includes(w.word))));
  const kept = hits.filter((w) => !hits.some((o) => o !== w && o.word.includes(w.word)));
  if (kept.length) {
    links[q.id] = kept.map((w) => w.id);
    for (const w of kept) linkedCount.set(w.id, linkedCount.get(w.id) + 1);
  }
}

if (errors.length) {
  console.error(`content/kanji/words.csv にまちがいがあります：\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
for (const w of warnings) console.warn(`注意: ${w}`);

writeFileSync(OUT, JSON.stringify({ words, links }));
const unlinked = words.filter((w) => linkedCount.get(w.id) === 0).length;
console.log(
  `漢字ドリル：${words.length}語（どっち？で出せるもの ${words.filter((w) => w.wrong.length).length}語）・問題とつないだもの ${Object.keys(links).length}問` +
    (unlinked ? `（答えに出てこない語句 ${unlinked}語。ドリルだけで出す）` : ""),
);
