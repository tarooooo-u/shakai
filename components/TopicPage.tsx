"use client";

import { useMemo, useState } from "react";
import { needsReview, type Progress } from "@/lib/progress";
import { STYLE_LABEL, shuffle, type Style } from "@/lib/session";
import type { Question } from "@/lib/types";
import { Chip, Section, SmallChip } from "./ui";

const COUNTS = [7, 10, 20, 0];

/** 分野（歴史・地理・公民）やテーマ（漢字・白地図など）ごとの画面 */
export default function TopicPage({
  label,
  title,
  questions,
  unitOrder,
  progress,
  onStart,
  onOpenList,
}: {
  /** 「分野」「テーマ」 */
  label: string;
  title: string;
  questions: Question[];
  /** 単元の並び順（content/units.json の順） */
  unitOrder: string[];
  progress: Progress;
  onStart: (ids: string[], style: Style) => void;
  onOpenList: (title: string, ids: string[]) => void;
}) {
  const [units, setUnits] = useState<string[]>([]);
  const [style, setStyle] = useState<Style>("card");
  const [count, setCount] = useState(7);

  const unitCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of questions) m.set(q.unit, (m.get(q.unit) ?? 0) + 1);
    return [...m].sort((a, b) => unitOrder.indexOf(a[0]) - unitOrder.indexOf(b[0]));
  }, [questions, unitOrder]);

  const ok = questions.filter((q) => progress[q.id]?.grade === "ok").length;
  const review = questions.filter((q) => needsReview(progress[q.id]));
  const pool = units.length ? questions.filter((q) => units.includes(q.unit)) : questions;
  const willAsk = count ? Math.min(count, pool.length) : pool.length;
  const pick = (list: Question[], n: number) => shuffle(list.map((q) => q.id)).slice(0, n || undefined);
  const toggleUnit = (u: string) => setUnits(units.includes(u) ? units.filter((x) => x !== u) : [...units, u]);

  return (
    <div className="space-y-7">
      <header>
        <div className="text-xs font-bold tracking-wider text-muted">{label}</div>
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          <span className="text-sm text-muted">
            {questions.length}問 ／ 〇 {ok}　要復習 {review.length}
          </span>
        </div>
      </header>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onStart(pick(questions, 7), style)}
          className="min-h-16 rounded-2xl bg-accent px-5 py-4 text-left text-accent-ink shadow-sm transition-opacity hover:opacity-90"
        >
          <div className="text-lg font-bold">{title}から7問</div>
          <div className="text-xs opacity-80">ランダム・{STYLE_LABEL[style]}</div>
        </button>
        <button
          type="button"
          disabled={review.length === 0}
          onClick={() => onStart(pick(review, 0), style)}
          className="min-h-16 rounded-2xl border-2 border-ng/60 bg-surface px-5 py-4 text-left transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:border-line disabled:opacity-60"
        >
          <div className="text-lg font-bold text-ng">{title}の要復習</div>
          <div className="text-xs text-muted">{review.length > 0 ? `△・× の ${review.length}問` : "まだありません"}</div>
        </button>
      </div>

      <div className="space-y-6 rounded-2xl border border-line bg-surface p-4 sm:p-6">
        {unitCounts.length > 1 && (
          <Section title="単元（選ばなければ全部）">
            <div className="flex flex-wrap gap-1.5">
              {unitCounts.map(([u, n]) => (
                <SmallChip key={u} selected={units.includes(u)} onClick={() => toggleUnit(u)}>
                  {u}
                  <span className="ml-1 opacity-60">{n}</span>
                </SmallChip>
              ))}
            </div>
          </Section>
        )}

        <Section title="解き方">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STYLE_LABEL) as Style[]).map((s) => (
              <Chip key={s} selected={style === s} onClick={() => setStyle(s)}>
                {STYLE_LABEL[s]}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="問題数">
          <div className="flex flex-wrap gap-2">
            {COUNTS.map((n) => (
              <Chip key={n} selected={count === n} onClick={() => setCount(n)}>
                {n === 0 ? "全部" : `${n}問`}
              </Chip>
            ))}
          </div>
        </Section>

        <div className="space-y-2.5">
          <button
            type="button"
            disabled={willAsk === 0}
            onClick={() => onStart(pick(pool, count), style)}
            className="min-h-14 w-full rounded-2xl bg-accent px-5 text-lg font-bold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {willAsk}問 スタート
          </button>
          <button
            type="button"
            onClick={() =>
              onOpenList(
                units.length ? `${title}（${units.join("・")}）` : title,
                pool.map((q) => q.id),
              )
            }
            className="min-h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm font-bold transition-colors hover:bg-surface-2"
          >
            問題と答えの一覧で見る
          </button>
        </div>
      </div>
    </div>
  );
}
