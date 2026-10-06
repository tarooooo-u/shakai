// content/questions/*.csv を検証して data/questions.generated.json を作る。
// npm run dev / npm run build の前に自動で走る。単体では `npm run questions`。
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "content", "questions");
const OUT = join(ROOT, "data", "questions.generated.json");
const IMAGES_OUT = join(ROOT, "data", "images.generated.json");
const UNITS = JSON.parse(readFileSync(join(ROOT, "content", "units.json"), "utf8"));

// 問題用の画像（content/images.csv：npm run images で Wikimedia Commons から取得）
const IMAGES = new Map();
{
  const [, ...rows] = parse(readFileSync(join(ROOT, "content", "images.csv"), "utf8"), { bom: true });
  for (const [name, src, kind, file, artist, license, url] of rows) {
    const who = artist.length > 40 ? artist.slice(0, 40) + "…" : artist;
    IMAGES.set(name, { src, kind, file, artist, license, url, credit: `${who}（${license}）` });
  }
}
const pic = (name) => {
  const i = IMAGES.get(name);
  return i && { src: i.src, credit: i.credit };
};

// 雨温図用の平年値（content/climate/normals.csv、1行目は出典のコメント）
const CLIMATE = new Map();
{
  const text = readFileSync(join(ROOT, "content", "climate", "normals.csv"), "utf8");
  const [, ...rows] = parse(text, { bom: true, relax_column_count: true, from_line: 2 });
  for (const r of rows) {
    const n = r.slice(4).map(Number);
    CLIMATE.set(r[0], { temp: n.slice(0, 12), tempYear: n[12], precip: n.slice(13, 25), precipYear: n[25] });
  }
}

// 地図問題（白地図をタップする問題）。判定は lib/mapTask.ts と同じ
const JAPAN_MAP = JSON.parse(readFileSync(join(ROOT, "content", "maps", "japan.json"), "utf8"));
// 地図の範囲（全国・近畿 など）。tol / tolKm は許すはばを書かなかったときの値
const EXTENTS = JSON.parse(readFileSync(join(ROOT, "content", "maps", "extents.json"), "utf8"));
// 勘で当たる確率の上限。地図の陸地をでたらめにタップしたとき、正解になる割合
const MAX_GUESS = 0.1;

function parseMapTask(s) {
  // 経線:135 / 緯線:40 / 交点:40,140（北緯,東経）。末尾に「:0.3」（度）や「:30km」で許すはばを変えられる。
  // 「@近畿」で地方の地図にする（書かなければ全国）
  const m = s.match(/^(経線|緯線|交点):\s*(-?\d+(?:\.\d+)?)(?:\s*,\s*(-?\d+(?:\.\d+)?))?(?::\s*(\d+(?:\.\d+)?)\s*(km)?)?(?:\s*@\s*(\S+))?$/);
  if (!m) return { error: "地図問題は「経線:135」「緯線:40」「交点:40,140」の形（許すはばは「経線:135:0.3」「交点:40,140:30km」、地方の地図は「緯線:35@近畿」）" };
  const [, kind, a, b, tol, km, extent = "全国"] = m;
  const E = EXTENTS[extent];
  if (!E) return { error: `地図の範囲「${extent}」は content/maps/extents.json にありません（${Object.keys(EXTENTS).join(" / ")}）` };
  if ((kind === "交点") !== (b !== undefined)) return { error: "交点は「交点:北緯,東経」、経線・緯線は数字1つ" };
  if (tol !== undefined && (kind === "交点") !== (km !== undefined)) return { error: "許すはばは、経線・緯線は度（:0.3）、交点は km（:30km）で書く" };
  const t = tol === undefined ? (kind === "交点" ? E.tolKm : E.tol) : Number(tol);
  if (kind === "経線") return { task: { extent, kind: "meridian", lng: Number(a), tol: t } };
  if (kind === "緯線") return { task: { extent, kind: "parallel", lat: Number(a), tol: t } };
  return { task: { extent, kind: "point", lat: Number(a), lng: Number(b), tolKm: t } };
}

function mapValue(task, lat, lng) {
  if (task.kind === "meridian") return Math.abs(lng - task.lng);
  if (task.kind === "parallel") return Math.abs(lat - task.lat);
  const r = Math.PI / 180;
  const h = Math.sin(((lat - task.lat) * r) / 2) ** 2 + Math.cos(lat * r) * Math.cos(task.lat * r) * Math.sin(((lng - task.lng) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
const mapTol = (task) => (task.kind === "point" ? task.tolKm : task.tol);

// 地図の範囲ごとに、日本の陸地の上に細かく点を置いておき、勘で当たる確率を数える
const LAND = new Map();
function landPoints(name) {
  if (LAND.has(name)) return LAND.get(name);
  const inside = (ring, x, y) => {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const boxes = JAPAN_MAP.japan.map((r) => [r, Math.min(...r.map((p) => p[0])), Math.max(...r.map((p) => p[0])), Math.min(...r.map((p) => p[1])), Math.max(...r.map((p) => p[1]))]);
  const E = EXTENTS[name];
  // 地図の短いほうの辺を300に分けた間かく
  const step = Math.min(E.east - E.west, E.north - E.south) / 300;
  const points = [];
  for (let lat = E.south; lat <= E.north; lat += step)
    for (let lng = E.west; lng <= E.east; lng += step)
      if (boxes.some(([r, x0, x1, y0, y1]) => lng >= x0 && lng <= x1 && lat >= y0 && lat <= y1 && inside(r, lng, lat)))
        // 高い緯度ほど同じ間かくの面積が小さいので重みをつける
        points.push([lat, lng, Math.cos((lat * Math.PI) / 180)]);
  LAND.set(name, points);
  return points;
}
function guessRate(task) {
  let hit = 0;
  let all = 0;
  for (const [lat, lng, w] of landPoints(task.extent)) {
    all += w;
    if (mapValue(task, lat, lng) <= mapTol(task)) hit += w;
  }
  return hit / all;
}
const guessReport = [];

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

    // 画像列が「climate:地点番号」なら雨温図を表示する
    let climate;
    if (r.画像.startsWith("climate:")) {
      climate = CLIMATE.get(r.画像.slice(8));
      if (!climate) err(`雨温図の地点番号「${r.画像.slice(8)}」が content/climate/normals.csv にありません`);
    }

    // 画像列：「img:名前」→ その画像を表示、「choices」→ 答えと誤答選択肢を画像で並べる
    let image;
    let imageChoices;
    if (r.画像.startsWith("img:")) {
      image = pic(r.画像.slice(4));
      if (!image) err(`画像「${r.画像.slice(4)}」が content/images.csv にありません`);
    } else if (r.画像 === "choices") {
      const names = [r.答え, ...list(r.誤答選択肢)];
      const missing = names.filter((n) => !IMAGES.has(n));
      if (names.length < 4) err("画像で選ぶ問題は誤答選択肢が3つ以上必要です");
      if (missing.length) err(`画像がない選択肢：${missing.join("、")}`);
      else imageChoices = Object.fromEntries(names.map((n) => [n, pic(n)]));
    }

    let map;
    if (r.地図) {
      const m = r.地図.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
      if (!m) err("地図は「緯度,経度」（例: 35.6812,139.7671）");
      else map = { lat: Number(m[1]), lng: Number(m[2]) };
    }

    // 地図問題列（任意の列）：白地図をタップして答える
    let mapTask;
    if (r.地図問題) {
      const { task, error } = parseMapTask(r.地図問題);
      if (error) err(error);
      else {
        const E = EXTENTS[task.extent];
        const lat = task.lat ?? (E.south + E.north) / 2;
        const lng = task.lng ?? (E.west + E.east) / 2;
        const rate = guessRate(task);
        if (lat < E.south || lat > E.north || lng < E.west || lng > E.east) err("地図問題の場所が地図の範囲の外です");
        else if (rate > MAX_GUESS) err(`地図問題が勘で当たる確率 ${(rate * 100).toFixed(1)}% が高すぎます（${MAX_GUESS * 100}%まで）。許すはばをせまくしてください`);
        else {
          mapTask = task;
          guessReport.push(`${r.id} ${r.地図問題}：${(rate * 100).toFixed(1)}%`);
        }
      }
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
      ...(r.画像 && !climate && !image && !imageChoices && { imageUrl: r.画像 }),
      ...(image && { imageUrl: image.src, imageCredit: image.credit }),
      ...(imageChoices && { imageChoices }),
      ...(climate && { climate }),
      ...(map && { map }),
      ...(mapTask && { mapTask }),
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
writeFileSync(IMAGES_OUT, JSON.stringify([...IMAGES.entries()].map(([name, i]) => ({ name, ...i })), null, 1) + "\n");
const count = (c) => questions.filter((q) => q.category === c).length;
if (guessReport.length) console.log(`地図問題 ${guessReport.length}問（勘で当たる確率）\n  ${guessReport.join("\n  ")}`);
console.log(
  `問題データ OK: ${questions.length}問（歴史 ${count("history")} / 地理 ${count("geography")} / 公民 ${count("civics")}）`,
);
