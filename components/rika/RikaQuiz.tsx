"use client";

import { useCallback, useEffect, useState } from "react";
import { RIKA_QUESTION_BY_ID } from "@/data/rika";
import { recordRikaGrade, useRikaProgress } from "@/lib/rika/progress";
import type { RikaSession } from "@/lib/rika/session";
import { RIKA_CATEGORY_LABEL, type RikaQuestion } from "@/lib/rika/types";
import type { Grade } from "@/lib/types";
import { BarButton, BottomBar, DifficultyBadge, GRADE_META, GradeButtons, StatusBadge } from "../ui";

const GRADES: Grade[] = ["ok", "unsure", "ng"];

/** 複数の写真に付ける記号 */
const KANA = ["ア", "イ", "ウ", "エ", "オ", "カ"];

/**
 * 理科の問題を解く画面。カード（答えを見て〇△×）と4択。
 * 「4択のみ」の問題は、カードで解いているときも4択で出す。
 */
export default function RikaQuiz({
  session,
  onFinish,
}: {
  session: RikaSession;
  onFinish: (results: Record<string, Grade>) => void;
}) {
  const { ids } = session;
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, Grade>>({});
  const progress = useRikaProgress();

  const q = RIKA_QUESTION_BY_ID.get(ids[index])!;
  const options = session.choices[q.id] ?? null;
  const correct = picked === q.answer;

  const grade = useCallback(
    (g: Grade) => {
      recordRikaGrade(q.id, g);
      const next = { ...results, [q.id]: g };
      setResults(next);
      if (index + 1 >= ids.length) {
        onFinish(next);
      } else {
        setIndex(index + 1);
        setRevealed(false);
        setPicked(null);
        window.scrollTo(0, 0);
      }
    },
    [q.id, results, index, ids.length, onFinish],
  );

  const pick = useCallback((option: string) => {
    setPicked(option);
    setRevealed(true);
  }, []);

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
      {/* 進み具合 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onFinish(results)}
          className="min-h-11 rounded-xl px-2 text-sm font-semibold text-muted hover:text-ink"
        >
          ✕ 終了
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(index / ids.length) * 100}%` }} />
        </div>
        <span className="text-sm font-semibold tabular-nums text-muted">
          {index + 1} / {ids.length}
        </span>
      </div>

      {/* 問題カード */}
      <article className="space-y-5 rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted">
            {[RIKA_CATEGORY_LABEL[q.category], q.unit, q.kind].filter(Boolean).join("・")}
          </span>
          <DifficultyBadge difficulty={q.difficulty} />
          <StatusBadge record={progress[q.id]} />
        </div>

        <p className="text-lg leading-relaxed font-semibold sm:text-xl">{q.question}</p>

        {q.imageUrl && (
          <figure className="space-y-1">
            {/* eslint-disable-next-line @next/next/no-img-element -- 静的書き出しのため next/image は使わない */}
            <img src={q.imageUrl} alt="問題の写真" className="mx-auto max-h-80 rounded-xl border border-line" />
            {q.imageCredit && <figcaption className="text-center text-[11px] text-muted">{q.imageCredit}</figcaption>}
          </figure>
        )}

        {q.images && (
          <div className="grid grid-cols-2 gap-2.5">
            {q.images.map((im, i) => (
              <figure key={im.src} className="relative space-y-1 rounded-2xl border border-line bg-surface p-1.5">
                <span className="absolute top-2 left-2 z-10 flex size-7 items-center justify-center rounded-full bg-ink/70 text-sm font-bold text-white">
                  {KANA[i]}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element -- 静的書き出しのため next/image は使わない */}
                <img src={im.src} alt={`${KANA[i]}の写真`} className="aspect-[4/3] w-full rounded-xl bg-surface-2 object-contain" />
                <figcaption className="text-center text-[10px] text-muted">{im.credit}</figcaption>
              </figure>
            ))}
          </div>
        )}

        {/* 写真で選ぶ問題。答える前は名前を出さない */}
        {options && q.imageChoices && (
          <div className="grid grid-cols-2 gap-2.5">
            {options.map((o, i) => {
              const state = !revealed
                ? "border-line hover:border-accent/60"
                : o === q.answer
                  ? "border-ok ring-2 ring-ok"
                  : o === picked
                    ? "border-ng ring-2 ring-ng"
                    : "border-line opacity-50";
              return (
                <button
                  key={o}
                  type="button"
                  disabled={revealed}
                  onClick={() => pick(o)}
                  aria-label={revealed ? o : `選択肢${i + 1}`}
                  className={`relative overflow-hidden rounded-2xl border-2 bg-surface p-1.5 text-left transition-colors ${state}`}
                >
                  <span className="absolute top-2 left-2 z-10 flex size-6 items-center justify-center rounded-full bg-ink/70 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element -- 静的書き出しのため next/image は使わない */}
                  <img src={q.imageChoices![o].src} alt="" className="aspect-[4/3] w-full rounded-xl bg-surface-2 object-cover" />
                  {revealed && (
                    <span className="mt-1 block text-center text-sm font-bold">
                      {o}
                      <span className="block text-[10px] font-normal text-muted">{q.imageChoices![o].credit}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {options && !q.imageChoices && (
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

        {revealed && <Explanation q={q} verdict={options ? (correct ? "正解！" : "ざんねん") : undefined} />}
      </article>

      {/* マウスのある端末（PC）だけ */}
      <p className="hidden text-center text-xs text-muted pointer-fine:block">
        {options
          ? "キーボード：1〜4 で選ぶ ／ Enter で次へ（正解のとき 2 で「まぐれ」） ／ Esc で終了"
          : "キーボード：Space で答え ／ 1・2・3 で 〇・△・× ／ Esc で終了"}
      </p>

      {/* 答える操作は画面の下に固定（4択は選択肢を押すので、答える前は出さない） */}
      {(revealed || !options) && (
        <BottomBar>
          {revealed ? (
            <GradeButtons self={!options} correct={correct} onGrade={grade} />
          ) : (
            <BarButton onClick={() => setRevealed(true)}>答えを見る</BarButton>
          )}
        </BottomBar>
      )}
    </div>
  );
}

function Explanation({ q, verdict }: { q: RikaQuestion; verdict?: string }) {
  return (
    <div className="space-y-4 border-t border-line pt-5">
      <div>
        <div className="text-xs font-bold tracking-wider text-muted">{verdict ?? "答え"}</div>
        <div className="mt-1 text-2xl font-bold text-accent sm:text-3xl">{q.answer}</div>
        {q.altAnswers.length > 0 && <div className="mt-1 text-sm text-muted">別解：{q.altAnswers.join("／")}</div>}
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
