// 白地図ドリル：content/maps/places.csv（地名）と sets.csv（地図セット）を検証して
// data/mapsets.generated.json を作る。`npm run questions` で問題データといっしょに走る。
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MAPS = join(ROOT, "content", "maps");
const OUT = join(ROOT, "data", "mapsets.generated.json");
const EXTENTS = JSON.parse(readFileSync(join(MAPS, "extents.json"), "utf8"));

const KINDS = ["山地・山脈", "火山"];
// 1つのセットの印の数
const MIN_MARKS = 4;
const MAX_MARKS = 10;
// 印どうしがこれより近いと見分けにくい（地図の横はば 800 のときの長さ）
const MIN_GAP = 24;
// 場所をタップ（locate）の許すはば。lib/mapSets.ts と同じ値にする
const LOCATE_MIN_UNITS = 36;
const LOCATE_LINE_FACTOR = 0.7;
// 場所をタップで、陸地をでたらめにタップして正解になる割合の上限（長い山脈はどうしても高くなる）
const MAX_GUESS = 0.16;
const JAPAN_MAP = JSON.parse(readFileSync(join(MAPS, "japan.json"), "utf8"));

const errors = [];
const warnings = [];
const list = (s) => s.split(/[|｜]/).map((x) => x.trim()).filter(Boolean);
const read = (file) => {
  const text = readFileSync(join(MAPS, file), "utf8");
  if (text.includes("�")) {
    errors.push(`${file}: 文字化けしています。Excel では「CSV UTF-8（コンマ区切り）」で保存してください`);
    return [];
  }
  const [head, ...rows] = parse(text, { bom: true, relax_column_count: true, skip_empty_lines: true, info: true });
  const header = head.record.map((h) => h.trim());
  return rows
    .map(({ record, info }) => ({ line: info.lines, r: Object.fromEntries(header.map((h, i) => [h, (record[i] ?? "").trim()])) }))
    .filter(({ r }) => Object.values(r).some(Boolean));
};

// ───── 地名 ─────
const places = [];
const byName = new Map();
for (const { line, r } of read("places.csv")) {
  const err = (msg) => errors.push(`places.csv:${line} [${r.id || "id なし"}] ${msg}`);
  if (!/^p\d{4}$/.test(r.id)) err("id は「p0001」の形式");
  else if (places.some((p) => p.id === r.id)) err("id が重複");
  if (!r.名前) err("名前が空です");
  else if (byName.has(r.名前)) err(`名前「${r.名前}」が重複`);
  if (!KINDS.includes(r.種類)) err(`種類は ${KINDS.join(" / ")} のどれか`);
  if (!r.解説) err("解説が空です");
  // 座標：「北緯,東経」。線（山脈・川）は「;」で区切って2点以上
  const coords = r.座標.split(";").map((s) => s.trim().match(/^(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)$/));
  if (coords.some((m) => !m)) {
    err("座標は「北緯,東経」、線は「北緯,東経;北緯,東経;…」");
    continue;
  }
  const place = {
    id: r.id,
    name: r.名前,
    ...(r.読み && { reading: r.読み }),
    kind: r.種類,
    coords: coords.map((m) => ({ lat: Number(m[1]), lng: Number(m[2]) })),
    explanation: r.解説,
    ...(r.漢字注意 && { kanjiNote: r.漢字注意 }),
    ...(r.出典メモ && { source: r.出典メモ }),
    checked: r.確認 === "済",
  };
  if (place.coords.some(({ lat, lng }) => lat < 20 || lat > 46 || lng < 122 || lng > 154)) err("座標が日本の外です（北緯,東経 の順）");
  places.push(place);
  byName.set(place.name, place);
}

// ───── 地図の上の長さ（components/mapBase.tsx と同じ図法・横はば 800）─────
function projector(E) {
  const k = Math.cos((((E.south + E.north) / 2) * Math.PI) / 180);
  const scale = 800 / ((E.east - E.west) * k);
  return ({ lat, lng }) => [(lng - E.west) * k * scale, (E.north - lat) * scale];
}
const segDist = ([px, py], [ax, ay], [bx, by]) => {
  const dx = bx - ax;
  const dy = by - ay;
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
};
// 線の上に細かく点を置いて、2つの印のいちばん近いところをはかる
const samples = (pts) => {
  if (pts.length === 1) return pts;
  const out = [];
  for (let i = 0; i + 1 < pts.length; i++)
    for (let t = 0; t < 1; t += 0.05) out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]);
  out.push(pts.at(-1));
  return out;
};
const distTo = (p, pts) => (pts.length === 1 ? Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]) : Math.min(...pts.slice(1).map((b, i) => segDist(p, pts[i], b))));
const gap = (a, b) => Math.min(...samples(a).map((p) => distTo(p, b)), ...samples(b).map((p) => distTo(p, a)));

// 地図の範囲の中の陸地に細かく点を置く（勘で当たる確率を数えるため）
const LAND = new Map();
function landPoints(E) {
  if (LAND.has(E)) return LAND.get(E);
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
  const step = Math.min(E.east - E.west, E.north - E.south) / 150;
  const points = [];
  for (let lat = E.south; lat <= E.north; lat += step)
    for (let lng = E.west; lng <= E.east; lng += step)
      if (boxes.some(([r, x0, x1, y0, y1]) => lng >= x0 && lng <= x1 && lat >= y0 && lat <= y1 && inside(r, lng, lat))) points.push([lat, lng]);
  LAND.set(E, points);
  return points;
}

// ───── 地図セット ─────
const sets = [];
const used = new Set();
for (const { line, r } of read("sets.csv")) {
  const err = (msg) => errors.push(`sets.csv:${line} [${r.id || "id なし"}] ${msg}`);
  if (!/^m\d{2,}$/.test(r.id)) err("id は「m01」の形式");
  else if (sets.some((s) => s.id === r.id)) err("id が重複");
  if (!r.名前) err("名前が空です");
  const E = EXTENTS[r.地図];
  if (!E) {
    err(`地図「${r.地図}」は content/maps/extents.json にありません（${Object.keys(EXTENTS).join(" / ")}）`);
    continue;
  }
  const names = list(r.地名);
  const missing = names.filter((n) => !byName.has(n));
  if (missing.length) err(`places.csv にない地名：${missing.join("、")}`);
  if (new Set(names).size !== names.length) err("地名が重複しています");
  if (names.length < MIN_MARKS || names.length > MAX_MARKS) err(`地名は ${MIN_MARKS}〜${MAX_MARKS} 個`);
  const members = names.filter((n) => byName.has(n)).map((n) => byName.get(n));
  const proj = projector(E);
  for (const p of members) {
    used.add(p.id);
    if (p.coords.some(({ lat, lng }) => lat < E.south || lat > E.north || lng < E.west || lng > E.east))
      err(`「${p.name}」が地図（${r.地図}）の範囲からはみ出しています`);
  }
  for (let i = 0; i < members.length; i++)
    for (let j = i + 1; j < members.length; j++) {
      const d = gap(members[i].coords.map(proj), members[j].coords.map(proj));
      if (d < MIN_GAP) warnings.push(`sets.csv:${line} [${r.id}] 「${members[i].name}」と「${members[j].name}」の印が近すぎて見分けにくい（${d.toFixed(0)}）。地方の地図にするか、どちらかを外してください`);
    }
  // 場所をタップ：陸地をでたらめにタップしたとき、それぞれの地名で正解になる割合
  if (members.length === names.length) {
    const scale = 800 / ((E.east - E.west) * Math.cos((((E.south + E.north) / 2) * Math.PI) / 180));
    const base = Math.max((E.tolKm / 111.2) * scale, LOCATE_MIN_UNITS);
    const marks = members.map((p) => ({ p, pts: p.coords.map(proj), tol: p.coords.length === 1 ? base : base * LOCATE_LINE_FACTOR }));
    const hits = marks.map(() => 0);
    const land = landPoints(E);
    for (const [lat, lng] of land) {
      const q = proj({ lat, lng });
      // 判定は lib/mapSets.ts の judgeLocate と同じ：いちばん近い地名の範囲に入っていれば、その地名の正解
      const d = marks.map((m) => distTo(q, m.pts));
      const n = d.indexOf(Math.min(...d));
      if (d[n] <= marks[n].tol) hits[n]++;
    }
    marks.forEach((m, i) => {
      const rate = hits[i] / land.length;
      if (rate > MAX_GUESS) warnings.push(`sets.csv:${line} [${r.id}] 場所をタップで「${m.p.name}」が勘で当たる確率 ${(rate * 100).toFixed(1)}% が高い（${MAX_GUESS * 100}%まで）`);
    });
  }
  sets.push({ id: r.id, title: r.名前, extent: r.地図, places: members.map((p) => p.id) });
}
for (const p of places) if (!used.has(p.id)) warnings.push(`places.csv [${p.id}] 「${p.name}」はどのセットにも入っていません`);

if (warnings.length) {
  console.warn(`\n白地図ドリルの注意が ${warnings.length} 件あります:\n`);
  for (const w of warnings) console.warn("  - " + w);
  console.warn("");
}
if (errors.length) {
  console.error(`\n白地図ドリルのデータにエラーが ${errors.length} 件あります:\n`);
  for (const e of errors) console.error("  - " + e);
  console.error("");
  process.exit(1);
}

writeFileSync(OUT, JSON.stringify({ places, sets }, null, 1) + "\n");
console.log(`白地図ドリル OK: ${sets.length}セット・地名 ${places.length}`);
