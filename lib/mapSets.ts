// 白地図ドリル：1枚の地図にいくつも印（山脈の線・火山の▲）を付けて、まとめて答える。
// ふだんの問題（content/questions）とは別。地名は content/maps/places.csv、セットは sets.csv。
// 学習記録は「地名 × 答え方」ごと（例: p0004@pick）。同じ地名が別のセットに入っていても記録は1つ。
import { isActive, isGraduated, type Progress } from "./progress";
import type { LatLng } from "./mapTask";
import { shuffle, type Style } from "./session";

export type Place = {
  id: string;
  name: string;
  reading?: string;
  /** 山地・山脈 / 火山 */
  kind: string;
  /** 1点なら▲、2点以上なら線 */
  coords: LatLng[];
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
 * 将来：locate = 印のない地図で場所をタップする（C）
 */
export type MapMode = "pick" | "name";

export const MAP_MODE_LABEL: Record<MapMode, string> = {
  pick: "地図でえらぶ",
  name: "名前を答える",
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
