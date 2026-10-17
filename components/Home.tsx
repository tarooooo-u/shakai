"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { QUESTIONS } from "@/data";
import { loadLastFilter, saveLastFilter } from "@/lib/homeFilter";
import { isActive, isGraduated, needsReview, resetProgress, statusOf, type Progress } from "@/lib/progress";
import { useCurrentProfile } from "@/lib/profiles";
import {
  DEFAULT_FILTER,
  MODE_LABEL,
  MODE_SHORT,
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
  onOpenReview,
}: {
  progress: Progress;
  onStart: (ids: string[], style: Style) => void;
  onOpenList: (title: string, ids: string[]) => void;
  onOpenReview: () => void;
}) {
  const params = useSearchParams();
  const profile = useCurrentProfile();
  // 保護者が送った URL（?u=江戸&n=7 など）で開いたときはその条件、なければ前回スタートした条件を初期値にする
  const [linked] = useState(() => filterFromQuery(new URLSearchParams(params.toString())));
  const [filter, setFilter] = useState<Filter>(() => linked ?? loadLastFilter() ?? DEFAULT_FILTER);
  const [copied, setCopied] = useState(false);
  // 単元・分類・テーマはふだん使わないので、たたんでおく（選んであるときは開く）
  const narrowed = filter.units.length + filter.kinds.length + filter.tags.length > 0;
  const [detailOpen, setDetailOpen] = useState(narrowed);
  const set = (patch: Partial<Filter>) => {
    setFilter({ ...filter, ...patch });
    setCopied(false);
  };

  const stats = useMemo(() => {
    const byCategory = Object.fromEntries(
      CATEGORIES.map((c) => [c, { total: 0, graduated: 0, review: 0 }]),
    ) as Record<Category, { total: number; graduated: number; review: number }>;
    let seen = 0;
    let check = 0;
    for (const q of QUESTIONS) {
      const r = progress[q.id];
      const s = byCategory[q.category];
      s.total++;
      if (r) seen++;
      if (isGraduated(r)) s.graduated++;
      if (needsReview(r)) s.review++;
      if (statusOf(r) === "check") check++;
    }
    const review = CATEGORIES.reduce((n, c) => n + byCategory[c].review, 0);
    const graduated = CATEGORIES.reduce((n, c) => n + byCategory[c].graduated, 0);
    return { byCategory, seen, review, graduated, check };
  }, [progress]);

  const matched = useMemo(() => QUESTIONS.filter((q) => matches(filter, q, progress)), [filter, progress]);
  const willAsk = filter.count > 0 ? Math.min(filter.count, matched.length) : matched.length;
  const reviewIds = QUESTIONS.filter((q) => needsReview(progress[q.id])).map((q) => q.id);
  const activeIds = QUESTIONS.filter((q) => isActive(progress[q.id])).map((q) => q.id);
  const startFiltered = () => {
    saveLastFilter(filter);
    onStart(pickQuestions(QUESTIONS, filter, progress), filter.style);
  };

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
    <div className="space-y-5">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">社会ドリル</h1>
        {/* 全体の進み具合 */}
        <div className="flex gap-4 text-sm text-muted">
          <span>
            解いた <b className="text-base text-ink tabular-nums">{stats.seen}</b>/{QUESTIONS.length}
          </span>
          <span>
            卒業 <b className="text-base text-ok tabular-nums">{stats.graduated}</b>
          </span>
          <span>
            要復習 <b className="text-base text-ng tabular-nums">{stats.review}</b>
          </span>
        </div>
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

      {/* クイックスタート */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          disabled={activeIds.length === 0}
          onClick={() => onStart(shuffle(activeIds).slice(0, 7), "card")}
          className="rounded-2xl bg-accent px-4 py-3 text-left text-accent-ink shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <div className="font-bold sm:text-lg">{activeIds.length > 0 ? "サクッと7問" : "全部卒業！"}</div>
          <div className="text-xs opacity-80">
            {activeIds.length > 0
              ? `卒業していない ${activeIds.length}問から${stats.check > 0 ? `（確認 ${stats.check}問）` : ""}`
              : "「卒業もふくめて全部」で復習できます"}
          </div>
        </button>
        <button
          type="button"
          disabled={reviewIds.length === 0}
          onClick={() => onStart(shuffle(reviewIds), "card")}
          className="rounded-2xl border-2 border-ng/60 bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:border-line disabled:opacity-60"
        >
          <div className="font-bold text-ng sm:text-lg">要復習をやり直す</div>
          <div className="text-xs text-muted">{reviewIds.length > 0 ? `△・× の ${reviewIds.length} 問` : "まだありません"}</div>
        </button>
      </div>

      {/* 条件を選んで演習。よく使うものを上に、iPad ならスクロールなしでスタートまで届くように */}
      <div className="space-y-3.5 rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <h2 className="text-base font-bold">条件を選んで演習</h2>

        <Row title="分野">
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
                  className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                    selected ? "border-accent bg-accent/10" : "border-line bg-surface opacity-60"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="font-bold">{CATEGORY_LABEL[c]}</span>
                    <span className="text-[11px] text-muted">
                      卒業{s.graduated}/{s.total}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-ok"
                      style={{ width: `${s.total ? (s.graduated / s.total) * 100 : 0}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </Row>

        <Row title="難易度">
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
        </Row>

        <Row title="出題">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(MODE_SHORT) as Mode[]).map((m) => (
              <Chip key={m} selected={filter.mode === m} onClick={() => set({ mode: m })}>
                {MODE_SHORT[m]}
              </Chip>
            ))}
          </div>
        </Row>

        <Row title="問題数">
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
              シャッフル
            </label>
          </div>
        </Row>

        <Row title="解き方">
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(STYLE_LABEL) as Style[]).map((s) => (
              <Chip key={s} selected={filter.style === s} onClick={() => set({ style: s })}>
                {STYLE_LABEL[s]}
              </Chip>
            ))}
            {filter.style === "choice" && (
              <span className="text-xs text-muted">選択肢のない問題はカードで出ます</span>
            )}
          </div>
        </Row>

        {/* くわしく選ぶ（単元・分類・テーマ） */}
        <div className="rounded-xl border border-line">
          <div className="flex items-center gap-2 pr-2">
            <button
              type="button"
              aria-expanded={detailOpen}
              onClick={() => setDetailOpen(!detailOpen)}
              className="flex min-h-11 min-w-0 flex-1 items-center gap-2 px-3 text-left text-sm"
            >
              <span className="text-muted">{detailOpen ? "▾" : "▸"}</span>
              <span className="shrink-0 font-bold">くわしく選ぶ</span>
              <span className="min-w-0 flex-1 truncate text-xs text-muted">
                {narrowed ? <span className="font-semibold text-accent">{describeDetail(filter)}</span> : "単元・分類・テーマ"}
              </span>
            </button>
            {narrowed && (
              <button
                type="button"
                onClick={() => set({ units: [], kinds: [], tags: [] })}
                className="min-h-9 shrink-0 rounded-lg border border-line px-2.5 text-xs font-semibold text-muted hover:text-ink"
              >
                解除
              </button>
            )}
          </div>
          {detailOpen && (
            <div className="space-y-5 border-t border-line p-3">
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
            </div>
          )}
        </div>

        {/* スタートは画面の下に固定（くわしく選ぶを開いても押せるように） */}
        <div className="sticky bottom-0 z-10 -mx-4 bg-surface/95 px-4 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-5 sm:px-5">
          <button
            type="button"
            disabled={willAsk === 0}
            onClick={startFiltered}
            className="min-h-14 w-full rounded-2xl bg-accent px-5 text-lg font-bold text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {willAsk === 0 ? "条件に合う問題がありません" : `${willAsk}問 スタート`}
          </button>
        </div>

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
            className="min-h-11 rounded-xl border border-line bg-surface px-4 text-sm font-bold transition-colors hover:bg-surface-2 disabled:opacity-40"
          >
            一覧で見る（おうちの人が出題）
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="min-h-11 rounded-xl border border-line bg-surface px-4 text-sm font-bold transition-colors hover:bg-surface-2"
          >
            {copied ? "✓ URLをコピーしました" : "この条件のURLをコピー"}
          </button>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 pb-4 text-sm">
        <button
          type="button"
          onClick={onOpenReview}
          className="font-semibold text-accent underline-offset-4 hover:underline"
        >
          要復習リストを見る →
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`${profile?.name ?? ""}さんの学習記録をすべて消します。よろしいですか？`)) resetProgress();
          }}
          className="text-xs text-muted underline-offset-4 hover:underline"
        >
          学習記録をリセット
        </button>
        <p className="w-full text-xs text-muted">
          答えを見て〇△×で自己採点、または4択で。2回続けて〇なら「卒業」です。
        </p>
        <p className="w-full text-[11px] leading-relaxed text-muted">
          統計データの一部は、政府統計総合窓口(e-Stat)のAPI機能を使用して取得しています。サービスの内容は国によって保証されたものではありません。雨温図は気象庁の平年値（1991〜2020年）をもとに作成しています（出典：気象庁ホームページ）。
        </p>
      </footer>
    </div>
  );
}

/** 見出しを左、ボタンを右に並べる（せまい画面では上下） */
function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5 sm:grid sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:items-center sm:gap-3 sm:space-y-0">
      <h3 className="text-xs font-bold tracking-wider text-muted">{title}</h3>
      {children}
    </section>
  );
}

/** くわしく選んだ条件を短く */
function describeDetail(f: Filter) {
  return [f.units.join("・"), f.kinds.join("・"), f.tags.length > 0 && `テーマ：${f.tags.join("・")}`].filter(Boolean).join(" ／ ");
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
