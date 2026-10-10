"use client";

import { useState } from "react";
import { QUESTION_BY_ID } from "@/data";
import { toggleFavorite, useFavorites } from "@/lib/favorites";
import type { Progress } from "@/lib/progress";
import { shuffle } from "@/lib/session";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/types";
import RainTempChart from "./RainTempChart";
import { DifficultyBadge, FavoriteButton, GradeMark, StatusBadge } from "./ui";

/** 問題と答えの一覧。保護者が口頭で出題したり、お気に入り・間違えた問題を見直したりする用 */
export default function QuestionList({
  title,
  ids,
  progress,
  onStart,
  onBack,
  emptyMessage = "問題はありません。",
}: {
  title: string;
  ids: string[];
  progress: Progress;
  onStart: (ids: string[]) => void;
  /** 一覧の上に「← もどる」を出す（サイドバーから開いたときは不要） */
  onBack?: () => void;
  emptyMessage?: string;
}) {
  const favorites = useFavorites();
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
      <header className="space-y-1">
        {onBack && (
          <button type="button" onClick={onBack} className="min-h-11 text-sm font-semibold text-muted hover:text-ink">
            ← もどる
          </button>
        )}
        <h1 className="text-2xl font-bold">
          {title}
          <span className="ml-2 text-base font-semibold text-muted">{ids.length}問</span>
        </h1>
      </header>

      {ids.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-8 text-center text-muted">{emptyMessage}</p>
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
                      <li key={q.id} className="flex gap-1 rounded-2xl border border-line bg-surface p-2 pl-4">
                        <button
                          type="button"
                          onClick={() => !showAll && toggle(q.id)}
                          className={`flex min-w-0 flex-1 gap-3 py-2 text-left ${showAll ? "cursor-default" : ""}`}
                        >
                          <span className="w-5 shrink-0 text-xl">{r ? <GradeMark grade={r.grade} /> : null}</span>
                          <span className="min-w-0 flex-1 space-y-1">
                            <span className="block text-sm leading-relaxed">{q.question}</span>
                            {(q.imageUrl || q.imageChoices) && (
                              // eslint-disable-next-line @next/next/no-img-element -- 静的書き出しのため next/image は使わない
                              <img
                                src={q.imageUrl ?? q.imageChoices![q.answer].src}
                                alt=""
                                loading="lazy"
                                className="block h-24 w-auto rounded-lg border border-line"
                              />
                            )}
                            {q.climate && (
                              <span className="block max-w-xs">
                                <RainTempChart climate={q.climate} />
                              </span>
                            )}
                            {open ? (
                              <span className="block font-bold text-accent">{q.answer}</span>
                            ) : (
                              <span className="block text-sm text-muted">答えを見る ▸</span>
                            )}
                            <span className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                              <span>{[q.unit, q.prefecture, q.kind].filter(Boolean).join("・")}</span>
                              <DifficultyBadge difficulty={q.difficulty} />
                              <StatusBadge record={r} />
                              {r && (
                                <span>
                                  これまで 〇{r.ok} △{r.unsure} ×{r.ng}
                                </span>
                              )}
                            </span>
                          </span>
                        </button>
                        <FavoriteButton on={favorites.includes(q.id)} onClick={() => toggleFavorite(q.id)} />
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
