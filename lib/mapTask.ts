// 白地図をタップして答える問題（地図問題）の判定。
// 判定は画面のピクセルではなく経度・緯度で行う（画面の大きさで変わらないように）。
// 同じ判定を scripts/build-questions.mjs でも使っている（勘で当たる確率のチェック）。変えるときは両方そろえる。

/** 経線・緯線は許すはば（度）、交点は許す距離（km） */
export type MapTask =
  | { kind: "meridian"; lng: number; tol: number }
  | { kind: "parallel"; lat: number; tol: number }
  | { kind: "point"; lat: number; lng: number; tolKm: number };

export type LatLng = { lat: number; lng: number };

/** ok = 正解 / close = おしい（許すはばの2倍まで。記録は×）/ ng = ちがう */
export type MapVerdict = "ok" | "close" | "ng";

/** 地図に出す範囲。経線・緯線がまっすぐ縦・横に並ぶ図法（正距円筒図法）で描く */
export const JAPAN_EXTENT = { west: 128.3, east: 149.0, south: 29.5, north: 46.0 };

const KM_PER_DEG = 111.2;

export function distanceKm(a: LatLng, b: LatLng) {
  const r = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** 答えからのずれ。比べる量（度か km）と、画面に出す km */
export function mapError(task: MapTask, p: LatLng) {
  switch (task.kind) {
    case "meridian": {
      const d = p.lng - task.lng;
      return { value: Math.abs(d), tol: task.tol, km: Math.abs(d) * KM_PER_DEG * Math.cos((p.lat * Math.PI) / 180), dir: d > 0 ? "東" : "西" };
    }
    case "parallel": {
      const d = p.lat - task.lat;
      return { value: Math.abs(d), tol: task.tol, km: Math.abs(d) * KM_PER_DEG, dir: d > 0 ? "北" : "南" };
    }
    case "point": {
      const km = distanceKm(p, task);
      return { value: km, tol: task.tolKm, km, dir: "" };
    }
  }
}

export function judgeMap(task: MapTask, p: LatLng): MapVerdict {
  const { value, tol } = mapError(task, p);
  return value <= tol ? "ok" : value <= tol * 2 ? "close" : "ng";
}

/** 「東経135.0度」のような表示 */
export const formatLng = (lng: number) => `東経${lng.toFixed(1)}度`;
export const formatLat = (lat: number) => `北緯${lat.toFixed(1)}度`;
