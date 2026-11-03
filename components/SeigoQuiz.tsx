"use client";

import { useEffect, useState } from "react";
import { QUESTION_BY_ID, SEIGO_BY_ID } from "@/data";
import { recordGrade, useProgress } from "@/lib/progress";
import { examNumber, seigoKey, sentence, type SeigoRun, type SeigoStatement } from "@/lib/seigo";
import { CATEGORY_LABEL, type Grade } from "@/lib/types";
import { BarButton, BottomBar, GradeMark, StatusBadge } from "./ui";

const LABELS = ["X", "Y"] as const;

/** 1つの文の答え：saidWrong = 「誤り」をえらんだか。taps = まちがいさがしでタップした語句の番号。found = 入れかえた語句を見つけたか */
type Answer = { saidWrong: boolean | null; taps: number[]; found: boolean; gaveUp: boolean };
const EMPTY: Answer = { saidWrong: null, taps: [], found: false, gaveUp: false };

/** 採点：正しく判定し、誤りの文では1回目のタップで入れかえた語句を当てたら〇。見つけるまでに外したら△。判定をまちがえたら× */
function gradeOf(wrong: boolean, a: Answer): Grade | null {
  if (a.saidWrong === null) return null;
  if (a.saidWrong !== wrong) return "ng";
  if (!wrong) return "ok";
  if (a.found) return a.taps.length === 1 ? "ok" : "unsure";
  return a.gaveUp ? "unsure" : null;
}

/**
 * 正誤ドリルの1回分。文を2つずつ（X・Y）出す。
 *   1. それぞれ「正しい」「誤り」をえらんで、こたえあわせ
 *   2. 誤りの文を「誤り」と見ぬいたら、どの語句がまちがいかタップする
 *   3. 正しい文・解説を見て次へ
 */
export default function SeigoQuiz({ run, onFinish }: { run: SeigoRun; onFinish: (results: Record<string, Grade>) => void }) {
  const pairs = run.targets.length / 2;
  const [index, setIndex] = useState(0);
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([EMPTY, EMPTY]);
  const [error, setError] = useState(false);
  const [results, setResults] = useState<Record<string, Grade>>({});
  const progress = useProgress();

  const ids = [run.targets[index * 2], run.targets[index * 2 + 1]];
  const items = ids.map((id) => SEIGO_BY_ID.get(id)!);
  const wrongs = ids.map((id) => run.wrong[id]);
  const grades = items.map((_, i) => (checked ? gradeOf(wrongs[i], answers[i]) : null));
  const done = checked && grades.every(Boolean);

  // 答えを変えるたびに、採点が決まった文から記録する（途中で終了しても残るように）
  const settle = (next: Answer[], isChecked: boolean) => {
    setAnswers(next);
    if (!isChecked) return;
    const fresh: Record<string, Grade> = {};
    ids.forEach((id, i) => {
      const g = gradeOf(wrongs[i], next[i]);
      if (g && !results[id]) {
        recordGrade(seigoKey(id), g);
        fresh[id] = g;
      }
    });
    if (Object.keys(fresh).length) setResults({ ...results, ...fresh });
  };

  const update = (i: number, patch: Partial<Answer>) =>
    settle(
      answers.map((a, j) => (j === i ? { ...a, ...patch } : a)),
      checked,
    );

  const check = () => {
    if (answers.some((a) => a.saidWrong === null)) return setError(true);
    setChecked(true);
    settle(answers, true);
  };

  const next = () => {
    if (index + 1 >= pairs) return onFinish(results);
    setIndex(index + 1);
    setChecked(false);
    setAnswers([EMPTY, EMPTY]);
    setError(false);
    window.scrollTo(0, 0);
  };

  // 解いているあいだだけ、ページ全体を選択できないようにする（globals.css の html.no-select）
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("no-select");
    return () => root.classList.remove("no-select");
  }, []);

  // キーボード：Esc で終了、Enter でこたえあわせ・次へ
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") return onFinish(results);
      if (e.key !== "Enter") return;
      if (!checked) check();
      else if (done) next();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const chosen = answers.every((a) => a.saidWrong !== null) ? examNumber(!!answers[0].saidWrong, !!answers[1].saidWrong) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onFinish(results)} className="min-h-11 rounded-xl px-2 text-sm font-semibold text-muted hover:text-ink">
          ✕ 終了
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(index / pairs) * 100}%` }} />
        </div>
        <span className="text-sm font-semibold tabular-nums text-muted">
          {index + 1} / {pairs}
        </span>
      </div>

      <article className="space-y-4 rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-8">
        <p className="text-lg font-semibold">次の文X・Yは、正しいか、誤りか。</p>

        {items.map((s, i) => (
          <StatementCard
            key={s.id}
            label={LABELS[i]}
            s={s}
            wrong={wrongs[i]}
            answer={answers[i]}
            checked={checked}
            grade={grades[i]}
            record={progress[seigoKey(s.id)]}
            onSay={(w) => {
              update(i, { saidWrong: w });
              setError(false);
            }}
            onTap={(k, isSwap) => update(i, { taps: [...answers[i].taps, k], found: isSwap })}
            onGiveUp={() => update(i, { gaveUp: true })}
          />
        ))}

        {error && <p className="text-sm font-semibold text-ng">XとYの両方をえらんでね</p>}

        {done && (
          <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm">
            入試の答え方なら <span className="font-bold">{examNumber(wrongs[0], wrongs[1])}</span>
            （X {wrongs[0] ? "誤" : "正"}・Y {wrongs[1] ? "誤" : "正"}）
            <span className="ml-2 text-muted">
              あなたの答え {chosen}
              {chosen === examNumber(wrongs[0], wrongs[1]) ? " 〇" : " ×"}
            </span>
            <span className="mt-1 block text-xs text-muted">1 X正・Y正 ／ 2 X正・Y誤 ／ 3 X誤・Y正 ／ 4 X誤・Y誤</span>
          </p>
        )}
      </article>

      <p className="hidden text-center text-xs text-muted pointer-fine:block">キーボード：Enter でこたえあわせ・次へ ／ Esc で終了</p>

      <BottomBar>
        {!checked ? (
          <BarButton onClick={check}>こたえあわせ</BarButton>
        ) : done ? (
          <BarButton onClick={next}>{index + 1 >= pairs ? "結果を見る" : "次へ"}</BarButton>
        ) : (
          <p className="py-3 text-center text-sm font-semibold text-muted">まちがいの語句をタップしてね</p>
        )}
      </BottomBar>
    </div>
  );
}

function StatementCard({
  label,
  s,
  wrong,
  answer,
  checked,
  grade,
  record,
  onSay,
  onTap,
  onGiveUp,
}: {
  label: string;
  s: SeigoStatement;
  wrong: boolean;
  answer: Answer;
  checked: boolean;
  grade: Grade | null;
  record: Parameters<typeof StatusBadge>[0]["record"];
  onSay: (wrong: boolean) => void;
  onTap: (part: number, isSwap: boolean) => void;
  onGiveUp: () => void;
}) {
  // まちがいさがしの最中（誤りの文を「誤り」と見ぬいて、まだ見つけていない）
  const finding = checked && wrong && answer.saidWrong === true && !answer.found && !answer.gaveUp;
  // 入れかえた語句を、赤い線と正しい語句で見せる
  const showFix = checked && wrong && grade !== null;
  const related = s.related.map((id) => QUESTION_BY_ID.get(id)).filter((q) => q !== undefined);

  return (
    <div className={`space-y-3 rounded-2xl border-2 p-4 ${grade === "ok" ? "border-ok/60" : grade === "unsure" ? "border-unsure/60" : grade === "ng" ? "border-ng/60" : "border-line"}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl font-bold text-accent">{label}</span>
        <p className="min-w-0 flex-1 text-lg leading-loose">
          {s.parts.map((p, k) => {
            if ("text" in p) return <span key={k}>{p.text}</span>;
            const isSwap = "right" in p;
            const word = isSwap ? (wrong ? p.wrong : p.right) : p.chunk;
            if (isSwap && showFix)
              return (
                <span key={k}>
                  <span className="text-ng line-through decoration-2">{p.wrong}</span>
                  <span className="mx-0.5 font-bold text-ok">→{p.right}</span>
                </span>
              );
            if (!finding && !answer.taps.includes(k)) return <span key={k}>{word}</span>;
            const tappedWrong = answer.taps.includes(k) && !isSwap;
            return (
              <button
                key={k}
                type="button"
                disabled={!finding || tappedWrong}
                onClick={() => onTap(k, isSwap)}
                className={`mx-0.5 my-0.5 inline-block min-h-10 rounded-lg border-2 border-dashed px-2 leading-normal ${tappedWrong ? "border-ok/50 text-muted" : "border-accent/60 bg-accent/5 hover:bg-accent/15"}`}
              >
                {word}
                {tappedWrong && <span className="ml-1 text-xs font-bold text-ok">正</span>}
              </button>
            );
          })}
        </p>
      </div>

      {!checked ? (
        <div className="grid grid-cols-2 gap-2.5">
          {[false, true].map((w) => (
            <button
              key={String(w)}
              type="button"
              aria-pressed={answer.saidWrong === w}
              onClick={() => onSay(w)}
              className={`min-h-14 rounded-2xl border-2 text-lg font-bold transition-colors ${answer.saidWrong === w ? "border-accent bg-accent/10 text-accent" : "border-line bg-surface hover:border-accent/60"}`}
            >
              {w ? "誤り" : "正しい"}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {grade && (
              <span className="text-2xl">
                <GradeMark grade={grade} />
              </span>
            )}
            <span>
              正解は<span className="font-bold">「{wrong ? "誤り" : "正しい"}」</span>
              （あなたは「{answer.saidWrong ? "誤り" : "正しい"}」）
            </span>
            <StatusBadge record={record} />
          </p>
          {finding && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-accent">
                {answer.taps.length ? "そこは正しい。もう一度さがそう" : "どこがまちがい？ 点線の語句をタップ"}
              </span>
              <button type="button" onClick={onGiveUp} className="min-h-10 rounded-xl border border-line px-3 text-muted hover:text-ink">
                わからない
              </button>
            </div>
          )}
          {grade && (
            <div className="space-y-2 rounded-xl bg-note px-4 py-3 text-note-ink">
              {wrong && (
                <p>
                  <span className="font-bold">正しい文　</span>
                  {sentence(s, false)}
                </p>
              )}
              <p>
                <span className="font-bold">解説　</span>
                {s.note}
              </p>
              <p className="text-xs">
                {CATEGORY_LABEL[s.field]}・{s.unit}・ひっかけの型：{s.trap}
              </p>
              {related.length > 0 && (
                <div className="space-y-0.5 border-t border-note-ink/20 pt-2 text-xs">
                  <p className="font-bold">つながる問題</p>
                  {related.slice(0, 3).map((q) => (
                    <p key={q.id}>
                      {q.question} → <span className="font-bold">{q.answer}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
