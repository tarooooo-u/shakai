"use client";

import { useState } from "react";
import { SEIGO } from "@/data";
import { createLocalStore } from "@/lib/localStore";
import { statusOf, STATUS_LABEL, type Progress } from "@/lib/progress";
import { seigoKey, seigoProgress, sentence } from "@/lib/seigo";
import { CATEGORIES, CATEGORY_LABEL, type Category } from "@/lib/types";
import { Chip, Section } from "./ui";

type Field = Category | "all";
const fieldLabel = (f: Field) => (f === "all" ? "ぜんぶ" : CATEGORY_LABEL[f]);
// 2つずつ組にして出すので偶数
const COUNTS = [10, 20, 0];

type View = { field: Field; count: number };

// 分野・問題数は、1回やって戻ってきても前のままにする
const viewStore = createLocalStore<View>("shakai-seigo-view", { field: "all", count: 10 });

/** 正誤ドリル：分野と文の数を選んで始める画面 */
export default function SeigoPage({ progress, onStart }: { progress: Progress; onStart: (field: Field, count: number) => void }) {
  // 文が1つもない分野は出さない
  const fields: Field[] = ["all", ...CATEGORIES.filter((c) => SEIGO.some((s) => s.field === c))];
  const stored = viewStore.use();
  const view: View = {
    field: fields.includes(stored.field) ? stored.field : "all",
    count: COUNTS.includes(stored.count) ? stored.count : 10,
  };
  const set = (patch: Partial<View>) => viewStore.set({ ...view, ...patch });
  const [listOpen, setListOpen] = useState(false);

  const inField = (f: Field) => SEIGO.filter((s) => f === "all" || s.field === f);
  const p = seigoProgress(inField(view.field), progress);
  const left = p.total - p.graduated;
  const raw = left < 2 ? p.total : view.count > 0 ? Math.min(view.count, left) : left;
  const n = raw - (raw % 2);

  return (
    <div className="space-y-7">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">正誤ドリル</h1>
        <p className="text-sm text-muted">
          入試によく出る「次の文X・Yの正誤の組合せ」の練習です。誤りの文は、1語だけ入れかえてあります。「誤り」と見ぬいたら、どの語句がまちがいかもタップで答えます。2回続けて〇なら、その文は卒業です。
        </p>
      </header>

      <Section title="分野">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {fields.map((f) => {
            const fp = seigoProgress(inField(f), progress);
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
                  <span className="text-xs text-muted">{fp.total}文</span>
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

      <Section title="1回の文の数">
        <div className="flex flex-wrap gap-2">
          {COUNTS.map((c) => (
            <Chip key={c} selected={view.count === c} onClick={() => set({ count: c })}>
              {c ? `${c}文（${c / 2}問）` : "全部"}
            </Chip>
          ))}
        </div>
      </Section>

      <button
        type="button"
        disabled={n === 0}
        onClick={() => onStart(view.field, view.count)}
        className="min-h-16 w-full rounded-2xl bg-accent px-5 text-lg font-bold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {n === 0 ? "文が2つ以上ある分野をえらんでね" : left < 2 ? `全部卒業！ もう一度（${n / 2}問）` : `はじめる（${n / 2}問）`}
      </button>

      <section className="rounded-2xl border border-line">
        <button
          type="button"
          aria-expanded={listOpen}
          onClick={() => setListOpen(!listOpen)}
          className="flex min-h-12 w-full items-center gap-2 px-4 text-left text-sm"
        >
          <span className="text-muted">{listOpen ? "▾" : "▸"}</span>
          <span className="font-bold">文の一覧</span>
          <span className="text-xs text-muted">{fieldLabel(view.field)}の正しい文と進み具合</span>
        </button>
        {listOpen && (
          <ul className="divide-y divide-line border-t border-line">
            {inField(view.field).map((s) => {
              const status = statusOf(progress[seigoKey(s.id)]);
              return (
                <li key={s.id} className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0 flex-1">
                    {sentence(s, false)}
                    <span className="mt-0.5 block text-xs text-muted">
                      {CATEGORY_LABEL[s.field]}・{s.unit}・ひっかけ：{s.trap}
                    </span>
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
