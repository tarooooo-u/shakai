"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Place } from "@/lib/mapSets";
import { Loupe, MapLayers, getProjection, toMapPoint, useLoupe, type Projection } from "./mapBase";

/**
 * normal = ふつう / target = 光らせる（「この印の名前は？」）/ ok = 正解 / ng = えらんだがちがう /
 * done = この回でもう答えた / faded = うすく（ほかの印をじゃましないように）
 */
export type MarkTone = "normal" | "target" | "ok" | "ng" | "done" | "faded";
export type Mark = { place: Place; tone: MarkTone; label?: boolean };

const COLOR: Record<MarkTone, string> = {
  normal: "var(--ink)",
  target: "var(--accent)",
  ok: "var(--ok)",
  ng: "var(--ng)",
  done: "var(--muted)",
  faded: "var(--muted)",
};

// 指やマウスがこの距離（画面の px）より近い印をえらぶ
const HIT_PX = 28;

/** 白地図に山脈の線・火山の▲を描く。onPick があれば、印をタップしてえらべる */
export default function MarksMap({
  extent,
  marks,
  onPick,
}: {
  extent: string;
  marks: Mark[];
  onPick?: (placeId: string) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const [hover, setHover] = useState<string | null>(null);
  const { loupe, update: updateLoupe, hide: hideLoupe } = useLoupe(svg);
  const P = getProjection(extent);
  // 地図が小さく表示されるとき（スマホ）は、印・線・名前を太く大きくする
  const [size, setSize] = useState(1);
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize(Math.max(1, (0.8 * P.W) / Math.max(1, el.clientWidth))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [P.W]);

  // いちばん近い印（HIT_PX より遠ければなし）
  const nearest = (e: PointerEvent<SVGSVGElement>) => {
    const pt = toMapPoint(svg.current, e);
    if (!pt) return null;
    let best: string | null = null;
    let bestD = HIT_PX / pt.pxPerUnit;
    for (const { place } of marks) {
      const d = distance(P, place, pt.x, pt.y);
      if (d < bestD) [best, bestD] = [place.id, d];
    }
    return best;
  };
  const track = (e: PointerEvent<SVGSVGElement>) => {
    setHover(nearest(e));
    if (dragging.current) updateLoupe(e);
  };
  const release = () => {
    dragging.current = false;
    hideLoupe();
  };

  const shown = onPick && hover ? marks.map((m) => (m.place.id === hover ? { ...m, tone: "target" as const } : m)) : marks;
  const draw = (sw: number) => (
    <>
      {/* うすい印を下に、光らせる印を上に描く */}
      {[...shown]
        .sort((a, b) => order(a.tone) - order(b.tone))
        .map((m) => (
          <MarkShape key={m.place.id} P={P} mark={m} sw={sw * size} />
        ))}
      {shown.filter((m) => m.label).map((m) => (
        <MarkLabel key={m.place.id} P={P} mark={m} sw={sw * size} />
      ))}
    </>
  );

  return (
    <>
      <svg
        ref={svg}
        viewBox={`0 0 ${P.W} ${P.H}`}
        role="img"
        aria-label={onPick ? "白地図。答えの印をタップする" : "白地図"}
        className={`mx-auto block max-h-[70vh] w-full touch-none rounded-2xl border border-line select-none ${onPick ? "cursor-pointer" : ""}`}
        onPointerDown={(e) => {
          if (!onPick) return;
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          track(e);
        }}
        onPointerMove={(e) => onPick && track(e)}
        onPointerUp={(e) => {
          if (!onPick || !dragging.current) return;
          release();
          const id = nearest(e);
          setHover(null);
          if (id) onPick(id);
        }}
        onPointerCancel={release}
        onPointerLeave={() => !dragging.current && setHover(null)}
      >
        <MapLayers P={P} />
        {draw(1)}
      </svg>
      <Loupe P={P} at={onPick ? loupe : null}>
        {draw}
      </Loupe>
    </>
  );
}

const order = (t: MarkTone) => ["faded", "done", "normal", "ng", "ok", "target"].indexOf(t);

const pts = (P: Projection, place: Place) => place.coords.map(({ lat, lng }) => [P.x(lng), P.y(lat)] as const);

function distance(P: Projection, place: Place, px: number, py: number) {
  const p = pts(P, place);
  if (p.length === 1) return Math.hypot(px - p[0][0], py - p[0][1]);
  let best = Infinity;
  for (let i = 0; i + 1 < p.length; i++) {
    const [ax, ay] = p[i];
    const [bx, by] = p[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(px - ax - t * dx, py - ay - t * dy));
  }
  return best;
}

function MarkShape({ P, mark, sw }: { P: Projection; mark: Mark; sw: number }) {
  const { tone, place } = mark;
  const color = COLOR[tone];
  const opacity = tone === "faded" ? 0.4 : tone === "done" ? 0.55 : 1;
  const glow = tone === "target" || tone === "ok" || tone === "ng";
  const p = pts(P, place);
  if (p.length === 1) {
    const [cx, cy] = p[0];
    const s = 9 * sw;
    return (
      <g opacity={opacity}>
        {glow && <circle cx={cx} cy={cy} r={18 * sw} fill={color} fillOpacity={0.2} className={tone === "target" ? "animate-pulse" : ""} />}
        <path
          d={`M${cx},${cy - s * 1.15}L${cx - s},${cy + s * 0.7}L${cx + s},${cy + s * 0.7}Z`}
          fill={color}
          stroke="var(--surface)"
          strokeWidth={1.5 * sw}
          strokeLinejoin="round"
        />
      </g>
    );
  }
  const points = p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <g opacity={opacity}>
      {glow && (
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeOpacity={0.22}
          strokeWidth={22 * sw}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={tone === "target" ? "animate-pulse" : ""}
        />
      )}
      <polyline points={points} fill="none" stroke={color} strokeWidth={7 * sw} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/** 印のとなりに名前を出す（答えたあと） */
function MarkLabel({ P, mark, sw }: { P: Projection; mark: Mark; sw: number }) {
  const p = pts(P, mark.place);
  // 線はまん中あたり、点はその場所の右に出す。右はしに近ければ左に出す
  const [x, y] = p[Math.floor((p.length - 1) / 2)];
  const right = x < P.W - 130 * sw;
  return (
    <text
      x={x + (right ? 14 : -14) * sw}
      y={y + 6 * sw}
      textAnchor={right ? "start" : "end"}
      fontSize={18 * sw}
      fontWeight={700}
      fill={COLOR[mark.tone]}
      stroke="var(--surface)"
      strokeWidth={4 * sw}
      paintOrder="stroke"
      strokeLinejoin="round"
    >
      {mark.place.name}
    </text>
  );
}
