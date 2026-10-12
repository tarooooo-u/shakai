"use client";

import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { unitsToPlace, type Place } from "@/lib/mapSets";
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
  const size = useMarkSize(svg, P.W);

  // いちばん近い印（HIT_PX より遠ければなし）。平野の中を流れる川もえらべるように、線・点を平野より先にさがす
  const nearest = (e: PointerEvent<SVGSVGElement>) => {
    const pt = toMapPoint(svg.current, e);
    if (!pt) return null;
    for (const areas of [false, true]) {
      let best: string | null = null;
      let bestD = HIT_PX / pt.pxPerUnit;
      for (const { place } of marks) {
        if (!place.area !== !areas) continue;
        const d = unitsToPlace(extent, place, pt.x, pt.y);
        if (d < bestD) [best, bestD] = [place.id, d];
      }
      if (best) return best;
    }
    return null;
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
  const draw = (sw: number) => <MarkLayer P={P} marks={shown} sw={sw * size} />;

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

/** 地図が小さく表示されるとき（スマホ）は、印・線・名前を太く大きくする。線の太さなどの倍率を返す */
export function useMarkSize(svg: RefObject<SVGSVGElement | null>, W: number) {
  const [size, setSize] = useState(1);
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize(Math.max(1, (0.8 * W) / Math.max(1, el.clientWidth))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [svg, W]);
  return size;
}

/** 印と名前をまとめて描く。平野（面）を下に、その上に線・点。うすい印を下に、光らせる印を上に描く */
export function MarkLayer({ P, marks, sw }: { P: Projection; marks: Mark[]; sw: number }) {
  return (
    <>
      {[...marks]
        .sort((a, b) => (a.place.area ? 0 : 10) + order(a.tone) - (b.place.area ? 0 : 10) - order(b.tone))
        .map((m) => (
          <MarkShape key={m.place.id} P={P} mark={m} sw={sw} />
        ))}
      {marks.filter((m) => m.label).map((m) => (
        <MarkLabel key={m.place.id} P={P} mark={m} sw={sw} />
      ))}
    </>
  );
}

const order = (t: MarkTone) => ["faded", "done", "normal", "ng", "ok", "target"].indexOf(t);

const pts = (P: Projection, place: Place) => place.coords.map(({ lat, lng }) => [P.x(lng), P.y(lat)] as const);

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
  if (place.area) {
    // 小さい面（湖・盆地）は地図の上で点のようになるので、まわりに丸を重ねて目立たせる
    const xs = p.map((q) => q[0]);
    const ys = p.map((q) => q[1]);
    const small = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) < 18 * sw;
    const [cx, cy] = [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2];
    return (
      <g opacity={opacity}>
        {small && (
          <circle
            cx={cx}
            cy={cy}
            r={12 * sw}
            fill={color}
            fillOpacity={glow ? 0.25 : 0.08}
            stroke={color}
            strokeWidth={2 * sw}
            strokeDasharray={`${4 * sw} ${3 * sw}`}
            className={tone === "target" ? "animate-pulse" : ""}
          />
        )}
        <polygon
          points={points}
          fill={color}
          fillOpacity={glow ? 0.35 : 0.16}
          stroke={color}
          strokeWidth={(glow ? 3 : 2) * sw}
          strokeDasharray={`${6 * sw} ${4 * sw}`}
          strokeLinejoin="round"
          className={tone === "target" ? "animate-pulse" : ""}
        />
      </g>
    );
  }
  // 川は細く、山脈は太く
  const width = place.kind === "河川" ? 4.5 : 7;
  return (
    <g opacity={opacity}>
      {glow && (
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeOpacity={0.22}
          strokeWidth={(width + 15) * sw}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={tone === "target" ? "animate-pulse" : ""}
        />
      )}
      <polyline points={points} fill="none" stroke={color} strokeWidth={width * sw} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/** 印のとなりに名前を出す（答えたあと） */
function MarkLabel({ P, mark, sw }: { P: Projection; mark: Mark; sw: number }) {
  const p = pts(P, mark.place);
  // 面はまん中、線はまん中あたりの点の右、点はその場所の右に出す。右はしに近ければ左に出す
  const area = mark.place.area;
  const [x, y] = area
    ? [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length]
    : p[Math.floor((p.length - 1) / 2)];
  const right = x < P.W - 130 * sw;
  return (
    <text
      x={area ? x : x + (right ? 14 : -14) * sw}
      y={y + 6 * sw}
      textAnchor={area ? "middle" : right ? "start" : "end"}
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
