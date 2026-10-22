"use client";

import { useEffect, useState } from "react";
import { KANJI_BY_ID } from "@/data";
import { kanjiKey, type KanjiRun, type KanjiWord } from "@/lib/kanji";
import { recordGrade, useProgress } from "@/lib/progress";
import { CATEGORY_LABEL, type Grade } from "@/lib/types";
import WritingPad, { MODEL_FONT, ModelAnswer, type Stroke } from "./WritingPad";
import { BarButton, BottomBar, GRADE_META, GradeButtons, StatusBadge } from "./ui";

const GRADES: Grade[] = ["ok", "unsure", "ng"];

/**
 * 漢字ドリルの1回分。
 *   pick  … 読みとヒントを見て、正しい書き方をえらぶ（自動で採点）
 *   write … 読みとヒントを見て書き、お手本と見くらべて自己採点
 */
export default function KanjiQuiz({ run, onFinish }: { run: KanjiRun; onFinish: (results: Record<string, Grade>) => void }) {
  const { targets, mode } = run;
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [results, setResults] = useState<Record<string, Grade>>({});
  const progress = useProgress();

  const w = KANJI_BY_ID.get(targets[index])!;
  const options = mode === "pick" ? (run.choices[w.id] ?? []) : null;
  const auto = options !== null;
  const correct = picked === w.word;

  const grade = (g: Grade) => {
    recordGrade(kanjiKey(w.id, mode), g);
    const next = { ...results, [w.id]: g };
    setResults(next);
    if (index + 1 >= targets.length) {
      onFinish(next);
    } else {
      setIndex(index + 1);
      setRevealed(false);
      setPicked(null);
      setStrokes([]);
    }
  };

  const pick = (o: string) => {
    setPicked(o);
    setRevealed(true);
  };

  // 解いているあいだだけ、ページ全体を選択できないようにする（globals.css の html.no-select）
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("no-select");
    return () => root.classList.remove("no-select");
  }, []);

  // キーボード：どっち？は 1〜4 → Enter で次へ（正解なら 2 で「まぐれ」）、書くは Space で答え → 1/2/3、Esc で終了。
  // 毎回の描画のあとに付け直す（いまの問題・状態で動くように）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") return onFinish(results);
      const enter = e.key === " " || e.key === "Enter";
      let handled = true;
      if (!revealed) {
        const i = Number(e.key) - 1;
        if (options && i >= 0 && i < options.length) pick(options[i]);
        else if (!auto && enter) setRevealed(true);
        else handled = false;
      } else if (auto) {
        if (enter) grade(correct ? "ok" : "ng");
        else if (correct && e.key === "2") grade("unsure");
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
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onFinish(results)}
          className="min-h-11 rounded-xl px-2 text-sm font-semibold text-muted hover:text-ink"
        >
          ✕ 終了
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(index / targets.length) * 100}%` }} />
        </div>
        <span className="text-sm font-semibold tabular-nums text-muted">
          {index + 1} / {targets.length}
        </span>
      </div>

      <article className="space-y-5 rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted">
            漢字ドリル・{CATEGORY_LABEL[w.field]}
          </span>
          <StatusBadge record={progress[kanjiKey(w.id, mode)]} />
        </div>

        <div className="space-y-1.5">
          <p className="text-lg leading-relaxed font-semibold sm:text-xl">{w.hint}</p>
          <p className="text-2xl font-bold tracking-wide text-accent sm:text-3xl">{w.reading}</p>
          <p className="text-sm text-muted">{mode === "pick" ? "正しい書き方はどれ？" : "漢字で書こう"}</p>
        </div>

        {options && (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {options.map((o, i) => {
              const state = !revealed
                ? "border-line hover:border-accent/60"
                : o === w.word
                  ? "border-ok bg-ok/10"
                  : o === picked
                    ? "border-ng bg-ng/10"
                    : "border-line opacity-50";
              return (
                <button
                  key={o}
                  type="button"
                  disabled={revealed}
                  onClick={() => pick(o)}
                  className={`flex min-h-16 items-center gap-3 rounded-2xl border-2 bg-surface px-4 py-2 text-left transition-colors ${state}`}
                >
                  <span className="text-sm text-muted tabular-nums">{i + 1}</span>
                  <span className="text-2xl sm:text-3xl" style={{ fontFamily: MODEL_FONT }}>
                    {o}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {mode === "write" && <WritingPad strokes={strokes} onChange={revealed ? undefined : setStrokes} readOnly={revealed} />}

        {revealed && (
          <div className="space-y-4 border-t border-line pt-5">
            <div className="space-y-2">
              <div className="text-xs font-bold tracking-wider text-muted">
                {auto ? (correct ? "正解！" : "ざんねん") : "お手本（赤い字に注意）"}
              </div>
              <ModelAnswer text={w.word} mark={w.chars} />
            </div>
            <KanjiWordNotes words={[w]} />
          </div>
        )}
      </article>

      <p className="hidden text-center text-xs text-muted pointer-fine:block">
        {auto
          ? "キーボード：1〜4 で選ぶ ／ Enter で次へ（正解のとき 2 で「まぐれ」） ／ Esc で終了"
          : "答えを書いてから Space で答え ／ 1・2・3 で 〇・△・× ／ Esc で終了"}
      </p>

      {(revealed || !auto) && (
        <BottomBar>
          {revealed ? (
            <GradeButtons self={!auto} correct={correct} onGrade={grade} />
          ) : (
            <BarButton onClick={() => setRevealed(true)}>答えを見る</BarButton>
          )}
        </BottomBar>
      )}
    </div>
  );
}

/** 書きまちがえやすい字の注意と、まちがった書き方 */
export function KanjiWordNotes({ words }: { words: KanjiWord[] }) {
  if (words.length === 0) return null;
  return (
    <div className="space-y-2">
      {words.map((w) => (
        <div key={w.id} className="space-y-1 rounded-xl bg-note px-4 py-3 text-sm text-note-ink">
          <p>
            <span className="font-bold">書きまちがい注意　</span>
            {w.note}
          </p>
          {w.wrong.length > 0 && (
            <p>
              <span className="font-bold">こう書かない　</span>
              {w.wrong.map((x) => (
                <span key={x} className="mr-3 inline-block text-base" style={{ fontFamily: MODEL_FONT }}>
                  ✕ <span className="line-through decoration-ng/70">{x}</span>
                </span>
              ))}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
