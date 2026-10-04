"use client";

import { useCallback, useEffect, useState } from "react";
import { QUESTION_BY_ID } from "@/data";
import { recordGrade } from "@/lib/progress";
import type { Grade, Question } from "@/lib/types";
import type { Session } from "./App";
import { CategoryBadge, DifficultyBadge, GRADE_META } from "./ui";

const GRADES: Grade[] = ["ok", "unsure", "ng"];

const GRADE_BUTTON: Record<Grade, string> = {
  ok: "border-ok text-ok hover:bg-ok/10",
  unsure: "border-unsure text-unsure hover:bg-unsure/10",
  ng: "border-ng text-ng hover:bg-ng/10",
};

export default function Quiz({
  session,
  onFinish,
}: {
  session: Session;
  onFinish: (results: Record<string, Grade>) => void;
}) {
  const { ids } = session;
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  // 4択で選んだ選択肢
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, Grade>>({});

  const q = QUESTION_BY_ID.get(ids[index])!;
  const options = session.choices[q.id] ?? null;
  const correct = picked === q.answer;

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
        setPicked(null);
      }
    },
    [q.id, results, index, ids.length, onFinish],
  );

  const pick = useCallback(
    (option: string) => {
      setPicked(option);
      setRevealed(true);
    },
    [],
  );

  // キーボード操作
  //   カード: Space/Enter で答え → 1/2/3 で 〇/△/×
  //   4択:    1〜4 で選ぶ → Enter で次へ（正解なら 2 で「まぐれ」）
  //   Esc で終了
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") return onFinish(results);
      const enter = e.key === " " || e.key === "Enter";
      let handled = true;
      if (options && !revealed) {
        const i = Number(e.key) - 1;
        if (i >= 0 && i < options.length) pick(options[i]);
        else handled = false;
      } else if (options) {
        if (enter) grade(correct ? "ok" : "ng");
        else if (correct && e.key === "2") grade("unsure");
        else handled = false;
      } else if (!revealed) {
        if (enter) setRevealed(true);
        else handled = false;
      } else {
        const g = GRADES.find((x) => GRADE_META[x].key === e.key);
        if (g) grade(g);
        else handled = false;
      }
      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [options, revealed, correct, pick, grade, onFinish, results]);

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
          <CategoryBadge category={q.category} sub={[q.unit, q.prefecture, q.kind].filter(Boolean).join("・")} />
          <DifficultyBadge difficulty={q.difficulty} />
        </div>

        <p className="text-lg leading-relaxed font-semibold sm:text-xl">{q.question}</p>

        {q.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- 画像は外部URLも許すため <img> を使う
          <img src={q.imageUrl} alt="" className="mx-auto max-h-80 rounded-xl border border-line" />
        )}

        {options && (
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((o, i) => {
              const state = !revealed
                ? "border-line hover:border-accent/60"
                : o === q.answer
                  ? "border-ok bg-ok/10 text-ok"
                  : o === picked
                    ? "border-ng bg-ng/10 text-ng"
                    : "border-line opacity-50";
              return (
                <button
                  key={o}
                  type="button"
                  disabled={revealed}
                  onClick={() => pick(o)}
                  className={`flex min-h-14 items-center gap-3 rounded-2xl border-2 bg-surface px-4 py-3 text-left font-semibold transition-colors ${state}`}
                >
                  <span className="text-sm text-muted tabular-nums">{i + 1}</span>
                  <span>{o}</span>
                </button>
              );
            })}
          </div>
        )}

        {revealed ? (
          <Explanation q={q} verdict={options ? (correct ? "正解！" : "ざんねん") : undefined} />
        ) : (
          !options && (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="min-h-14 w-full rounded-2xl bg-accent text-lg font-bold text-accent-ink transition-opacity hover:opacity-90"
            >
              答えを見る
            </button>
          )
        )}
      </article>

      {/* 採点 */}
      {revealed && !options && (
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
      {revealed && options && (
        <div className={`grid gap-2.5 ${correct ? "grid-cols-2" : "grid-cols-1"}`}>
          <button
            type="button"
            onClick={() => grade(correct ? "ok" : "ng")}
            className="min-h-16 rounded-2xl bg-accent text-lg font-bold text-accent-ink transition-opacity hover:opacity-90"
          >
            次へ
          </button>
          {correct && (
            <button
              type="button"
              onClick={() => grade("unsure")}
              className={`min-h-16 rounded-2xl border-2 bg-surface font-bold transition-colors ${GRADE_BUTTON.unsure}`}
            >
              △ まぐれだった
            </button>
          )}
        </div>
      )}

      <p className="hidden text-center text-xs text-muted sm:block">
        {options
          ? "キーボード：1〜4 で選ぶ ／ Enter で次へ（正解のとき 2 で「まぐれ」） ／ Esc で終了"
          : "キーボード：Space で答え ／ 1・2・3 で 〇・△・× ／ Esc で終了"}
      </p>
    </div>
  );
}

function Explanation({ q, verdict }: { q: Question; verdict?: string }) {
  return (
    <div className="space-y-4 border-t border-line pt-5">
      <div>
        <div className="text-xs font-bold tracking-wider text-muted">{verdict ?? "答え"}</div>
        <div className="mt-1 text-2xl font-bold text-accent sm:text-3xl">{q.answer}</div>
        {q.altAnswers.length > 0 && (
          <div className="mt-1 text-sm text-muted">別解：{q.altAnswers.join("／")}</div>
        )}
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
        {q.source && !q.source.startsWith("要確認") && <p className="mt-2 text-xs text-muted">出典：{q.source}</p>}
      </div>
    </div>
  );
}
