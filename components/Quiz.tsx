"use client";

import { useCallback, useEffect, useState } from "react";
import { QUESTION_BY_ID } from "@/data";
import { recordGrade } from "@/lib/progress";
import type { Grade } from "@/lib/types";
import { CategoryBadge, DifficultyBadge, GRADE_META } from "./ui";

const GRADES: Grade[] = ["ok", "unsure", "ng"];

const GRADE_BUTTON: Record<Grade, string> = {
  ok: "border-ok text-ok hover:bg-ok/10",
  unsure: "border-unsure text-unsure hover:bg-unsure/10",
  ng: "border-ng text-ng hover:bg-ng/10",
};

export default function Quiz({
  ids,
  onFinish,
}: {
  ids: string[];
  onFinish: (results: Record<string, Grade>) => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<Record<string, Grade>>({});

  const q = QUESTION_BY_ID.get(ids[index])!;

  const grade = useCallback(
    (g: Grade) => {
      recordGrade(q.id, g);
      const next = { ...results, [q.id]: g };
      setResults(next);
      if (index + 1 >= ids.length) {
        onFinish(next);
      } else {
        setIndex(index + 1);
        setRevealed(false);
      }
    },
    [q.id, results, index, ids.length, onFinish],
  );

  // キーボード操作: Space/Enter で答え、1/2/3 で 〇/△/×、Esc で終了
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed) {
        const g = GRADES.find((x) => GRADE_META[x].key === e.key);
        if (g) {
          e.preventDefault();
          grade(g);
        }
      }
      if (e.key === "Escape") onFinish(results);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, grade, onFinish, results]);

  return (
    <div className="space-y-4">
      {/* 進捗 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onFinish(results)}
          className="min-h-11 rounded-xl px-2 text-sm font-semibold text-muted hover:text-ink"
        >
          ✕ 終了
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${(index / ids.length) * 100}%` }}
          />
        </div>
        <span className="text-sm font-semibold tabular-nums text-muted">
          {index + 1} / {ids.length}
        </span>
      </div>

      {/* 問題カード */}
      <article className="space-y-5 rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap gap-2">
          <CategoryBadge category={q.category} sub={q.subCategory} />
          <DifficultyBadge difficulty={q.difficulty} />
        </div>

        <p className="text-lg leading-relaxed font-semibold sm:text-xl">{q.question}</p>

        {q.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- 画像は外部URLも許すため <img> を使う
          <img src={q.imageUrl} alt="" className="mx-auto max-h-80 rounded-xl border border-line" />
        )}

        {revealed ? (
          <div className="space-y-4 border-t border-line pt-5">
            <div>
              <div className="text-xs font-bold tracking-wider text-muted">答え</div>
              <div className="mt-1 text-2xl font-bold text-accent sm:text-3xl">{q.answer}</div>
            </div>
            {q.kanjiNote && (
              <div className="rounded-xl bg-note px-4 py-3 text-sm text-note-ink">
                <span className="font-bold">漢字・読み注意　</span>
                {q.kanjiNote}
              </div>
            )}
            <div>
              <div className="text-xs font-bold tracking-wider text-muted">解説</div>
              <p className="mt-1 text-[15px] leading-relaxed">{q.explanation}</p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="min-h-14 w-full rounded-2xl bg-accent text-lg font-bold text-accent-ink transition-opacity hover:opacity-90"
          >
            答えを見る
          </button>
        )}
      </article>

      {revealed && (
        <div className="grid grid-cols-3 gap-2.5">
          {GRADES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => grade(g)}
              className={`min-h-20 rounded-2xl border-2 bg-surface transition-colors ${GRADE_BUTTON[g]}`}
            >
              <div className="text-3xl leading-none font-bold">{GRADE_META[g].mark}</div>
              <div className="mt-1 text-sm font-semibold">{GRADE_META[g].label}</div>
            </button>
          ))}
        </div>
      )}

      <p className="hidden text-center text-xs text-muted sm:block">
        キーボード：Space で答え ／ 1・2・3 で 〇・△・× ／ Esc で終了
      </p>
    </div>
  );
}
