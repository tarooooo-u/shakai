// 地図問題（白地図をタップする問題）用の海岸線・湖・県境のデータを作る。
//   npm run map
// Natural Earth（パブリックドメイン）の 1:10m データを使う。国境は「日本の立場」版
// （北方領土・竹島を日本として描く）。日本のまわりだけ切り出して、点を間引いて
// content/maps/japan.json に保存する。データの版を変えたいときだけ再実行する。
// 出典：Natural Earth https://www.naturalearthdata.com/
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/";
const OUT = join(ROOT, "content", "maps", "japan.json");

// 切り出す範囲（経度・緯度）。地図に出す範囲（lib/mapTask.ts の MAP_EXTENTS）より少し広くとる
const BOX = { west: 120, east: 155, south: 26, north: 50 };
// 点の間引き（度）。0.004度 ≒ 400m（地方の地図で拡大してもカクカクしないように）
const TOLERANCE = 0.004;
// これより小さい島・湖は描かない（度×度。0.0003 ≒ 3km²）
const MIN_AREA = 0.0003;
// 湖は日本のあたりだけ
const JAPAN_BOX = { west: 128, east: 149.5, south: 29, north: 46 };

async function load(name) {
  const cache = join(tmpdir(), `${name}.geojson`);
  if (!existsSync(cache)) {
    console.log("ダウンロード中 …", BASE + name + ".geojson");
    const res = await fetch(BASE + name + ".geojson");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    writeFileSync(cache, Buffer.from(await res.arrayBuffer()));
  }
  return JSON.parse(readFileSync(cache, "utf8"));
}
const geo = await load("ne_10m_admin_0_countries_jpn");
const lakesGeo = await load("ne_10m_lakes");
const linesGeo = await load("ne_10m_admin_1_states_provinces_lines");

// 長方形で多角形を切る（Sutherland–Hodgman）。範囲の外は地図に出ないので、ふちが直線になってもよい
function clip(ring) {
  const edges = [
    [(p) => p[0] >= BOX.west, (a, b) => cross(a, b, 0, BOX.west)],
    [(p) => p[0] <= BOX.east, (a, b) => cross(a, b, 0, BOX.east)],
    [(p) => p[1] >= BOX.south, (a, b) => cross(a, b, 1, BOX.south)],
    [(p) => p[1] <= BOX.north, (a, b) => cross(a, b, 1, BOX.north)],
  ];
  let out = ring;
  for (const [inside, at] of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      if (inside(cur)) {
        if (!inside(prev)) out.push(at(prev, cur));
        out.push(cur);
      } else if (inside(prev)) out.push(at(prev, cur));
    }
    if (!out.length) break;
  }
  return out;
}
function cross(a, b, axis, v) {
  const t = (v - a[axis]) / (b[axis] - a[axis]);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

// 点の間引き（Douglas–Peucker）
function simplify(points) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let max = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = segDist(points[i], points[s], points[e]);
      if (d > max) [max, idx] = [d, i];
    }
    if (max > TOLERANCE) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}
function segDist(p, a, b) {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
const area = (r) => Math.abs(r.reduce((s, p, i) => s + p[0] * r[(i + 1) % r.length][1] - r[(i + 1) % r.length][0] * p[1], 0)) / 2;
const round = (v) => Math.round(v * 1000) / 1000;

const polygons = (g) => (g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);
// 多角形の外がわの輪を切り出して間引く（穴は使わない。湖は別のデータで描く）
function ring(outer) {
  const r = clip(outer);
  if (r.length < 3 || area(r) < MIN_AREA) return null;
  const s = simplify([...r, r[0]]).slice(0, -1).map((p) => [round(p[0]), round(p[1])]);
  return s.length < 3 ? null : s;
}

const japan = [];
const others = [];
for (const f of geo.features) {
  for (const [outer] of polygons(f.geometry)) {
    const s = ring(outer);
    if (s) (f.properties.ADM0_A3 === "JPN" ? japan : others).push(s);
  }
}

// 湖（琵琶湖・霞ヶ浦・猪苗代湖 など）
const inJapan = (r) => r.every(([lng, lat]) => lng >= JAPAN_BOX.west && lng <= JAPAN_BOX.east && lat >= JAPAN_BOX.south && lat <= JAPAN_BOX.north);
const lakes = [];
for (const f of lakesGeo.features) {
  for (const [outer] of polygons(f.geometry)) {
    if (!inJapan(outer)) continue;
    const s = ring(outer);
    if (s) lakes.push(s);
  }
}

// 県境（線）
const borders = [];
for (const f of linesGeo.features) {
  if (f.properties.ADM0_A3 !== "JPN" && f.properties.adm0_a3 !== "JPN") continue;
  const g = f.geometry;
  for (const line of g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : []) {
    const s = simplify(line).map((p) => [round(p[0]), round(p[1])]);
    if (s.length >= 2) borders.push(s);
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify({
    source: "Natural Earth 1:10m（Admin 0 Countries 日本の立場・Lakes・Admin 1 Lines）・パブリックドメイン",
    japan,
    others,
    lakes,
    borders,
  }) + "\n",
);
const points = (rs) => rs.reduce((s, r) => s + r.length, 0);
console.log(
  `地図データ OK: 日本 ${japan.length}島・${points(japan)}点 / まわりの国 ${others.length}・${points(others)}点 / 湖 ${lakes.length} / 県境 ${borders.length}本・${points(borders)}点 → ${OUT}`,
);
