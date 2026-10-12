"use client";

import { useId, useState, type PointerEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import japan from "@/content/maps/japan.json";
import { MAP_EXTENTS, MAP_WIDTH, planar, type MapExtent } from "@/lib/mapTask";

// 白地図の描画（地図問題・地図セットで共通）と、タブレット・スマホ用の拡大鏡

/** 白地図の描画に使う、地図の範囲ごとの座標変換とパス */
function projection(E: MapExtent) {
  const { k, scale, x, y } = planar(E);
  const overlaps = (r: number[][]) =>
    r.some(([lng]) => lng >= E.west - 1) &&
    r.some(([lng]) => lng <= E.east + 1) &&
    r.some(([, lat]) => lat >= E.south - 1) &&
    r.some(([, lat]) => lat <= E.north + 1);
  const toPath = (lines: number[][][], close = true) =>
    lines
      .filter(overlaps)
      .map((r) => "M" + r.map(([lng, lat]) => `${x(lng).toFixed(1)},${y(lat).toFixed(1)}`).join("L") + (close ? "Z" : ""))
      .join("");
  return {
    E,
    scale,
    W: MAP_WIDTH,
    H: (E.north - E.south) * scale,
    x,
    y,
    invert: (px: number, py: number) => ({ lng: E.west + px / (k * scale), lat: E.north - py / scale }),
    japanPath: toPath(japan.japan),
    othersPath: toPath(japan.others),
    lakesPath: toPath(japan.lakes),
    bordersPath: toPath(japan.borders, false),
  };
}
export type Projection = ReturnType<typeof projection>;

// 地図の範囲ごとに一度だけ作る
const PROJECTIONS = new Map<string, Projection>();
export const getProjection = (name: string) => {
  if (!PROJECTIONS.has(name)) PROJECTIONS.set(name, projection(MAP_EXTENTS[name]));
  return PROJECTIONS.get(name)!;
};

/** 海・陸・県境・湖。sw は線の太さの倍率（拡大鏡では細くする） */
export function MapLayers({ P, sw = 1 }: { P: Projection; sw?: number }) {
  const clipId = useId();
  return (
    <>
      <rect x={-P.W} y={-P.H} width={P.W * 3} height={P.H * 3} fill="var(--sea)" />
      <path d={P.othersPath} fill="var(--land-other)" stroke="var(--land-other-line)" strokeWidth={1 * sw} strokeLinejoin="round" />
      <path d={P.japanPath} fill="var(--land)" stroke="var(--land-line)" strokeWidth={1.2 * sw} strokeLinejoin="round" />
      {/* 県境は陸の上だけに描く（データには海の上を通る線もある） */}
      <clipPath id={clipId}>
        <path d={P.japanPath} />
      </clipPath>
      <path d={P.bordersPath} clipPath={`url(#${clipId})`} fill="none" stroke="var(--land-border)" strokeWidth={0.8 * sw} strokeLinejoin="round" />
      <path d={P.lakesPath} fill="var(--sea)" stroke="var(--land-line)" strokeWidth={1 * sw} strokeLinejoin="round" />
    </>
  );
}

/** 画面上の位置 → 地図の座標（viewBox の中） */
export function toMapPoint(svg: SVGSVGElement | null, e: { clientX: number; clientY: number }) {
  const ctm = svg?.getScreenCTM();
  if (!ctm) return null;
  const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  return { x: pt.x, y: pt.y, pxPerUnit: ctm.a };
}

// ───── 拡大鏡 ─────
// 指（ペン）で触っているあいだだけ、指の上に地図を拡大して出す。マウスでは出さない。

const LOUPE = 128; // 拡大鏡の直径（px）
const ZOOM = 2.5; // いま画面に出ている大きさの何倍にするか
const FINGER = 56; // 指先から拡大鏡までの間

export type LoupeState = { clientX: number; clientY: number; x: number; y: number; pxPerUnit: number } | null;

/** 拡大鏡を出すかどうかを pointer イベントから決める */
export function useLoupe(svg: RefObject<SVGSVGElement | null>) {
  const [loupe, setLoupe] = useState<LoupeState>(null);
  const update = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "mouse") return;
    const p = toMapPoint(svg.current, e);
    if (p) setLoupe({ clientX: e.clientX, clientY: e.clientY, ...p });
  };
  return { loupe, update, hide: () => setLoupe(null) };
}

/** children は地図の座標で描く（ピンなど）。sw は線の太さの倍率 */
export function Loupe({ P, at, children }: { P: Projection; at: LoupeState; children?: (sw: number) => ReactNode }) {
  if (!at || typeof document === "undefined") return null;
  const view = LOUPE / (at.pxPerUnit * ZOOM);
  const sw = 1 / ZOOM;
  const left = Math.max(8, Math.min(window.innerWidth - LOUPE - 8, at.clientX - LOUPE / 2));
  // 上に出すと画面からはみ出すときは、指の下に出す
  const above = at.clientY - FINGER - LOUPE;
  const top = above >= 8 ? above : at.clientY + FINGER;
  return createPortal(
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-50 overflow-hidden rounded-full border-2 border-ink/70 bg-surface shadow-xl"
      style={{ left, top, width: LOUPE, height: LOUPE }}
    >
      <svg viewBox={`${at.x - view / 2} ${at.y - view / 2} ${view} ${view}`} width={LOUPE} height={LOUPE}>
        <MapLayers P={P} sw={sw} />
        {children?.(sw)}
        {/* まん中＝指の位置 */}
        <g stroke="var(--ink)" strokeWidth={1.2 * sw} strokeOpacity={0.7}>
          <line x1={at.x - view * 0.12} y1={at.y} x2={at.x - view * 0.04} y2={at.y} />
          <line x1={at.x + view * 0.04} y1={at.y} x2={at.x + view * 0.12} y2={at.y} />
          <line x1={at.x} y1={at.y - view * 0.12} x2={at.x} y2={at.y - view * 0.04} />
          <line x1={at.x} y1={at.y + view * 0.04} x2={at.x} y2={at.y + view * 0.12} />
        </g>
      </svg>
    </div>,
    document.body,
  );
}
