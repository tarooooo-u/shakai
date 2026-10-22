"use client";

import { useState } from "react";
import { KANJI_WORDS } from "@/data";
import { KANJI_MODE_LABEL, canAsk, kanjiKey, kanjiProgress, type KanjiField, type KanjiMode } from "@/lib/kanji";
import { createLocalStore } from "@/lib/localStore";
import { statusOf, STATUS_LABEL, type Progress } from "@/lib/progress";
import { CATEGORY_LABEL } from "@/lib/types";
import { Chip, Section } from "./ui";

const MODES: { mode: KanjiMode; note: string }[] = [
  { mode: "pick", note: "読みを見て、正しい書き方を2〜4つからえらぶ" },
  { mode: "write", note: "読みを見て手で書き、お手本と見くらべて自己採点（いちばん力がつく）" },
];

const FIELDS: (KanjiField | "all")[] = ["all", "history", "geography", "civics"];
const fieldLabel = (f: KanjiField | "all") => (f === "all" ? "ぜんぶ" : CATEGORY_LABEL[f]);
const COUNTS = [10, 20, 0];

type View = { mode: KanjiMode; field: KanjiField | "all"; count: number };

// 答え方・分野・問題数は、1回やって戻ってきても前のままにする
const viewStore = createLocalStore<View>("shakai-kanji-view", { mode: "pick", field: "all", count: 10 });

/** 漢字ドリル：答え方・分野・語句の数を選んで始める画面 */
export default function KanjiPage({
  progress,
  onStart,
}: {
  progress: Progress;
  onStart: (mode: KanjiMode, field: KanjiField | "all", count: number) => void;
}) {
  const stored = viewStore.use();
  const view: View = {
    mode: stored.mode in KANJI_MODE_LABEL ? stored.mode : "pick",
    field: FIELDS.includes(stored.field) ? stored.field : "all",
    count: COUNTS.includes(stored.count) ? stored.count : 10,
  };
  const set = (patch: Partial<View>) => viewStore.set({ ...view, ...patch });
  const [listOpen, setListOpen] = useState(false);

  const inField = (f: KanjiField | "all") => KANJI_WORDS.filter((w) => f === "all" || w.field === f);
  const p = kanjiProgress(inField(view.field), view.mode, progress);
  const left = p.total - p.graduated;
  const n = left === 0 ? p.total : view.count > 0 ? Math.min(view.count, left) : left;

  return (
    <div className="space-y-7">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">漢字ドリル</h1>
        <p className="text-sm text-muted">
          入試でまちがえやすい字のある語句を練習します。赤い字が注意する字です。2回続けて〇なら、その語句は卒業です（答え方ごと）。
        </p>
      </header>

      <Section title="答え方">
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <Chip key={m.mode} selected={view.mode === m.mode} onClick={() => set({ mode: m.mode })}>
              {KANJI_MODE_LABEL[m.mode]}
            </Chip>
          ))}
        </div>
        <p className="text-xs text-muted">{MODES.find((m) => m.mode === view.mode)!.note}</p>
      </Section>

      <Section title="分野">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {FIELDS.map((f) => {
            const fp = kanjiProgress(inField(f), view.mode, progress);
            const selected = view.field === f;
            return (
              <button
                key={f}
                type="button"
                aria-pressed={selected}
                onClick={() => set({ field: f })}
                className={`rounded-2xl border-2 p-3 text-left transition-colors ${selected ? "border-accent bg-accent/10" : "border-line bg-surface hover:border-accent/60"}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-bold">{fieldLabel(f)}</span>
                  <span className="text-xs text-muted">{fp.total}語</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-ok" style={{ width: `${fp.total ? (fp.graduated / fp.total) * 100 : 0}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-muted">
                  {fp.total > 0 && fp.graduated === fp.total ? "🎓 全部卒業！" : `卒業 ${fp.graduated} / ${fp.total}`}
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="1回の語句の数">
        <div className="flex flex-wrap gap-2">
          {COUNTS.map((c) => (
            <Chip key={c} selected={view.count === c} onClick={() => set({ count: c })}>
              {c ? `${c}語` : "全部"}
            </Chip>
          ))}
        </div>
      </Section>

      <button
        type="button"
        disabled={n === 0}
        onClick={() => onStart(view.mode, view.field, view.count)}
        className="min-h-16 w-full rounded-2xl bg-accent px-5 text-lg font-bold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {left === 0 && p.total > 0 ? `全部卒業！ もう一度（${n}語）` : `はじめる（${n}語）`}
      </button>

      <section className="rounded-2xl border border-line">
        <button
          type="button"
          aria-expanded={listOpen}
          onClick={() => setListOpen(!listOpen)}
          className="flex min-h-12 w-full items-center gap-2 px-4 text-left text-sm"
        >
          <span className="text-muted">{listOpen ? "▾" : "▸"}</span>
          <span className="font-bold">語句の一覧</span>
          <span className="text-xs text-muted">
            {fieldLabel(view.field)}・{KANJI_MODE_LABEL[view.mode]}の進み具合
          </span>
        </button>
        {listOpen && (
          <ul className="divide-y divide-line border-t border-line">
            {inField(view.field)
              .filter((w) => canAsk(w, view.mode))
              .map((w) => {
                const status = statusOf(progress[kanjiKey(w.id, view.mode)]);
                return (
                  <li key={w.id} className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="font-bold">{w.word}</span>
                      <span className="ml-2 text-xs text-muted">{w.reading}</span>
                      <span className="mt-0.5 block text-xs text-note-ink">{w.note}</span>
                    </span>
                    <span className={`shrink-0 text-xs font-semibold ${status === "graduated" ? "text-ok" : "text-muted"}`}>{STATUS_LABEL[status]}</span>
                  </li>
                );
              })}
          </ul>
        )}
      </section>
    </div>
  );
}
