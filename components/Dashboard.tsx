"use client";

import { useMemo, useState } from "react";
import { MAP_SETS, QUESTIONS, SHEETS } from "@/data";
import unitGroups from "@/content/unit-groups.json";
import { streakDays, useDays } from "@/lib/activity";
import { createLocalStore } from "@/lib/localStore";
import { MAP_MODE_LABEL, setProgress, type MapMode } from "@/lib/mapSets";
import { isGraduated, needsReview, type Progress, type QuestionRecord } from "@/lib/progress";
import { ngCount, sheetKey, useSheetProgress } from "@/lib/sheets";
import { CATEGORIES, CATEGORY_LABEL, type Category } from "@/lib/types";

// 入試の日（カウントダウン用）
const EXAM_DATE = new Date(2027, 1, 1);
const DAY = 24 * 60 * 60 * 1000;

type Tab = Category | "maps" | "sheets";
const TABS: { id: Tab; label: string }[] = [
  ...CATEGORIES.map((c) => ({ id: c as Tab, label: CATEGORY_LABEL[c] })),
  { id: "maps", label: "白地図" },
  { id: "sheets", label: "データ" },
];
// 前に見ていたタブを覚えておく
const tabStore = createLocalStore<Tab>("shakai-dashboard-tab", "history");

const GROUPS = unitGroups as Record<Category, { label: string; units: string[] }[]>;
const MODES: MapMode[] = ["pick", "name", "locate"];

/** 問題1つの状態：卒業・練習中（確認の時期をふくむ）・要復習・まだ */
type Part = "graduated" | "learning" | "review" | "new";
function partOf(r: QuestionRecord | undefined): Part {
  if (!r) return "new";
  if (isGraduated(r)) return "graduated";
  if (needsReview(r)) return "review";
  return "learning";
}
type Count = Record<Part, number> & { total: number };
const emptyCount = (): Count => ({ graduated: 0, learning: 0, review: 0, new: 0, total: 0 });

const PART_COLOR: Record<Exclude<Part, "new">, string> = {
  graduated: "bg-ok",
  learning: "bg-accent/45",
  review: "bg-ng",
};
const PART_LABEL: Record<Part, string> = { graduated: "卒業", learning: "練習中", review: "要復習", new: "まだ" };

/** 学習の進み具合をまとめて見る画面 */
export default function Dashboard({
  progress,
  onStartUnit,
  onOpenMaps,
  onOpenSheet,
}: {
  progress: Progress;
  onStartUnit: (category: Category, unit: string) => void;
  onOpenMaps: () => void;
  onOpenSheet: (id: string) => void;
}) {
  // 開いたときの時刻（れんぞく日数・入試までの日数に使う）
  const [now] = useState(() => Date.now());
  const days = useDays();
  const sheetProgress = useSheetProgress();
  const stored = tabStore.use();
  const tab = TABS.some((t) => t.id === stored) ? stored : "history";

  const { byUnit, byCategory, total } = useMemo(() => {
    const byUnit = new Map<string, Count>();
    const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, emptyCount()])) as Record<Category, Count>;
    const total = emptyCount();
    for (const q of QUESTIONS) {
      const part = partOf(progress[q.id]);
      const unit = (key: string) => {
        if (!byUnit.has(key)) byUnit.set(key, emptyCount());
        return byUnit.get(key)!;
      };
      const counts = [unit(`${q.category}/${q.unit}`), byCategory[q.category], total];
      // 時事テーマのある問題は、時事のほうにも数える（全体の数は1回だけ）
      if (q.jiji && q.category !== "current") counts.push(unit(`current/${q.jiji}`), byCategory.current);
      for (const c of counts) {
        c[part]++;
        c.total++;
      }
    }
    return { byUnit, byCategory, total };
  }, [progress]);

  const streak = streakDays(
    days,
    Object.values(progress).map((r) => r.last),
    now,
  );
  const left = Math.ceil((EXAM_DATE.getTime() - now) / DAY);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">ダッシュボード</h1>
        {left > 0 && (
          <p className="text-sm text-muted">
            入試まで あと <b className="text-xl text-ink tabular-nums">{left}</b> 日
          </p>
        )}
      </header>

      {/* 全体の数字 */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="解いた" value={total.total - total.new} sub={`/ ${total.total}`} />
        <Stat label="卒業" value={total.graduated} tone="text-ok" />
        <Stat label="要復習" value={total.review} tone="text-ng" />
        <Stat label="れんぞく" value={streak} sub="日" tone="text-unsure" />
      </div>

      {/* 分野ごとの卒業率 */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {CATEGORIES.map((c) => (
          <Ring key={c} label={CATEGORY_LABEL[c]} count={byCategory[c]} onClick={() => tabStore.set(c)} active={tab === c} />
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tab === t.id}
              onClick={() => tabStore.set(t.id)}
              className={`min-h-10 rounded-xl border px-3.5 text-sm font-semibold transition-colors ${
                tab === t.id ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface hover:border-accent/60"
              }`}
            >
              {t.label}
            </button>
          ))}
          {tab !== "sheets" && <Legend />}
        </div>

        <div className="rounded-2xl border border-line bg-surface p-3 sm:p-4">
          {tab === "maps" ? (
            <MapRows progress={progress} onOpen={onOpenMaps} />
          ) : tab === "sheets" ? (
            <SheetRows progress={sheetProgress} onOpen={onOpenSheet} />
          ) : (
            GROUPS[tab].map((g, gi) => (
              <section key={g.label} className={gi > 0 ? "mt-4" : ""}>
                {GROUPS[tab].length > 1 && <h2 className="mb-1 px-2 text-xs font-bold tracking-wider text-muted">{g.label}</h2>}
                {g.units.map((u) => {
                  const c = byUnit.get(`${tab}/${u}`) ?? emptyCount();
                  return (
                    <Row
                      key={u}
                      label={u}
                      count={c}
                      note={`卒業 ${c.graduated}/${c.total}`}
                      disabled={c.total === 0}
                      onClick={() => onStartUnit(tab, u)}
                    />
                  );
                })}
              </section>
            ))
          )}
        </div>
        <p className="text-xs text-muted">
          {tab === "maps"
            ? "行をタップすると、白地図ドリルの画面へ。棒は答え方ごとの卒業の数です。"
            : tab === "sheets"
              ? "行をタップすると、そのデータを開きます。× は、めくって × をつけた所の数です。"
              : "行をタップすると、その単元の卒業していない問題をすぐ始めます（難易度・問題数・解き方はホームで前に選んだもの）。"}
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: number; sub?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${tone ?? ""}`}>
        {value.toLocaleString()}
        {sub && <span className="ml-1 text-sm font-semibold text-muted">{sub}</span>}
      </div>
    </div>
  );
}

/** 卒業率のリング。内側の細い輪は、練習中・要復習もふくめた「解いた」割合 */
function Ring({ label, count, onClick, active }: { label: string; count: Count; onClick: () => void; active: boolean }) {
  const r = 26;
  const C = 2 * Math.PI * r;
  const grad = count.total ? count.graduated / count.total : 0;
  const seen = count.total ? (count.total - count.new) / count.total : 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-2xl border bg-surface px-3 py-3 text-left transition-colors hover:border-accent/60 ${
        active ? "border-accent" : "border-line"
      }`}
    >
      <svg viewBox="0 0 64 64" className="size-12 shrink-0 lg:size-16" role="img" aria-label={`${label} 卒業 ${Math.round(grad * 100)}%`}>
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="7" />
        <circle cx="32" cy="32" r={r - 7} fill="none" stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="2.5" strokeDasharray={`${(2 * Math.PI * (r - 7) * seen).toFixed(1)} 999`} transform="rotate(-90 32 32)" />
        {grad > 0 && (
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--ok)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(C * grad).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 32 32)" />
        )}
        <text x="32" y="37" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--ink)">
          {Math.round(grad * 100)}%
        </text>
      </svg>
      <div className="min-w-0">
        <div className="font-bold">{label}</div>
        <div className="text-[11px] whitespace-nowrap text-muted tabular-nums">
          卒業 {count.graduated}/{count.total}
        </div>
        <div className="text-[11px] whitespace-nowrap text-muted tabular-nums">要復習 {count.review}</div>
      </div>
    </button>
  );
}

function Legend() {
  return (
    <div className="ml-auto flex flex-wrap gap-3 text-[11px] text-muted">
      {(["graduated", "learning", "review"] as const).map((p) => (
        <span key={p} className="flex items-center gap-1">
          <span aria-hidden="true" className={`size-2.5 rounded-sm ${PART_COLOR[p]}`} />
          {PART_LABEL[p]}
        </span>
      ))}
      <span className="flex items-center gap-1">
        <span aria-hidden="true" className="size-2.5 rounded-sm bg-surface-2" />
        {PART_LABEL.new}
      </span>
    </div>
  );
}

/** 1行：名前・積み上げの棒・数 */
function Row({ label, count, note, onClick, disabled }: { label: string; count: Count; note: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="grid min-h-11 w-full grid-cols-[7.5rem_minmax(0,1fr)_6rem_0.75rem] items-center gap-3 rounded-xl px-2 text-left text-sm transition-colors hover:bg-surface-2 disabled:opacity-40 sm:grid-cols-[9rem_minmax(0,1fr)_6.5rem_0.75rem]"
    >
      <span className="truncate font-semibold">{label}</span>
      <Bar count={count} />
      <span className="text-right text-xs text-muted tabular-nums">{note}</span>
      <span aria-hidden="true" className="text-muted">
        ›
      </span>
    </button>
  );
}

function Bar({ count }: { count: Count }) {
  return (
    <span className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-surface-2">
      {(["graduated", "learning", "review"] as const).map((p) =>
        count[p] > 0 ? <span key={p} className={PART_COLOR[p]} style={{ width: `${(count[p] / count.total) * 100}%` }} /> : null,
      )}
    </span>
  );
}

/** 白地図：地図セットごとに、答え方3つの卒業の数 */
function MapRows({ progress, onOpen }: { progress: Progress; onOpen: () => void }) {
  return (
    <div>
      <div className="mb-1 grid grid-cols-[7.5rem_repeat(3,minmax(0,1fr))_0.75rem] gap-3 px-2 text-[11px] text-muted sm:grid-cols-[9rem_repeat(3,minmax(0,1fr))_0.75rem]">
        <span />
        {MODES.map((m) => (
          <span key={m}>{MAP_MODE_LABEL[m]}</span>
        ))}
        <span />
      </div>
      {MAP_SETS.map((set) => (
        <button
          key={set.id}
          type="button"
          onClick={onOpen}
          className="grid min-h-11 w-full grid-cols-[7.5rem_repeat(3,minmax(0,1fr))_0.75rem] items-center gap-3 rounded-xl px-2 text-left text-sm transition-colors hover:bg-surface-2 sm:grid-cols-[9rem_repeat(3,minmax(0,1fr))_0.75rem]"
        >
          <span className="truncate font-semibold">{set.title}</span>
          {MODES.map((m) => {
            const p = setProgress(set, m, progress);
            const count: Count = { ...emptyCount(), graduated: p.graduated, learning: p.seen - p.graduated, total: p.total };
            return (
              <span key={m} className="space-y-0.5">
                <Bar count={count} />
                <span className="block text-[10px] text-muted tabular-nums">
                  {p.graduated}/{p.total}
                </span>
              </span>
            );
          })}
          <span aria-hidden="true" className="text-muted">
            ›
          </span>
        </button>
      ))}
    </div>
  );
}

/** データ：シートごとに、やったかくし方の数と × の数 */
function SheetRows({ progress, onOpen }: { progress: ReturnType<typeof useSheetProgress>; onOpen: (id: string) => void }) {
  return (
    <div>
      {CATEGORIES.map((cat) => {
        const sheets = SHEETS.filter((s) => s.category === cat);
        if (sheets.length === 0) return null;
        return (
          <section key={cat} className="mb-3 last:mb-0">
            <h2 className="mb-1 px-2 text-xs font-bold tracking-wider text-muted">{CATEGORY_LABEL[cat]}</h2>
            {sheets.map((s) => {
              const done = s.modes.filter((m) => progress[sheetKey(s.id, m.id)]).length;
              const ng = ngCount(progress, s);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onOpen(s.id)}
                  className="grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto_3.5rem_0.75rem] items-center gap-3 rounded-xl px-2 text-left text-sm transition-colors hover:bg-surface-2"
                >
                  <span className="truncate font-semibold">{s.title}</span>
                  <span className="flex gap-1" aria-label={`かくし方 ${s.modes.length}つのうち ${done}つ やった`}>
                    {s.modes.map((m) => (
                      <span key={m.id} className={`h-3 w-5 rounded-full ${progress[sheetKey(s.id, m.id)] ? "bg-accent/60" : "bg-surface-2"}`} />
                    ))}
                  </span>
                  <span className={`text-right text-xs tabular-nums ${ng ? "font-bold text-ng" : "text-muted"}`}>{ng ? `× ${ng}` : done ? "× なし" : "まだ"}</span>
                  <span aria-hidden="true" className="text-muted">
                    ›
                  </span>
                </button>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
