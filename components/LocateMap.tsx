"use client";

import { useRef, type PointerEvent } from "react";
import type { Place } from "@/lib/mapSets";
import type { LatLng, MapVerdict } from "@/lib/mapTask";
import { Loupe, MapLayers, getProjection, toMapPoint, useLoupe, type Projection } from "./mapBase";
import { MarkLayer, useMarkSize, type Mark } from "./MarksMap";

const VERDICT_COLOR: Record<MapVerdict, string> = { ok: "var(--ok)", close: "var(--unsure)", ng: "var(--ng)" };

/**
 * 白地図ドリルの「場所をタップ」。印のない地図にピンを立てる（ドラッグで動かせる）。
 * 指で触っているあいだは拡大鏡を出す。
 * answer を渡したら（決定したあと）、正解の印と、正解にする範囲を表示する。
 */
export default function LocateMap({
  extent,
  marks,
  pin,
  onPin,
  answer,
}: {
  extent: string;
  /** この回でもう答えた地名など、はじめから見せておく印 */
  marks: Mark[];
  pin: LatLng | null;
  onPin: (p: LatLng) => void;
  /** 決定したあと：正解の地名・正解にする範囲（地図の上の長さ）・判定 */
  answer?: { place: Place; tol: number; verdict: MapVerdict };
}) {
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const { loupe, update: updateLoupe, hide: hideLoupe } = useLoupe(svg);
  const P = getProjection(extent);
  const size = useMarkSize(svg, P.W);
  const decided = answer !== undefined;

  const place = (e: PointerEvent<SVGSVGElement>) => {
    const pt = toMapPoint(svg.current, e);
    if (!pt) return;
    onPin(P.invert(Math.max(0, Math.min(P.W, pt.x)), Math.max(0, Math.min(P.H, pt.y))));
    updateLoupe(e);
  };
  const release = () => {
    dragging.current = false;
    hideLoupe();
  };

  const color = answer ? VERDICT_COLOR[answer.verdict] : "var(--accent)";
  const shown: Mark[] = answer ? [...marks, { place: answer.place, tone: "ok", label: true }] : marks;

  const draw = (sw: number) => (
    <>
      {answer && <Zone P={P} place={answer.place} tol={answer.tol} />}
      <MarkLayer P={P} marks={shown} sw={sw * size} />
      {pin && answer && answer.verdict !== "ok" && (() => {
        const [tx, ty] = nearestPoint(P, answer.place, P.x(pin.lng), P.y(pin.lat));
        return (
          <line x1={P.x(pin.lng)} y1={P.y(pin.lat)} x2={tx} y2={ty} stroke={color} strokeWidth={2 * sw * size} strokeDasharray={`${5 * sw * size} ${4 * sw * size}`} />
        );
      })()}
      {pin && (
        <g>
          <circle cx={P.x(pin.lng)} cy={P.y(pin.lat)} r={11 * sw * size} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={2 * sw * size} />
          <circle cx={P.x(pin.lng)} cy={P.y(pin.lat)} r={3.5 * sw * size} fill={color} />
        </g>
      )}
    </>
  );

  return (
    <>
      <svg
        ref={svg}
        viewBox={`0 0 ${P.W} ${P.H}`}
        role="img"
        aria-label="白地図。答えの場所をタップしてピンを立てる"
        className={`mx-auto block max-h-[70vh] w-full touch-none rounded-2xl border border-line select-none ${decided ? "" : "cursor-crosshair"}`}
        onPointerDown={(e) => {
          if (decided) return;
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          place(e);
        }}
        onPointerMove={(e) => dragging.current && !decided && place(e)}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <MapLayers P={P} />
        {draw(1)}
      </svg>
      <Loupe P={P} at={decided ? null : loupe}>
        {draw}
      </Loupe>
    </>
  );
}

/** 正解にする範囲：点なら円、線なら線にそった帯 */
function Zone({ P, place, tol }: { P: Projection; place: Place; tol: number }) {
  const pts = place.coords.map(({ lat, lng }) => [P.x(lng), P.y(lat)]);
  if (pts.length === 1)
    return <circle cx={pts[0][0]} cy={pts[0][1]} r={tol} fill="var(--ok)" fillOpacity={0.15} stroke="var(--ok)" strokeOpacity={0.5} strokeWidth={1.5} />;
  return (
    <polyline
      points={pts.map((p) => p.join(",")).join(" ")}
      fill="none"
      stroke="var(--ok)"
      strokeOpacity={0.15}
      strokeWidth={tol * 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** 印（点か線）の上で、(x, y) にいちばん近いところ */
function nearestPoint(P: Projection, place: Place, x: number, y: number): [number, number] {
  const p = place.coords.map(({ lat, lng }) => [P.x(lng), P.y(lat)]);
  if (p.length === 1) return [p[0][0], p[0][1]];
  let best: [number, number] = [p[0][0], p[0][1]];
  let bestD = Infinity;
  for (let i = 0; i + 1 < p.length; i++) {
    const [ax, ay] = p[i];
    const [bx, by] = p[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    const q: [number, number] = [ax + t * dx, ay + t * dy];
    const d = Math.hypot(x - q[0], y - q[1]);
    if (d < bestD) [best, bestD] = [q, d];
  }
  return best;
}
