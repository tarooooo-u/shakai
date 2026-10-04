"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QUESTIONS } from "@/data";
import { needsReview, resetProgress, type Progress } from "@/lib/progress";
import {
  DEFAULT_FILTER,
  MODE_LABEL,
  STYLE_LABEL,
  filterFromQuery,
  filterToQuery,
  matches,
  pickQuestions,
  shuffle,
  type Filter,
  type Mode,
  type Style,
} from "@/lib/session";
import { CATEGORIES, CATEGORY_LABEL, DIFFICULTIES, DIFFICULTY_LABEL, UNITS, type Category } from "@/lib/types";
import { Chip, Section, SmallChip } from "./ui";

const COUNTS = [7, 10, 20, 50, 0];

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function countBy(key: (q: (typeof QUESTIONS)[number]) => string[]) {
  const m = new Map<string, number>();
  for (const q of QUESTIONS) for (const k of key(q)) m.set(k, (m.get(k) ?? 0) + 1);
  return m;
}
const UNIT_COUNT = countBy((q) => [q.unit]);
const KIND_COUNT = [...countBy((q) => (q.kind ? [q.kind] : []))];
const TAG_COUNT = [...countBy((q) => q.tags)].sort((a, b) => b[1] - a[1]);

export default function Home({
  progress,
  onStart,
  onOpenList,
}: {
  progress: Progress;
  onStart: (ids: string[], style: Style) => void;
  onOpenList: (title: string, ids: string[]) => void;
}) {
  const params = useSearchParams();
  // 保護者が送った URL（?u=江戸&n=7 など）で開いたときはその条件を初期値にする
  const [linked] = useState(() => filterFromQuery(new URLSearchParams(params.toString())));
  const [filter, setFilter] = useState<Filter>(linked ?? DEFAULT_FILTER);
  const [copied, setCopied] = useState(false);
  const set = (patch: Partial<Filter>) => {
    setFilter({ ...filter, ...patch });
    setCopied(false);
  };

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

  const matched = useMemo(() => QUESTIONS.filter((q) => matches(filter, q, progress)), [filter, progress]);
  const willAsk = filter.count > 0 ? Math.min(filter.count, matched.length) : matched.length;
  const reviewIds = QUESTIONS.filter((q) => needsReview(progress[q.id])).map((q) => q.id);
  const startFiltered = () => onStart(pickQuestions(QUESTIONS, filter, progress), filter.style);

  const copyLink = async () => {
    const query = filterToQuery(filter);
    const url = `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ""}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("このURLをコピーして送ってください", url);
    }
  };

  return (
    <div className="space-y-7">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">社会ドリル</h1>
        <p className="text-sm text-muted">中学受験 社会の一問一答。答えを見て〇△×で自己採点、または4択で。</p>
      </header>

      {linked && (
        <div className="rounded-2xl border-2 border-accent/50 bg-accent/10 p-4">
          <p className="text-sm font-bold">おうちの人が選んだ範囲です</p>
          <p className="mt-1 text-xs text-muted">{describe(linked)}</p>
          <button
            type="button"
            disabled={willAsk === 0}
            onClick={startFiltered}
            className="mt-3 min-h-12 w-full rounded-xl bg-accent font-bold text-accent-ink disabled:opacity-40"
          >
            {willAsk === 0 ? "条件に合う問題がありません" : `${willAsk}問 スタート`}
          </button>
        </div>
      )}

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
          onClick={() => onStart(shuffle(QUESTIONS).slice(0, 7).map((q) => q.id), "card")}
          className="min-h-16 rounded-2xl bg-accent px-5 py-4 text-left text-accent-ink shadow-sm transition-opacity hover:opacity-90"
        >
          <div className="text-lg font-bold">サクッと7問</div>
          <div className="text-xs opacity-80">全分野からランダム</div>
        </button>
        <button
          type="button"
          disabled={reviewIds.length === 0}
          onClick={() => onStart(shuffle(reviewIds), "card")}
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
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((c) => {
              const s = stats.byCategory[c];
              const selected = filter.categories.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    set({
                      categories: toggle(filter.categories, c),
                      // 外した分野の単元選択は消す
                      units: selected ? filter.units.filter((u) => !UNITS[c].includes(u)) : filter.units,
                    })
                  }
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    selected ? "border-accent bg-accent/10" : "border-line bg-surface opacity-60"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-1">
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

        {filter.categories.length > 0 && (
          <Section title="単元（選ばなければ全部）">
            <div className="space-y-3">
              {CATEGORIES.filter((c) => filter.categories.includes(c)).map((c) => (
                <div key={c} className="flex flex-wrap gap-1.5">
                  {UNITS[c]
                    .filter((u) => UNIT_COUNT.has(u))
                    .map((u) => (
                      <SmallChip
                        key={u}
                        selected={filter.units.includes(u)}
                        onClick={() => set({ units: toggle(filter.units, u) })}
                      >
                        {u}
                        <span className="ml-1 opacity-60">{UNIT_COUNT.get(u)}</span>
                      </SmallChip>
                    ))}
                </div>
              ))}
            </div>
          </Section>
        )}

        {KIND_COUNT.length > 0 && (
          <Section title="分類（選ばなければ全部）">
            <div className="flex flex-wrap gap-1.5">
              {KIND_COUNT.map(([k, n]) => (
                <SmallChip key={k} selected={filter.kinds.includes(k)} onClick={() => set({ kinds: toggle(filter.kinds, k) })}>
                  {k}
                  <span className="ml-1 opacity-60">{n}</span>
                </SmallChip>
              ))}
            </div>
          </Section>
        )}

        <Section title="難易度">
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((d) => (
              <Chip
                key={d}
                selected={filter.difficulties.includes(d)}
                onClick={() => set({ difficulties: toggle(filter.difficulties, d) })}
              >
                {DIFFICULTY_LABEL[d]}
              </Chip>
            ))}
          </div>
        </Section>

        {TAG_COUNT.length > 0 && (
          <Section title="テーマ（選ばなければ全部）">
            <div className="flex flex-wrap gap-1.5">
              {TAG_COUNT.map(([t, n]) => (
                <SmallChip key={t} selected={filter.tags.includes(t)} onClick={() => set({ tags: toggle(filter.tags, t) })}>
                  {t}
                  <span className="ml-1 opacity-60">{n}</span>
                </SmallChip>
              ))}
            </div>
          </Section>
        )}

        <Section title="出題">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
              <Chip key={m} selected={filter.mode === m} onClick={() => set({ mode: m })}>
                {MODE_LABEL[m]}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="解き方">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STYLE_LABEL) as Style[]).map((s) => (
              <Chip key={s} selected={filter.style === s} onClick={() => set({ style: s })}>
                {STYLE_LABEL[s]}
              </Chip>
            ))}
          </div>
          {filter.style === "choice" && (
            <p className="text-xs text-muted">選択肢のない問題（「すべて答えよ」など）はカードで出ます。</p>
          )}
        </Section>

        <Section title="問題数">
          <div className="flex flex-wrap items-center gap-2">
            {COUNTS.map((n) => (
              <Chip key={n} selected={filter.count === n} onClick={() => set({ count: n })}>
                {n === 0 ? "全部" : `${n}問`}
              </Chip>
            ))}
            <label className="ml-1 flex min-h-11 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-[var(--accent)]"
                checked={filter.shuffle}
                onChange={(e) => set({ shuffle: e.target.checked })}
              />
              順番をシャッフル
            </label>
          </div>
        </Section>

        <div className="space-y-2.5">
          <button
            type="button"
            disabled={willAsk === 0}
            onClick={startFiltered}
            className="min-h-14 w-full rounded-2xl bg-accent px-5 text-lg font-bold text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {willAsk === 0 ? "条件に合う問題がありません" : `${willAsk}問 スタート`}
          </button>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              disabled={matched.length === 0}
              onClick={() =>
                onOpenList(
                  "問題と答えの一覧",
                  matched.map((q) => q.id),
                )
              }
              className="min-h-12 rounded-2xl border border-line bg-surface px-4 text-sm font-bold transition-colors hover:bg-surface-2 disabled:opacity-40"
            >
              一覧で見る（おうちの人が出題）
            </button>
            <button
              type="button"
              onClick={copyLink}
              className="min-h-12 rounded-2xl border border-line bg-surface px-4 text-sm font-bold transition-colors hover:bg-surface-2"
            >
              {copied ? "✓ URLをコピーしました" : "この条件のURLをコピー"}
            </button>
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 pb-4 text-sm">
        <button
          type="button"
          onClick={() => onOpenList("要復習リスト", reviewIds)}
          className="font-semibold text-accent underline-offset-4 hover:underline"
        >
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
        <p className="w-full text-[11px] leading-relaxed text-muted">
          統計データの一部は、政府統計総合窓口(e-Stat)のAPI機能を使用して取得しています。サービスの内容は国によって保証されたものではありません。
        </p>
      </footer>
    </div>
  );
}

/** 共有リンクの条件を人が読める形に */
function describe(f: Filter) {
  return [
    f.units.length ? f.units.join("・") : f.categories.map((c) => CATEGORY_LABEL[c]).join("・"),
    f.kinds.length > 0 && f.kinds.join("・"),
    f.difficulties.length !== DIFFICULTIES.length && f.difficulties.map((d) => DIFFICULTY_LABEL[d]).join("・"),
    f.tags.length > 0 && `テーマ：${f.tags.join("・")}`,
    f.mode !== "all" && MODE_LABEL[f.mode],
    STYLE_LABEL[f.style],
    f.count ? `${f.count}問` : "全部",
  ]
    .filter(Boolean)
    .join(" ／ ");
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
