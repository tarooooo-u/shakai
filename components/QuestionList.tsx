"use client";

import { useState } from "react";
import { QUESTION_BY_ID } from "@/data";
import type { Progress } from "@/lib/progress";
import { shuffle } from "@/lib/session";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/types";
import { DifficultyBadge, GradeMark } from "./ui";

/** 問題と答えの一覧。保護者が口頭で出題したり、要復習を見直したりする用 */
export default function QuestionList({
  title,
  ids,
  progress,
  onStart,
  onHome,
}: {
  title: string;
  ids: string[];
  progress: Progress;
  onStart: (ids: string[]) => void;
  onHome: () => void;
}) {
  const [showAll, setShowAll] = useState(true);
  // 「答えを隠す」ときに個別にタップして開いた問題
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const questions = ids.map((id) => QUESTION_BY_ID.get(id)!);

  const toggle = (id: string) =>
    setOpened((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <button type="button" onClick={onHome} className="min-h-11 text-sm font-semibold text-muted hover:text-ink">
          ← ホーム
        </button>
        <h1 className="text-center text-lg font-bold">
          {title}（{ids.length}問）
        </h1>
        <span className="w-14" />
      </header>

      {ids.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-8 text-center text-muted">問題はありません。</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onStart(shuffle(ids))}
              className="min-h-12 flex-1 rounded-2xl bg-accent px-5 font-bold text-accent-ink transition-opacity hover:opacity-90"
            >
              この{ids.length}問を演習する
            </button>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-[var(--accent)]"
                checked={showAll}
                onChange={(e) => {
                  setShowAll(e.target.checked);
                  setOpened(new Set());
                }}
              />
              答えをすべて表示
            </label>
          </div>
          {!showAll && <p className="text-xs text-muted">問題をタップすると答えが開きます。</p>}

          {CATEGORIES.map((c) => {
            const items = questions.filter((q) => q.category === c);
            if (items.length === 0) return null;
            return (
              <section key={c} className="space-y-2">
                <h2 className="text-xs font-bold tracking-wider text-muted">
                  {CATEGORY_LABEL[c]}（{items.length}）
                </h2>
                <ul className="space-y-2">
                  {items.map((q) => {
                    const r = progress[q.id];
                    const open = showAll || opened.has(q.id);
                    return (
                      <li key={q.id}>
                        <button
                          type="button"
                          onClick={() => !showAll && toggle(q.id)}
                          className={`flex w-full gap-3 rounded-2xl border border-line bg-surface p-4 text-left ${
                            showAll ? "cursor-default" : ""
                          }`}
                        >
                          <span className="w-5 shrink-0 text-xl">{r ? <GradeMark grade={r.grade} /> : null}</span>
                          <span className="flex-1 space-y-1">
                            <span className="block text-sm leading-relaxed">{q.question}</span>
                            {open ? (
                              <span className="block font-bold text-accent">{q.answer}</span>
                            ) : (
                              <span className="block text-sm text-muted">答えを見る ▸</span>
                            )}
                            <span className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                              <span>{[q.unit, q.prefecture, q.kind].filter(Boolean).join("・")}</span>
                              <DifficultyBadge difficulty={q.difficulty} />
                              {r && (
                                <span>
                                  これまで 〇{r.ok} △{r.unsure} ×{r.ng}
                                </span>
                              )}
                            </span>
                          </span>
                        </button>
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
