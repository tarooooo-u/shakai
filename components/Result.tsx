"use client";

import { QUESTION_BY_ID } from "@/data";
import type { Grade } from "@/lib/types";
import { GRADE_META, GradeMark } from "./ui";

export default function Result({
  ids,
  results,
  onRetry,
  onHome,
}: {
  ids: string[];
  results: Record<string, Grade>;
  onRetry: (ids: string[]) => void;
  onHome: () => void;
}) {
  const count = (g: Grade) => ids.filter((id) => results[id] === g).length;
  const ok = count("ok");
  const rate = Math.round((ok / ids.length) * 100);
  const weak = ids.filter((id) => results[id] !== "ok");

  return (
    <div className="space-y-6">
      <header className="space-y-1 text-center">
        <p className="text-sm font-semibold text-muted">おつかれさま！</p>
        <div className="text-5xl font-bold tabular-nums">
          {rate}
          <span className="text-2xl">%</span>
        </div>
        <p className="text-sm text-muted">
          {ids.length}問中 〇 {ok}問
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2.5">
        {(["ok", "unsure", "ng"] as Grade[]).map((g) => (
          <div key={g} className="rounded-2xl border border-line bg-surface py-3 text-center">
            <div className="text-2xl">
              <GradeMark grade={g} />
            </div>
            <div className="text-xl font-bold tabular-nums">{count(g)}</div>
            <div className="text-xs text-muted">{GRADE_META[g].label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          disabled={weak.length === 0}
          onClick={() => onRetry(weak)}
          className="min-h-14 rounded-2xl bg-accent px-5 text-base font-bold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {weak.length > 0 ? `△・× の ${weak.length}問をもう一度` : "全問〇！"}
        </button>
        <button
          type="button"
          onClick={onHome}
          className="min-h-14 rounded-2xl border border-line bg-surface px-5 text-base font-bold transition-colors hover:bg-surface-2"
        >
          もどる
        </button>
      </div>

      {weak.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-xs font-bold tracking-wider text-muted">見直そう</h2>
          <ul className="space-y-2">
            {weak.map((id) => {
              const q = QUESTION_BY_ID.get(id)!;
              return (
                <li key={id} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="flex gap-3">
                    <span className="text-xl">
                      <GradeMark grade={results[id]} />
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm leading-relaxed">{q.question}</p>
                      <p className="font-bold text-accent">{q.answer}</p>
                      {q.kanjiNote && <p className="text-xs text-note-ink">{q.kanjiNote}</p>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
