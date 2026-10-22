"use client";

import { useState } from "react";
import { dayKey, type Days } from "@/lib/activity";

// ダッシュボードの「まいにちの記録」：2週間の棒グラフと、月のカレンダー。
// 数は lib/activity.ts の日ごとの記録（2026-10-17 から）。

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const BAR_DAYS = 14;

/** n 日前の Date（その日の 0 時） */
function daysAgo(now: number, n: number) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

const countOf = (days: Days, d: Date) => days[dayKey(d.getTime())]?.n ?? 0;

/** 月曜から数えた、その週の合計。weeksAgo=0 で今週 */
function weekTotal(days: Days, now: number, weeksAgo: number) {
  const fromMonday = (new Date(now).getDay() + 6) % 7;
  const start = fromMonday + weeksAgo * 7;
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const n = start - i;
    if (n >= 0) sum += countOf(days, daysAgo(now, n));
  }
  return sum;
}

export default function DailyChart({ days, now }: { days: Days; now: number }) {
  const today = countOf(days, daysAgo(now, 0));
  return (
    <section className="rounded-2xl border border-line bg-surface p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <h2 className="mr-auto font-bold">まいにちの記録</h2>
        <span className="text-sm text-muted">
          きょう <b className="text-2xl text-ink tabular-nums">{today}</b> 問
        </span>
        <span className="text-sm text-muted">
          今週 <b className="text-lg text-ink tabular-nums">{weekTotal(days, now, 0)}</b> 問
        </span>
        <span className="text-sm text-muted">
          先週 <b className="text-lg text-ink tabular-nums">{weekTotal(days, now, 1)}</b> 問
        </span>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Bars days={days} now={now} />
        <Calendar days={days} now={now} />
      </div>
    </section>
  );
}

/** 2週間の棒グラフ。いちばん右がきょう */
function Bars({ days, now }: { days: Days; now: number }) {
  const list = Array.from({ length: BAR_DAYS }, (_, i) => daysAgo(now, BAR_DAYS - 1 - i));
  const counts = list.map((d) => countOf(days, d));
  const max = Math.max(10, ...counts);
  return (
    <div>
      <div className="flex h-36 items-end gap-1 border-b border-line sm:gap-1.5" role="img" aria-label={`この2週間に解いた数：${list.map((d, i) => `${d.getMonth() + 1}月${d.getDate()}日 ${counts[i]}問`).join("、")}`}>
        {counts.map((n, i) => (
          <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-0.5">
            <span className="text-[10px] text-muted tabular-nums">{n || ""}</span>
            <span
              className={`w-full max-w-7 rounded-t-md ${i === BAR_DAYS - 1 ? "bg-accent" : "bg-accent/40"}`}
              style={{ height: `${(n / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1 sm:gap-1.5" aria-hidden="true">
        {list.map((d, i) => {
          const w = d.getDay();
          const last = i === BAR_DAYS - 1;
          return (
            <div key={i} className="min-w-0 flex-1 text-center text-[10px] leading-tight tabular-nums">
              <div className={last ? "font-bold text-ink" : "text-muted"}>{d.getDate()}</div>
              <div className={last ? "font-bold text-accent" : w === 0 ? "text-ng" : w === 6 ? "text-accent" : "text-muted"}>
                {last ? "今日" : WEEKDAYS[w]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const LEVELS = [
  { min: 30, cls: "bg-accent text-accent-ink" },
  { min: 15, cls: "bg-accent/60 text-accent-ink" },
  { min: 1, cls: "bg-accent/25 text-ink" },
];

/** 月のカレンダー。色の濃さが解いた数 */
function Calendar({ days, now }: { days: Days; now: number }) {
  const base = new Date(now);
  const [offset, setOffset] = useState(0);
  const month = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const y = month.getFullYear();
  const m = month.getMonth();
  const length = new Date(y, m + 1, 0).getDate();
  const todayKey = dayKey(now);

  // 記録のいちばん古い月より前には戻らない
  const first = Object.keys(days).sort()[0];
  const firstMonth = first ? Number(first.slice(0, 4)) * 12 + Number(first.slice(5, 7)) - 1 : base.getFullYear() * 12 + base.getMonth();
  const canPrev = y * 12 + m > firstMonth;

  const cells = Array.from({ length }, (_, i) => {
    const d = new Date(y, m, i + 1);
    const key = dayKey(d.getTime());
    return { day: i + 1, n: days[key]?.n ?? 0, key, future: d.getTime() > now };
  });
  const total = cells.reduce((s, c) => s + c.n, 0);
  const active = cells.filter((c) => c.n > 0).length;

  return (
    <div className="w-full max-w-sm justify-self-center">
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOffset(offset - 1)}
          disabled={!canPrev}
          aria-label="前の月"
          className="size-8 rounded-lg border border-line text-muted transition-colors hover:border-accent/60 disabled:opacity-30"
        >
          ‹
        </button>
        <span className="font-bold tabular-nums">
          {y !== base.getFullYear() && `${y}年 `}
          {m + 1}月
        </span>
        <button
          type="button"
          onClick={() => setOffset(offset + 1)}
          disabled={offset >= 0}
          aria-label="次の月"
          className="size-8 rounded-lg border border-line text-muted transition-colors hover:border-accent/60 disabled:opacity-30"
        >
          ›
        </button>
        <span className="ml-auto text-xs text-muted tabular-nums">
          {total} 問・{active} 日
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={i === 0 ? "text-ng" : i === 6 ? "text-accent" : "text-muted"}>
            {w}
          </div>
        ))}
        {Array.from({ length: month.getDay() }, (_, i) => (
          <div key={`e${i}`} />
        ))}
        {cells.map((c) => {
          const level = LEVELS.find((l) => c.n >= l.min);
          return (
            <div
              key={c.key}
              title={c.future ? undefined : `${m + 1}月${c.day}日 ${c.n}問`}
              className={`flex aspect-square items-center justify-center rounded-md tabular-nums ${
                c.future ? "text-muted/50" : level ? level.cls : "bg-surface-2 text-muted"
              } ${c.key === todayKey ? "ring-2 ring-accent ring-offset-1 ring-offset-surface" : ""}`}
            >
              {c.day}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5 text-[11px] text-muted" aria-hidden="true">
        <span className="size-3 rounded-sm bg-surface-2" />0
        <span className="ml-1 size-3 rounded-sm bg-accent/25" />
        1〜
        <span className="ml-1 size-3 rounded-sm bg-accent/60" />
        15〜
        <span className="ml-1 size-3 rounded-sm bg-accent" />
        30〜
      </div>
    </div>
  );
}
