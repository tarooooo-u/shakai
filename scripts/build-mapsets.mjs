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

const KINDS = ["山地・山脈", "火山", "山", "岬", "河川", "平野", "台地", "干拓地", "盆地", "湖", "半島", "島", "港"];
// 1点で描く種類（火山・山は▲、岬は●、港は■）
const POINT_KINDS = ["火山", "山", "岬", "港"];
// 点で囲んだ面として描く種類
const AREA_KINDS = ["平野", "台地", "干拓地", "盆地", "湖", "半島", "島"];
// 種類のまとまり（アプリの「しぼる」）。lib/mapSets.ts の KIND_GROUPS と同じにする。
// 地図は全国＋7地方で、種類でしぼって出すので、見分けやすさ・勘で当たる確率は同じまとまりの中だけで調べる
const KIND_GROUPS = { 山地・山脈: "山・火山", 火山: "山・火山", 山: "山・火山", 河川: "川・湖", 湖: "川・湖", 平野: "平野・盆地", 台地: "平野・盆地", 干拓地: "平野・盆地", 盆地: "平野・盆地", 半島: "半島・島・岬", 島: "半島・島・岬", 岬: "半島・島・岬", 港: "港" };
// 印の形：点（▲●■）・線・面。場所をタップでは、同じまとまりで同じ形の地名どうしだけをくらべる（lib/mapSets.ts の shapeOf）
const shapeOf = (p) => (p.area ? "area" : p.coords.length === 1 ? "point" : "line");
// 点どうしは、まとまりがちがっても、これより近いと印がかさなる
const MIN_POINT_GAP = 12;
// 全国の地図はまとめずに種類ごとに出す（lib/mapSets.ts の byKindOnly）
const BY_KIND_ONLY = ["全国"];
// 1つの地図で、いっしょに出す印の数の上限
const MAX_GROUP_MARKS = 16;
// 印どうしがこれより近いと見分けにくい（地図の横はば 800 のときの長さ）
const MIN_GAP = 24;
// 線（山脈・川）どうしは、はしが近いだけならよい（支流の合流・河口や水源が近い川。木曽三川のように下流がならんで流れる川）。
// 短いほうの線のこの割合以上が MIN_GAP より近いときだけ注意する
const MAX_LINE_OVERLAP = 0.5;
// 面（平野・盆地・湖）どうしは形で見分けられるので、ほぼくっついているときだけ注意する
const MIN_AREA_GAP = 8;
// 場所をタップ（locate）の許すはば。lib/mapSets.ts と同じ値にする
const LOCATE_MIN_UNITS = 36;
const LOCATE_LINE_FACTOR = 0.7;
const LOCATE_AREA_FACTOR = 0.5;
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
  // 座標：「北緯,東経」。線（山脈・川）は「;」で区切って2点以上、面（平野など）はまわりを3点以上。
  // 面がいくつかに分かれているとき（対馬・隠岐など）は、輪郭ごとに「/」で区切る
  const parsed = r.座標.split("/").map((t) => t.split(";").map((s) => s.trim().match(/^(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)$/)));
  if (parsed.flat().some((m) => !m)) {
    err("座標は「北緯,東経」、線は「北緯,東経;北緯,東経;…」、分かれた面は「…/…」");
    continue;
  }
  const rings = parsed.map((ms) => ms.map((m) => ({ lat: Number(m[1]), lng: Number(m[2]) })));
  const coords = rings.flat();
  const place = {
    id: r.id,
    name: r.名前,
    ...(r.読み && { reading: r.読み }),
    kind: r.種類,
    coords,
    ...(AREA_KINDS.includes(r.種類) && { area: true }),
    ...(rings.length > 1 && { rings }),
    explanation: r.解説,
    ...(r.漢字注意 && { kanjiNote: r.漢字注意 }),
    ...(r.出典メモ && { source: r.出典メモ }),
    checked: r.確認 === "済",
  };
  if (rings.length > 1 && !place.area) err("「/」で区切れるのは、面（平野・盆地・湖・半島・島）だけ");
  if (place.area && rings.some((ring) => ring.length < 3)) err("面は、まわりの点を3つ以上（「;」区切り）");
  if (POINT_KINDS.includes(r.種類) && coords.length !== 1) err(`${r.種類}は1点（「北緯,東経」）`);
  if (!place.area && !POINT_KINDS.includes(r.種類) && coords.length < 2) err("山脈・川は線なので、2点以上（「;」区切り）");
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
const inside = (ring, x, y) => {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
// 地図の上の形：点・線（1本）・面（輪郭1つ以上）。edges は面なら閉じた輪郭、線ならその線
const shape = (place, proj) => {
  const parts = (place.rings ?? [place.coords]).map((ring) => ring.map(proj));
  return { area: !!place.area, parts, edges: place.area ? parts.map((r) => [...r, r[0]]) : parts };
};
const lineDist = (p, line) => (line.length === 1 ? Math.hypot(p[0] - line[0][0], p[1] - line[0][1]) : Math.min(...line.slice(1).map((b, i) => segDist(p, line[i], b))));
// 印までの長さ。面の中なら 0。lib/mapSets.ts の unitsToPlace と同じ
const distTo = (p, sh) => (sh.area && sh.parts.some((r) => inside(r, p[0], p[1])) ? 0 : Math.min(...sh.edges.map((e) => lineDist(p, e))));
const gap = (a, b) => Math.min(...a.edges.flatMap(samples).map((p) => distTo(p, b)), ...b.edges.flatMap(samples).map((p) => distTo(p, a)));

// 地図の範囲の中の陸地に細かく点を置く（勘で当たる確率を数えるため）
const LAND = new Map();
function landPoints(E) {
  if (LAND.has(E)) return LAND.get(E);
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
  const members = names.filter((n) => byName.has(n)).map((n) => byName.get(n));
  // いっしょに出すまとまり（全国は種類、地方は種類のまとまり）
  const group = (p) => (BY_KIND_ONLY.includes(r.地図) ? p.kind : KIND_GROUPS[p.kind]);
  for (const g of new Set(members.map(group))) {
    const n = members.filter((p) => group(p) === g).length;
    if (n > MAX_GROUP_MARKS) err(`「${g}」の地名が ${n} 個（${MAX_GROUP_MARKS}個まで）`);
  }
  const proj = projector(E);
  for (const p of members) {
    used.add(p.id);
    // 川は上流が地図の外に出てもよい（3点以上が中にあれば OK）。点・線（山脈）・面は全部中に
    const out = p.coords.filter(({ lat, lng }) => lat < E.south || lat > E.north || lng < E.west || lng > E.east).length;
    if (p.kind === "河川" ? p.coords.length - out < Math.min(3, p.coords.length) : out > 0) err(`「${p.name}」が地図（${r.地図}）の範囲からはみ出しています`);
  }
  for (let i = 0; i < members.length; i++)
    for (let j = i + 1; j < members.length; j++) {
      const [a, b] = [members[i], members[j]];
      const [sa, sb] = [shape(a, proj), shape(b, proj)];
      // 点どうし（▲●■）は、まとまりがちがっても「ぜんぶ」でいっしょに出るとかさなる
      if (shapeOf(a) === "point" && shapeOf(b) === "point" && group(a) !== group(b)) {
        if (BY_KIND_ONLY.includes(r.地図)) continue;
        const d = gap(sa, sb);
        if (d < MIN_POINT_GAP) warnings.push(`sets.csv:${line} [${r.id}] 「${a.name}」と「${b.name}」の印がかさなっている（${d.toFixed(0)}）。どちらかを外してください`);
        continue;
      }
      // 形がちがうもの（平野の中の川、山脈の上の山の▲）と、ちがうまとまりの地名はくらべない（いっしょに出ても形で見分けられる）
      if (shapeOf(a) !== shapeOf(b) || group(a) !== group(b)) continue;
      if (!a.area && a.coords.length > 1 && b.coords.length > 1) {
        const share = (x, y) => samples(x.edges[0]).filter((q) => distTo(q, y) < MIN_GAP).length / samples(x.edges[0]).length;
        const s = Math.max(share(sa, sb), share(sb, sa));
        if (s > MAX_LINE_OVERLAP) warnings.push(`sets.csv:${line} [${r.id}] 「${a.name}」と「${b.name}」の線が ${Math.round(s * 100)}% かさなっていて見分けにくい。地方の地図にするか、どちらかを外してください`);
        continue;
      }
      const d = gap(sa, sb);
      if (d < (a.area ? MIN_AREA_GAP : MIN_GAP)) warnings.push(`sets.csv:${line} [${r.id}] 「${members[i].name}」と「${members[j].name}」の印が近すぎて見分けにくい（${d.toFixed(0)}）。地方の地図にするか、どちらかを外してください`);
    }
  // 場所をタップ：陸地をでたらめにタップしたとき、それぞれの地名で正解になる割合
  if (members.length === names.length) {
    const scale = 800 / ((E.east - E.west) * Math.cos((((E.south + E.north) / 2) * Math.PI) / 180));
    const base = Math.max((E.tolKm / 111.2) * scale, LOCATE_MIN_UNITS);
    const marks = members.map((p) => ({
      p,
      sh: shape(p, proj),
      tol: p.area ? base * LOCATE_AREA_FACTOR : p.coords.length === 1 ? base : base * LOCATE_LINE_FACTOR,
    }));
    const hits = marks.map(() => 0);
    const land = landPoints(E);
    for (const [lat, lng] of land) {
      const q = proj({ lat, lng });
      // 判定は lib/mapSets.ts の judgeLocate と同じ：範囲に入っていて、もっと近いほかの地名（同じまとまりで同じ形）の範囲に入っていなければ正解
      const d = marks.map((m) => distTo(q, m.sh));
      marks.forEach((m, i) => {
        if (d[i] > m.tol) return;
        const blocked = marks.some((o, j) => j !== i && shapeOf(o.p) === shapeOf(m.p) && group(o.p) === group(m.p) && d[j] < d[i] && d[j] <= o.tol);
        if (!blocked) hits[i]++;
      });
    }
    marks.forEach((m, i) => {
      // 島は、その島をタップするのが答えなので調べない（南西諸島のように陸地が島だけの地図では高くなる）
      if (m.p.kind === "島") return;
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
