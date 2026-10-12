// 白地図ドリル：1枚の地図にいくつも印（山脈の線・火山の▲）を付けて、まとめて答える。
// ふだんの問題（content/questions）とは別。地名は content/maps/places.csv、セットは sets.csv。
// 学習記録は「地名 × 答え方」ごと（例: p0004@pick）。同じ地名が別のセットに入っていても記録は1つ。
import { isActive, isGraduated, type Progress } from "./progress";
import { KM_PER_DEG, MAP_EXTENTS, planar, type LatLng, type MapVerdict } from "./mapTask";
import { shuffle, type Style } from "./session";

export type Place = {
  id: string;
  name: string;
  reading?: string;
  /** 山地・山脈 / 火山 / 岬 / 河川 / 平野 / 盆地 / 湖 / 半島 / 島 */
  kind: string;
  /** 1点なら▲（岬は●）、2点以上なら線。area なら点で囲んだ面（平野・盆地・湖・半島・島） */
  coords: LatLng[];
  area?: boolean;
  /** 面がいくつかに分かれているとき（対馬・隠岐など）の、それぞれの輪郭。coords はその全部をつなげたもの */
  rings?: LatLng[][];
  explanation: string;
  kanjiNote?: string;
  source?: string;
  checked: boolean;
};

export type MapSet = {
  id: string;
  title: string;
  /** 地図の範囲（content/maps/extents.json の名前） */
  extent: string;
  places: string[];
};

/**
 * pick = 名前を見て、地図の印をえらぶ（B）
 * name = 光っている印の名前を答える（A。カードか4択）
 * locate = 印のない地図で、場所をタップする（C）
 */
export type MapMode = "pick" | "name" | "locate";

export const MAP_MODE_LABEL: Record<MapMode, string> = {
  pick: "地図でえらぶ",
  name: "名前を答える",
  locate: "場所をタップ",
};

export const recordKey = (placeId: string, mode: MapMode) => `${placeId}@${mode}`;

/** 地図セットの1回分 */
export type MapRun = {
  setId: string;
  mode: MapMode;
  /** name のときだけ使う */
  style: Style;
  /** 出す地名（この順に出す） */
  targets: string[];
  /** 4択の選択肢（開始時に決めておく） */
  choices: Record<string, string[]>;
  /** 始めたときにもう卒業していた地名 */
  graduatedBefore: string[];
};

/** 出す地名：卒業していないもの。全部卒業していたら全部 */
export function runTargets(set: MapSet, mode: MapMode, progress: Progress, onlyIds?: string[]) {
  if (onlyIds) return shuffle(onlyIds);
  const active = set.places.filter((id) => isActive(progress[recordKey(id, mode)]));
  return shuffle(active.length ? active : set.places);
}

/** 4択：同じ種類の地名から、なるべく同じセットのものを誤答にする */
export function placeChoices(place: Place, set: MapSet, all: Place[]): string[] {
  const same = all.filter((p) => p.kind === place.kind && p.id !== place.id);
  const inSet = shuffle(same.filter((p) => set.places.includes(p.id)));
  const others = shuffle(same.filter((p) => !set.places.includes(p.id)));
  const wrong = [...inSet, ...others].slice(0, 3).map((p) => p.name);
  return shuffle([place.name, ...wrong]);
}

export function setProgress(set: MapSet, mode: MapMode, progress: Progress) {
  const records = set.places.map((id) => progress[recordKey(id, mode)]);
  return {
    total: set.places.length,
    seen: records.filter(Boolean).length,
    graduated: records.filter(isGraduated).length,
  };
}

// ───── 場所をタップ（locate）の判定 ─────
// 地図の上の長さ（横はば 800 のときの単位）で判定する。地図の範囲ごとの許すはば（extents.json の tolKm）を使うが、
// 全国・北海道のように広い地図では km だと小さくなりすぎるので、地図の上で最低 LOCATE_MIN_UNITS にする。
// 山脈の線は長くて当てやすいので、許すはばを LOCATE_LINE_FACTOR 倍にせまくする。
// 同じ式を scripts/build-mapsets.mjs でも使っている（勘で当たる確率のチェック）。変えるときは両方そろえる。

export const LOCATE_MIN_UNITS = 36;
export const LOCATE_LINE_FACTOR = 0.7;
/** 平野（面）は中に立てれば正解なので、まわりの許すはばはせまくする */
export const LOCATE_AREA_FACTOR = 0.5;

/** 点 (x, y) が多角形の中にあるか */
export function insidePolygon(p: number[][], x: number, y: number) {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i];
    const [xj, yj] = p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** 面の輪郭（1つか、いくつか） */
export const placeRings = (place: Place) => place.rings ?? [place.coords];

/** 地名の印（点・線・面）までの、地図の上の長さ。面の中なら 0 */
export function unitsToPlace(extent: string, place: Place, x: number, y: number) {
  const P = planar(MAP_EXTENTS[extent]);
  const toXY = (ring: LatLng[]) => ring.map(({ lat, lng }) => [P.x(lng), P.y(lat)]);
  if (place.area) {
    const rings = placeRings(place).map(toXY);
    if (rings.some((r) => insidePolygon(r, x, y))) return 0;
    return Math.min(...rings.map((r) => lineDistance([...r, r[0]], x, y)));
  }
  const p = toXY(place.coords);
  if (p.length === 1) return Math.hypot(x - p[0][0], y - p[0][1]);
  return lineDistance(p, x, y);
}

/** 折れ線までの長さ */
function lineDistance(p: number[][], x: number, y: number) {
  let best = Infinity;
  for (let i = 0; i + 1 < p.length; i++) {
    const [ax, ay] = p[i];
    const [bx, by] = p[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return best;
}

/** 正解にする範囲（地図の上の長さ） */
export function locateTolerance(extent: string, place: Place) {
  const E = MAP_EXTENTS[extent] as (typeof MAP_EXTENTS)[string] & { tolKm: number };
  const base = Math.max((E.tolKm / KM_PER_DEG) * planar(E).scale, LOCATE_MIN_UNITS);
  return place.area ? base * LOCATE_AREA_FACTOR : place.coords.length === 1 ? base : base * LOCATE_LINE_FACTOR;
}

/**
 * ok = 正解 / close = おしい（許すはばの2倍まで。記録は×）/ ng = ちがう。
 * ほかの地名の範囲に入っていたら ng（other にその地名）。
 * ただし平野（面）とそれ以外はくらべない（平野の中を川が流れているので）
 */
export function judgeLocate(set: MapSet, target: Place, pin: LatLng, places: Map<string, Place>) {
  const P = planar(MAP_EXTENTS[set.extent]);
  const [x, y] = [P.x(pin.lng), P.y(pin.lat)];
  const d = unitsToPlace(set.extent, target, x, y);
  const tol = locateTolerance(set.extent, target);
  const other = set.places
    .filter((id) => id !== target.id)
    .map((id) => places.get(id)!)
    .filter((p) => !p.area === !target.area)
    .find((p) => {
      const dp = unitsToPlace(set.extent, p, x, y);
      return dp < d && dp <= locateTolerance(set.extent, p);
    });
  const verdict: MapVerdict = other ? "ng" : d <= tol ? "ok" : d <= tol * 2 ? "close" : "ng";
  return { verdict, km: (d / P.scale) * KM_PER_DEG, other };
}
