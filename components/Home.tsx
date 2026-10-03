"use client";

import { useMemo, useState } from "react";
import { QUESTIONS } from "@/data";
import { needsReview, resetProgress, type Progress } from "@/lib/progress";
import { MODE_LABEL, pickQuestions, shuffle, type Filter, type Mode } from "@/lib/session";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  type Category,
  type Difficulty,
} from "@/lib/types";
import { Chip, Section } from "./ui";

const COUNTS = [10, 20, 50, 0];

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export default function Home({
  progress,
  onStart,
  onOpenList,
}: {
  progress: Progress;
  onStart: (ids: string[]) => void;
  onOpenList: () => void;
}) {
  const [filter, setFilter] = useState<Filter>({
    categories: [...CATEGORIES],
    difficulties: [...DIFFICULTIES],
    mode: "all",
    count: 10,
    shuffle: true,
  });

  const stats = useMemo(() => {
    const byCategory = Object.fromEntries(
      CATEGORIES.map((c) => [c, { total: 0, ok: 0, review: 0 }]),
    ) as Record<Category, { total: number; ok: number; review: number }>;
    let seen = 0;
    for (const q of QUESTIONS) {
      const r = progress[q.id];
      const s = byCategory[q.category];
      s.total++;
      if (r) seen++;
      if (r?.grade === "ok") s.ok++;
      if (needsReview(r)) s.review++;
    }
    const review = CATEGORIES.reduce((n, c) => n + byCategory[c].review, 0);
    const ok = CATEGORIES.reduce((n, c) => n + byCategory[c].ok, 0);
    return { byCategory, seen, review, ok };
  }, [progress]);

  const matched = useMemo(
    () => pickQuestions(QUESTIONS, { ...filter, count: 0, shuffle: false }, progress).length,
    [filter, progress],
  );
  const willAsk = filter.count > 0 ? Math.min(filter.count, matched) : matched;

  const reviewIds = QUESTIONS.filter((q) => needsReview(progress[q.id])).map((q) => q.id);

  return (
    <div className="space-y-7">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">社会ドリル</h1>
        <p className="text-sm text-muted">中学受験 社会の一問一答。答えを見て、〇△×で自己採点。</p>
      </header>

      {/* 全体の進み具合 */}
      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="解いた" value={stats.seen} total={QUESTIONS.length} />
        <Stat label="〇 完璧" value={stats.ok} tone="text-ok" />
        <Stat label="要復習" value={stats.review} tone="text-ng" />
      </div>

      {/* クイックスタート */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onStart(shuffle(QUESTIONS).slice(0, 10).map((q) => q.id))}
          className="min-h-16 rounded-2xl bg-accent px-5 py-4 text-left text-accent-ink shadow-sm transition-opacity hover:opacity-90"
        >
          <div className="text-lg font-bold">サクッと10問</div>
          <div className="text-xs opacity-80">全分野からランダム</div>
        </button>
        <button
          type="button"
          disabled={reviewIds.length === 0}
          onClick={() => onStart(shuffle(reviewIds))}
          className="min-h-16 rounded-2xl border-2 border-ng/60 bg-surface px-5 py-4 text-left transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:border-line disabled:opacity-60"
        >
          <div className="text-lg font-bold text-ng">要復習をやり直す</div>
          <div className="text-xs text-muted">
            {reviewIds.length > 0 ? `△・× の ${reviewIds.length} 問` : "まだありません"}
          </div>
        </button>
      </div>

      {/* 条件を選んで演習 */}
      <div className="space-y-6 rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <h2 className="text-base font-bold">条件を選んで演習</h2>

        <Section title="分野">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIES.map((c) => {
              const s = stats.byCategory[c];
              const selected = filter.categories.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setFilter({ ...filter, categories: toggle(filter.categories, c) })}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    selected ? "border-accent bg-accent/10" : "border-line bg-surface opacity-60"
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold">{CATEGORY_LABEL[c]}</span>
                    <span className="text-xs text-muted">{s.total}問</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-ok"
                      style={{ width: `${s.total ? (s.ok / s.total) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-muted">
                    〇{s.ok}　要復習{s.review}
                  </div>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="難易度">
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((d: Difficulty) => (
              <Chip
                key={d}
                selected={filter.difficulties.includes(d)}
                onClick={() => setFilter({ ...filter, difficulties: toggle(filter.difficulties, d) })}
              >
                {DIFFICULTY_LABEL[d]}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="出題">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
              <Chip key={m} selected={filter.mode === m} onClick={() => setFilter({ ...filter, mode: m })}>
                {MODE_LABEL[m]}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="問題数">
          <div className="flex flex-wrap items-center gap-2">
            {COUNTS.map((n) => (
              <Chip key={n} selected={filter.count === n} onClick={() => setFilter({ ...filter, count: n })}>
                {n === 0 ? "全部" : `${n}問`}
              </Chip>
            ))}
            <label className="ml-1 flex min-h-11 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-[var(--accent)]"
                checked={filter.shuffle}
                onChange={(e) => setFilter({ ...filter, shuffle: e.target.checked })}
              />
              順番をシャッフル
            </label>
          </div>
        </Section>

        <button
          type="button"
          disabled={willAsk === 0}
          onClick={() => onStart(pickQuestions(QUESTIONS, filter, progress))}
          className="min-h-14 w-full rounded-2xl bg-accent px-5 text-lg font-bold text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {willAsk === 0 ? "条件に合う問題がありません" : `${willAsk}問 スタート`}
        </button>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 pb-4 text-sm">
        <button type="button" onClick={onOpenList} className="font-semibold text-accent underline-offset-4 hover:underline">
          要復習リストを見る →
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("この端末の学習記録をすべて消します。よろしいですか？")) resetProgress();
          }}
          className="text-xs text-muted underline-offset-4 hover:underline"
        >
          学習記録をリセット
        </button>
      </footer>
    </div>
  );
}

function Stat({ label, value, total, tone }: { label: string; value: number; total?: number; tone?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-3 text-center">
      <div className={`text-2xl font-bold tabular-nums ${tone ?? ""}`}>
        {value}
        {total !== undefined && <span className="text-sm font-semibold text-muted"> / {total}</span>}
      </div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
