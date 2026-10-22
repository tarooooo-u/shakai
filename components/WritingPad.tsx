"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * 手書きの欄（Apple Pencil・指・マウス）。8マス×2行のマス目をうすく引く。
 * 線は欄の横はばを 1 とした座標で持つので、iPad を回して大きさが変わっても同じ形のまま。
 * 一度ペンで書いたら、指（手のひら）がふれても線にしない。
 */

/** 1画の点。x・y は横はばを 1 とした位置、w は太さの倍率 */
export type Stroke = { x: number; y: number; w: number }[];

export const PAD_COLS = 8;
const PAD_ROWS = 2;

/** お手本の字（教科書体があれば教科書体、なければ明朝） */
export const MODEL_FONT = '"UD Digi Kyokasho N-R", "UD デジタル 教科書体 N-R", "YuKyokasho", "Hiragino Mincho ProN", "Yu Mincho", "BIZ UDMincho", serif';

function cssVar(el: Element, name: string) {
  return getComputedStyle(el).getPropertyValue(name).trim() || "#888";
}

export default function WritingPad({
  strokes,
  onChange,
  readOnly = false,
}: {
  strokes: Stroke[];
  onChange?: (strokes: Stroke[]) => void;
  readOnly?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const current = useRef<Stroke | null>(null);
  const pointerId = useRef<number | null>(null);
  const penUsed = useRef(false);
  const strokesRef = useRef(strokes);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // マス目（外わくと、マスの中の十字の点線）
    const cell = width / PAD_COLS;
    ctx.strokeStyle = cssVar(canvas, "--line");
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    for (let c = 1; c < PAD_COLS; c++) line(ctx, c * cell, 0, c * cell, height);
    for (let r = 1; r < PAD_ROWS; r++) line(ctx, 0, r * cell, width, r * cell);
    ctx.setLineDash([3, 4]);
    for (let c = 0; c < PAD_COLS; c++) line(ctx, (c + 0.5) * cell, 0, (c + 0.5) * cell, height);
    for (let r = 0; r < PAD_ROWS; r++) line(ctx, 0, (r + 0.5) * cell, width, (r + 0.5) * cell);
    ctx.setLineDash([]);

    // 書いた線
    ctx.strokeStyle = ctx.fillStyle = cssVar(canvas, "--ink");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const base = cell * 0.075;
    const all = current.current ? [...strokesRef.current, current.current] : strokesRef.current;
    for (const s of all) {
      if (s.length === 1) {
        ctx.beginPath();
        ctx.arc(s[0].x * width, s[0].y * width, (base * s[0].w) / 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      // となりの点の中間を通る曲線にして、なめらかにする
      for (let i = 1; i < s.length; i++) {
        const p0 = s[i - 1];
        const p1 = s[i];
        const from = i === 1 ? p0 : mid(s[i - 2], p0);
        const to = i === s.length - 1 ? p1 : mid(p0, p1);
        ctx.lineWidth = base * (p0.w + p1.w) * 0.5;
        ctx.beginPath();
        ctx.moveTo(from.x * width, from.y * width);
        ctx.quadraticCurveTo(p0.x * width, p0.y * width, to.x * width, to.y * width);
        ctx.stroke();
      }
    }
  }, []);

  // 大きさが変わったとき・線が変わったとき・ダークモードの切りかえで描き直す
  useEffect(() => {
    strokesRef.current = strokes;
    draw();
  }, [draw, strokes]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", draw);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", draw);
    };
  }, [draw]);

  const toPoint = (e: PointerEvent | React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    // ペンは筆圧で太さを変える（指・マウスは同じ太さ）
    const w = e.pointerType === "pen" && e.pressure > 0 ? 0.55 + e.pressure * 0.9 : 1;
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.width, w };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly || pointerId.current !== null) return;
    if (e.pointerType === "pen") penUsed.current = true;
    else if (e.pointerType === "touch" && penUsed.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerId.current = e.pointerId;
    current.current = [toPoint(e)];
    draw();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerId !== pointerId.current || !current.current) return;
    e.preventDefault();
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    for (const ev of events.length ? events : [e.nativeEvent]) current.current.push(toPoint(ev));
    draw();
  };

  const finish = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerId !== pointerId.current) return;
    pointerId.current = null;
    const stroke = current.current;
    current.current = null;
    if (stroke) onChange?.([...strokesRef.current, stroke]);
  };

  return (
    <div className="space-y-2">
      <div
        className={`map-touch relative overflow-hidden rounded-2xl border-2 bg-surface ${readOnly ? "border-line" : "border-accent/50"}`}
        style={{ aspectRatio: `${PAD_COLS} / ${PAD_ROWS}` }}
      >
        <canvas
          ref={canvasRef}
          aria-label={readOnly ? "きみが書いた答え" : "答えを書く欄"}
          className={`absolute inset-0 size-full ${readOnly ? "" : "cursor-crosshair touch-none"}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finish}
          onPointerCancel={finish}
          onContextMenu={(e) => e.preventDefault()}
        />
        {!readOnly && strokes.length === 0 && (
          <span className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs text-muted">ここに答えを書こう</span>
        )}
      </div>
      {!readOnly && (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={strokes.length === 0}
            onClick={() => onChange?.(strokes.slice(0, -1))}
            className="min-h-11 rounded-xl border border-line bg-surface px-4 text-sm font-semibold hover:bg-surface-2 disabled:opacity-40"
          >
            ↶ 1画もどす
          </button>
          <button
            type="button"
            disabled={strokes.length === 0}
            onClick={() => onChange?.([])}
            className="min-h-11 rounded-xl border border-line bg-surface px-4 text-sm font-semibold hover:bg-surface-2 disabled:opacity-40"
          >
            ぜんぶ消す
          </button>
        </div>
      )}
    </div>
  );
}

function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

const mid = (a: Stroke[number], b: Stroke[number]) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, w: (a.w + b.w) / 2 });

/**
 * お手本。書く欄と同じ大きさのマス目に1字ずつ入れて、見くらべやすくする。
 * mark の字（書きまちがえやすい字）は赤くする
 */
export function ModelAnswer({ text, mark = "" }: { text: string; mark?: string }) {
  const chars = [...text];
  const rows = Math.max(1, Math.ceil(chars.length / PAD_COLS));
  return (
    <div
      className="grid overflow-hidden rounded-2xl border-2 border-ok/60 bg-surface"
      style={{ gridTemplateColumns: `repeat(${PAD_COLS}, minmax(0, 1fr))`, containerType: "inline-size" }}
      aria-label={`お手本：${text}`}
    >
      {Array.from({ length: rows * PAD_COLS }, (_, i) => {
        const c = chars[i] ?? "";
        return (
          <span
            key={i}
            aria-hidden="true"
            className={`flex aspect-square items-center justify-center border-line leading-none ${i % PAD_COLS ? "border-l" : ""} ${i >= PAD_COLS ? "border-t" : ""} ${mark.includes(c) && c ? "text-ng" : "text-ink"}`}
            style={{ fontFamily: MODEL_FONT, fontSize: `calc(100cqw / ${PAD_COLS} * 0.74)` }}
          >
            {c}
          </span>
        );
      })}
    </div>
  );
}
