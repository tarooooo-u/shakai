"use client";

import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { placeRings, unitsToPlace, type Place } from "@/lib/mapSets";
import { Loupe, MapLayers, getProjection, mapBoxStyle, toMapPoint, useLoupe, type Projection } from "./mapBase";

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
// 面の中をタップしたとき、線・点がこれより近ければ線・点をえらぶ（平野の中の川）。遠ければ面（湖のそばの岬より湖）
const ON_LINE_PX = 12;
// 指でタップしたとき、この距離（画面の px）の中に印が2つ以上あれば、拡大した地図でえらびなおしてもらう
const FINGER_PX = 18;
// 拡大した地図の倍率（地図が小さく出るスマホでは、そのぶん大きくする）
const ZOOM = 3;

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
  // 指の下に印が重なっていたときに出す、拡大した地図のまん中（と、もとの地図の拡大率）
  const [zoom, setZoom] = useState<MapPoint | null>(null);
  const { loupe, update: updateLoupe, hide: hideLoupe } = useLoupe(svg);
  const P = getProjection(extent);
  const size = useMarkSize(svg, P.W);

  const nearest = (e: PointerEvent<SVGSVGElement>) => {
    const pt = toMapPoint(svg.current, e);
    return pt ? hitTest(P, extent, marks, pt, size).best : null;
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
        style={mapBoxStyle(P)}
        // 指でスワイプしたらスクロールする（pointercancel が来て、印はえらばない）
        className={`map-touch mx-auto block touch-pan-y rounded-2xl border border-line ${onPick ? "cursor-pointer" : ""}`}
        onContextMenu={(e) => e.preventDefault()}
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
          setHover(null);
          const pt = toMapPoint(svg.current, e);
          if (!pt) return;
          const hit = hitTest(P, extent, marks, pt, size);
          // 指は太くてねらいがずれやすいので、指の下に印が重なっていたら拡大してえらびなおしてもらう（マウスはそのまま）
          if (e.pointerType !== "mouse" && hit.near >= 2) setZoom(pt);
          else if (hit.best) onPick(hit.best);
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
      {onPick && zoom && (
        <ZoomPicker
          P={P}
          extent={extent}
          marks={marks}
          at={zoom}
          size={size}
          onPick={(id) => {
            setZoom(null);
            onPick(id);
          }}
          onClose={() => setZoom(null)}
        />
      )}
    </>
  );
}

type MapPoint = { x: number; y: number; pxPerUnit: number };

/**
 * 地図の座標 pt にいちばん近い印（HIT_PX より遠ければなし）と、指の下（FINGER_PX の中）にある印の数。
 * 面の中なら、その面（面の中に面があれば小さいほう）。ただし線・点の上（ON_LINE_PX まで）なら線・点
 * （平野の中を流れる川もえらべるように）。点と線では点（山脈の上の山の▲）。size は印の大きさの倍率
 */
function hitTest(P: Projection, extent: string, marks: Mark[], pt: MapPoint, size: number) {
  const finger = FINGER_PX / pt.pxPerUnit;
  let line: string | null = null;
  let lineD = HIT_PX / pt.pxPerUnit;
  let point: string | null = null;
  let pointD = ON_LINE_PX / pt.pxPerUnit;
  let area: string | null = null;
  let areaD = HIT_PX / pt.pxPerUnit;
  let areaSize = Infinity;
  let near = 0;
  for (const { place } of marks) {
    if (!place.area) {
      const d = unitsToPlace(extent, place, pt.x, pt.y);
      if (d <= finger) near++;
      if (d < lineD) [line, lineD] = [place.id, d];
      if (place.coords.length === 1 && d < pointD) [point, pointD] = [place.id, d];
      continue;
    }
    // 小さい面は、まわりの丸の中も面の中とする
    const circle = smallAreaCircle(P, place, size);
    const d = circle ? Math.max(0, Math.hypot(pt.x - circle.cx, pt.y - circle.cy) - circle.r) : unitsToPlace(extent, place, pt.x, pt.y);
    if (d <= finger) near++;
    const s = d === 0 ? boxSize(place) : 0;
    if (d < areaD || (d === 0 && areaD === 0 && s < areaSize)) [area, areaD, areaSize] = [place.id, d, s];
  }
  const best = point ?? (line && (lineD <= ON_LINE_PX / pt.pxPerUnit || areaD > 0) ? line : (area ?? line));
  return { best, near };
}

/**
 * 指の下に印が重なっていたとき（屋久島と宮之浦岳、平野と川など）に出す、拡大した地図。
 * 地形だけ大きくして、印の太さ・大きさはそのままなので、重なっていた印がはなれてえらびやすくなる。
 * 同じ地図を大きくするだけなので、答えのヒントにはならない
 */
function ZoomPicker({
  P,
  extent,
  marks,
  at,
  size,
  onPick,
  onClose,
}: {
  P: Projection;
  extent: string;
  marks: Mark[];
  at: MapPoint;
  size: number;
  onPick: (placeId: string) => void;
  onClose: () => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const down = useRef(false);
  const [opened] = useState(() => Date.now());
  const zoom = ZOOM * Math.sqrt(size);
  const sw = size / zoom;
  const box = Math.min(window.innerWidth - 56, window.innerHeight - 180, 440);
  const view = box / (at.pxPerUnit * zoom);
  const hit = (e: PointerEvent<SVGSVGElement>) => {
    const pt = toMapPoint(svg.current, e);
    return pt ? hitTest(P, extent, marks, pt, sw).best : null;
  };
  const shown = hover ? marks.map((m) => (m.place.id === hover ? { ...m, tone: "target" as const } : m)) : marks;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      // 開いた直後のクリック（さっき指を離したときのもの）ではとじない
      onClick={(e) => e.target === e.currentTarget && Date.now() - opened > 400 && onClose()}
    >
      <div className="space-y-2 rounded-3xl border border-line bg-surface p-3 shadow-xl">
        <div className="flex items-center gap-2" style={{ width: box }}>
          <p className="min-w-0 flex-1 text-sm font-semibold">近くに印がいくつかあるよ。大きくした地図でタップしよう。</p>
          <button type="button" onClick={onClose} className="min-h-11 shrink-0 rounded-xl px-2 text-sm font-semibold text-muted hover:text-ink">
            ✕ もどる
          </button>
        </div>
        <svg
          ref={svg}
          viewBox={`${at.x - view / 2} ${at.y - view / 2} ${view} ${view}`}
          width={box}
          height={box}
          role="img"
          aria-label="大きくした白地図。答えの印をタップする"
          className="block cursor-pointer touch-none rounded-2xl border border-line"
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            down.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            setHover(hit(e));
          }}
          onPointerMove={(e) => setHover(hit(e))}
          onPointerUp={(e) => {
            if (!down.current) return;
            down.current = false;
            const id = hit(e);
            setHover(null);
            if (id) onPick(id);
          }}
          onPointerCancel={() => {
            down.current = false;
            setHover(null);
          }}
          onPointerLeave={() => !down.current && setHover(null)}
        >
          <MapLayers P={P} sw={1 / zoom} />
          <MarkLayer P={P} marks={shown} sw={sw} />
        </svg>
      </div>
    </div>,
    document.body,
  );
}

/** 小さい面に重ねる丸（大きい面なら null） */
function smallAreaCircle(P: Projection, place: Place, sw: number) {
  const p = pts(P, place);
  const xs = p.map((q) => q[0]);
  const ys = p.map((q) => q[1]);
  if (Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) >= 18 * sw) return null;
  return { cx: (Math.max(...xs) + Math.min(...xs)) / 2, cy: (Math.max(...ys) + Math.min(...ys)) / 2, r: 12 * sw };
}

/** 面の大きさのめやす（緯度・経度の囲みの広さ） */
function boxSize(place: Place) {
  const lats = place.coords.map((c) => c.lat);
  const lngs = place.coords.map((c) => c.lng);
  return (Math.max(...lats) - Math.min(...lats)) * (Math.max(...lngs) - Math.min(...lngs));
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
        {place.kind === "岬" ? (
          // 岬は●（火山の▲と区別する）
          <circle cx={cx} cy={cy} r={6.5 * sw} fill={color} stroke="var(--surface)" strokeWidth={1.5 * sw} />
        ) : place.kind === "港" ? (
          // 港は■
          <rect x={cx - 6 * sw} y={cy - 6 * sw} width={12 * sw} height={12 * sw} fill={color} stroke="var(--surface)" strokeWidth={1.5 * sw} />
        ) : (
          <path
            d={`M${cx},${cy - s * 1.15}L${cx - s},${cy + s * 0.7}L${cx + s},${cy + s * 0.7}Z`}
            fill={color}
            stroke="var(--surface)"
            strokeWidth={1.5 * sw}
            strokeLinejoin="round"
          />
        )}
      </g>
    );
  }
  const points = p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  if (place.area) {
    // 小さい面（湖・盆地）は地図の上で点のようになるので、まわりに丸を重ねて目立たせる
    const small = smallAreaCircle(P, place, sw);
    return (
      <g opacity={opacity}>
        {small && (
          <circle
            cx={small.cx}
            cy={small.cy}
            r={small.r}
            fill={color}
            fillOpacity={glow ? 0.25 : 0.08}
            stroke={color}
            strokeWidth={2 * sw}
            strokeDasharray={`${4 * sw} ${3 * sw}`}
            className={tone === "target" ? "animate-pulse" : ""}
          />
        )}
        <path
          d={areaPath(P, place)}
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

/** 面の輪郭（いくつかに分かれていれば全部）を1つのパスにする */
export function areaPath(P: Projection, place: Place) {
  return placeRings(place)
    .map((r) => "M" + r.map(({ lat, lng }) => `${P.x(lng).toFixed(1)},${P.y(lat).toFixed(1)}`).join("L") + "Z")
    .join("");
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
