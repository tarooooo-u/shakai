"use client";

import { useRef, type PointerEvent } from "react";
import japan from "@/content/maps/japan.json";
import { JAPAN_EXTENT as E, formatLat, formatLng, judgeMap, mapError, type LatLng, type MapTask } from "@/lib/mapTask";

// 正距円筒図法：経線は縦、緯線は横のまっすぐな線になる。
// まん中の緯度で横をちぢめて、日本の形が横に太らないようにする
const SCALE = 50;
const K = Math.cos((((E.south + E.north) / 2) * Math.PI) / 180);
const W = (E.east - E.west) * K * SCALE;
const H = (E.north - E.south) * SCALE;
const x = (lng: number) => (lng - E.west) * K * SCALE;
const y = (lat: number) => (E.north - lat) * SCALE;

const toPath = (rings: number[][][]) =>
  rings.map((r) => "M" + r.map(([lng, lat]) => `${x(lng).toFixed(1)},${y(lat).toFixed(1)}`).join("L") + "Z").join("");
const JAPAN_PATH = toPath(japan.japan);
const OTHERS_PATH = toPath(japan.others);

const VERDICT_COLOR = { ok: "var(--ok)", close: "var(--unsure)", ng: "var(--ng)" };

/**
 * 白地図をタップ（クリック）してピンを立てる。ドラッグで動かせる。
 * decided になったら正解の線・点と、ピンのずれを表示する。
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

  const place = (e: PointerEvent<SVGSVGElement>) => {
    const ctm = svg.current?.getScreenCTM();
    if (!ctm) return;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const px = Math.max(0, Math.min(W, pt.x));
    const py = Math.max(0, Math.min(H, pt.y));
    onPin({ lng: E.west + px / (K * SCALE), lat: E.north - py / SCALE });
  };

  const verdict = decided && pin ? judgeMap(task, pin) : null;
  const color = verdict ? VERDICT_COLOR[verdict] : "var(--accent)";

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="日本の白地図。答えの場所をタップしてピンを立てる"
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
      <path d={OTHERS_PATH} fill="var(--surface-2)" stroke="var(--line)" strokeWidth={1} />
      <path d={JAPAN_PATH} fill="var(--surface)" stroke="var(--muted)" strokeWidth={1.2} strokeLinejoin="round" />

      {decided && <Answer task={task} />}

      {pin && (
        <g>
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
function Answer({ task }: { task: MapTask }) {
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
  const r = (task.tolKm / 111.2) * SCALE;
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
