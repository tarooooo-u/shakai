"use client";

import { useState } from "react";
import { QUESTIONS } from "@/data";
import { needsReview, type Progress } from "@/lib/progress";
import { shuffle } from "@/lib/session";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/types";
import { GradeMark } from "./ui";

export default function ReviewList({
  progress,
  onStart,
  onHome,
}: {
  progress: Progress;
  onStart: (ids: string[]) => void;
  onHome: () => void;
}) {
  const [showAnswers, setShowAnswers] = useState(true);
  const weak = QUESTIONS.filter((q) => needsReview(progress[q.id]));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <button type="button" onClick={onHome} className="min-h-11 text-sm font-semibold text-muted hover:text-ink">
          ← ホーム
        </button>
        <h1 className="text-lg font-bold">要復習リスト（{weak.length}問）</h1>
        <span className="w-14" />
      </header>

      {weak.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-8 text-center text-muted">
          △・× の問題はまだありません。
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onStart(shuffle(weak.map((q) => q.id)))}
              className="min-h-12 flex-1 rounded-2xl bg-accent px-5 font-bold text-accent-ink transition-opacity hover:opacity-90"
            >
              この{weak.length}問を演習する
            </button>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-[var(--accent)]"
                checked={showAnswers}
                onChange={(e) => setShowAnswers(e.target.checked)}
              />
              答えを表示
            </label>
          </div>

          {CATEGORIES.map((c) => {
            const items = weak.filter((q) => q.category === c);
            if (items.length === 0) return null;
            return (
              <section key={c} className="space-y-2">
                <h2 className="text-xs font-bold tracking-wider text-muted">
                  {CATEGORY_LABEL[c]}（{items.length}）
                </h2>
                <ul className="space-y-2">
                  {items.map((q) => {
                    const r = progress[q.id];
                    return (
                      <li key={q.id} className="rounded-2xl border border-line bg-surface p-4">
                        <div className="flex gap-3">
                          <span className="text-xl">
                            <GradeMark grade={r.grade} />
                          </span>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm leading-relaxed">{q.question}</p>
                            {showAnswers && <p className="font-bold text-accent">{q.answer}</p>}
                            <p className="text-[11px] text-muted">
                              {q.subCategory}　これまで 〇{r.ok} △{r.unsure} ×{r.ng}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
