"use client";

import { useRef } from "react";
import { formatLat, formatLng, judgeMap, mapError, type LatLng, type MapTask } from "@/lib/mapTask";
import { Loupe, MapLayers, getProjection, mapBoxStyle, usePinPlacement, type Projection } from "./mapBase";

const VERDICT_COLOR = { ok: "var(--ok)", close: "var(--unsure)", ng: "var(--ng)" };

/**
 * 白地図をタップ（クリック）してピンを立てる。ピンをつかんで動かせる（usePinPlacement）。
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
  const P = getProjection(task.extent);
  const { W, H, x, y } = P;
  const { loupe, svgProps, handle } = usePinPlacement({ svg, P, pin, onPin, active: !decided });

  const verdict = decided && pin ? judgeMap(task, pin) : null;
  const color = verdict ? VERDICT_COLOR[verdict] : "var(--accent)";

  // ピンと補助線（拡大鏡の中にも同じものを描く）
  const pinMarks = (sw: number) =>
    pin && (
      <g>
        {/* 補助線：経線なら縦、緯線なら横、交点なら十字 */}
        {task.kind !== "parallel" && (
          <line x1={x(pin.lng)} y1={-H} x2={x(pin.lng)} y2={2 * H} stroke={color} strokeWidth={1.5 * sw} strokeOpacity={0.8} />
        )}
        {task.kind !== "meridian" && (
          <line x1={-W} y1={y(pin.lat)} x2={2 * W} y2={y(pin.lat)} stroke={color} strokeWidth={1.5 * sw} strokeOpacity={0.8} />
        )}
        {decided && task.kind === "point" && (
          <line x1={x(pin.lng)} y1={y(pin.lat)} x2={x(task.lng)} y2={y(task.lat)} stroke={color} strokeWidth={2 * sw} strokeDasharray={`${5 * sw} ${4 * sw}`} />
        )}
        <circle cx={x(pin.lng)} cy={y(pin.lat)} r={13 * sw} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={2 * sw} />
        <circle cx={x(pin.lng)} cy={y(pin.lat)} r={3.5 * sw} fill={color} />
      </g>
    );

  return (
    <>
      <div className="relative mx-auto" style={mapBoxStyle(P)}>
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="白地図。答えの場所をタップしてピンを立てる"
          className={`block size-full touch-pan-y rounded-2xl border border-line select-none ${decided ? "" : "cursor-crosshair"}`}
          {...svgProps}
        >
          <MapLayers P={P} />
          {decided && <Answer task={task} P={P} />}
          {pinMarks(1)}
        </svg>
        {handle}
      </div>
      <Loupe P={P} at={loupe}>
        {pinMarks}
      </Loupe>
    </>
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
