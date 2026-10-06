"use client";

import { useId, useRef, type PointerEvent } from "react";
import japan from "@/content/maps/japan.json";
import { MAP_EXTENTS, formatLat, formatLng, judgeMap, mapError, type LatLng, type MapExtent, type MapTask } from "@/lib/mapTask";

// 地図の横はばは、どの範囲でもこの長さ（ピンや線の太さをそろえるため）
const WIDTH = 800;

/**
 * 正距円筒図法：経線は縦、緯線は横のまっすぐな線になる。
 * まん中の緯度で横をちぢめて、形が横に太らないようにする
 */
function projection(E: MapExtent) {
  const k = Math.cos((((E.south + E.north) / 2) * Math.PI) / 180);
  const scale = WIDTH / ((E.east - E.west) * k);
  const x = (lng: number) => (lng - E.west) * k * scale;
  const y = (lat: number) => (E.north - lat) * scale;
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
    W: WIDTH,
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
type Projection = ReturnType<typeof projection>;

// 地図の範囲ごとに一度だけ作る
const PROJECTIONS = new Map<string, Projection>();
const getProjection = (name: string) => {
  if (!PROJECTIONS.has(name)) PROJECTIONS.set(name, projection(MAP_EXTENTS[name]));
  return PROJECTIONS.get(name)!;
};

const VERDICT_COLOR = { ok: "var(--ok)", close: "var(--unsure)", ng: "var(--ng)" };

/**
 * 白地図をタップ（クリック）してピンを立てる。ドラッグで動かせる。
 * ピンには、経線の問題なら縦線、緯線なら横線、交点なら十字の補助線が付く。
 * decided になったら正解の線・点と、正解にする範囲を表示する。
 */
export default function MapTap({
  task,
  pin,
  onPin,
  decided,
}: {
  task: MapTask;
  pin: LatLng | null;
  onPin: (p: LatLng) => void;
  decided: boolean;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const clipId = useId();
  const P = getProjection(task.extent);
  const { W, H, x, y } = P;

  const place = (e: PointerEvent<SVGSVGElement>) => {
    const ctm = svg.current?.getScreenCTM();
    if (!ctm) return;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    onPin(P.invert(Math.max(0, Math.min(W, pt.x)), Math.max(0, Math.min(H, pt.y))));
  };

  const verdict = decided && pin ? judgeMap(task, pin) : null;
  const color = verdict ? VERDICT_COLOR[verdict] : "var(--accent)";

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${W} ${H}`}
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
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <rect width={W} height={H} fill="var(--sea)" />
      <path d={P.othersPath} fill="var(--land-other)" stroke="var(--land-other-line)" strokeWidth={1} strokeLinejoin="round" />
      <path d={P.japanPath} fill="var(--land)" stroke="var(--land-line)" strokeWidth={1.2} strokeLinejoin="round" />
      {/* 県境は陸の上だけに描く（データには海の上を通る線もある） */}
      <clipPath id={clipId}>
        <path d={P.japanPath} />
      </clipPath>
      <path d={P.bordersPath} clipPath={`url(#${clipId})`} fill="none" stroke="var(--land-border)" strokeWidth={0.8} strokeLinejoin="round" />
      <path d={P.lakesPath} fill="var(--sea)" stroke="var(--land-line)" strokeWidth={1} strokeLinejoin="round" />

      {decided && <Answer task={task} P={P} />}

      {pin && (
        <g>
          {/* 補助線：経線なら縦、緯線なら横、交点なら十字 */}
          {task.kind !== "parallel" && (
            <line x1={x(pin.lng)} y1={0} x2={x(pin.lng)} y2={H} stroke={color} strokeWidth={1.5} strokeOpacity={0.8} />
          )}
          {task.kind !== "meridian" && (
            <line x1={0} y1={y(pin.lat)} x2={W} y2={y(pin.lat)} stroke={color} strokeWidth={1.5} strokeOpacity={0.8} />
          )}
          {decided && task.kind === "point" && (
            <line x1={x(pin.lng)} y1={y(pin.lat)} x2={x(task.lng)} y2={y(task.lat)} stroke={color} strokeWidth={2} strokeDasharray="5 4" />
          )}
          <circle cx={x(pin.lng)} cy={y(pin.lat)} r={13} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={2} />
          <circle cx={x(pin.lng)} cy={y(pin.lat)} r={3.5} fill={color} />
        </g>
      )}
    </svg>
  );
}

/** 正解の線（または点）と、正解にする範囲 */
function Answer({ task, P }: { task: MapTask; P: Projection }) {
  const { W, H, x, y } = P;
  const label = { fontSize: 22, fontWeight: 700, fill: "var(--ok)", paintOrder: "stroke", stroke: "var(--surface)", strokeWidth: 5 } as const;
  if (task.kind === "meridian") {
    const [x0, x1] = [x(task.lng - task.tol), x(task.lng + task.tol)];
    return (
      <g>
        <rect x={x0} y={0} width={x1 - x0} height={H} fill="var(--ok)" fillOpacity={0.15} />
        <line x1={x(task.lng)} y1={0} x2={x(task.lng)} y2={H} stroke="var(--ok)" strokeWidth={2.5} />
        <text x={x(task.lng) + 6} y={H - 12} style={label}>{formatLng(task.lng).replace(".0", "")}</text>
      </g>
    );
  }
  if (task.kind === "parallel") {
    const [y0, y1] = [y(task.lat + task.tol), y(task.lat - task.tol)];
    return (
      <g>
        <rect x={0} y={y0} width={W} height={y1 - y0} fill="var(--ok)" fillOpacity={0.15} />
        <line x1={0} y1={y(task.lat)} x2={W} y2={y(task.lat)} stroke="var(--ok)" strokeWidth={2.5} />
        <text x={10} y={y(task.lat) - 8} style={label}>{formatLat(task.lat).replace(".0", "")}</text>
      </g>
    );
  }
  // km → 地図上の長さ（緯度1度 ≒ 111km）
  const r = (task.tolKm / 111.2) * P.scale;
  return (
    <g>
      <circle cx={x(task.lng)} cy={y(task.lat)} r={r} fill="var(--ok)" fillOpacity={0.15} stroke="var(--ok)" strokeWidth={1.5} />
      <line x1={x(task.lng)} y1={0} x2={x(task.lng)} y2={H} stroke="var(--ok)" strokeWidth={1.2} strokeDasharray="6 5" />
      <line x1={0} y1={y(task.lat)} x2={W} y2={y(task.lat)} stroke="var(--ok)" strokeWidth={1.2} strokeDasharray="6 5" />
      <circle cx={x(task.lng)} cy={y(task.lat)} r={5} fill="var(--ok)" />
    </g>
  );
}

/** 判定のあとに出す「どれだけずれていたか」 */
export function mapFeedback(task: MapTask, pin: LatLng) {
  const { km, dir } = mapError(task, pin);
  const where = task.kind === "meridian" ? formatLng(pin.lng) : task.kind === "parallel" ? formatLat(pin.lat) : `${formatLat(pin.lat)}・${formatLng(pin.lng)}`;
  const gap = km < 5 ? "ほぼぴったり" : task.kind === "point" ? `約${Math.round(km)}kmはなれていた` : `約${Math.round(km)}km${dir}にずれていた`;
  return `きみのピン：${where}（${gap}）`;
}
