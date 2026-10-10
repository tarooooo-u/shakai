"use client";

import { useCallback, useEffect, useState } from "react";
import { QUESTION_BY_ID } from "@/data";
import { toggleFavorite, useFavorites } from "@/lib/favorites";
import { judgeMap, type LatLng } from "@/lib/mapTask";
import { recordGrade, useProgress } from "@/lib/progress";
import type { Grade, Question } from "@/lib/types";
import type { Session } from "./App";
import MapTap, { mapFeedback } from "./MapTap";
import RainTempChart from "./RainTempChart";
import { CategoryBadge, DifficultyBadge, FavoriteButton, GRADE_META, StatusBadge } from "./ui";

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
  // 地図問題で立てたピン
  const [pin, setPin] = useState<LatLng | null>(null);
  const [results, setResults] = useState<Record<string, Grade>>({});
  const favorites = useFavorites();
  const progress = useProgress();

  const q = QUESTION_BY_ID.get(ids[index])!;
  const mapTask = q.mapTask;
  const options = mapTask ? null : (session.choices[q.id] ?? null);
  const mapVerdict = mapTask && pin ? judgeMap(mapTask, pin) : null;
  // 4択と地図問題は自動で採点する（カードは自己採点）
  const auto = options !== null || mapTask !== undefined;
  const correct = mapTask ? mapVerdict === "ok" : picked === q.answer;

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
        setPin(null);
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
  //   地図:   ピンを立てて Enter で決定 → Enter で次へ（正解なら 2 で「まぐれ」）
  //   Esc で終了
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") return onFinish(results);
      if (e.key === "f" || e.key === "F") return toggleFavorite(q.id);
      const enter = e.key === " " || e.key === "Enter";
      let handled = true;
      if (mapTask && !revealed) {
        if (enter && pin) setRevealed(true);
        else handled = false;
      } else if (options && !revealed) {
        const i = Number(e.key) - 1;
        if (i >= 0 && i < options.length) pick(options[i]);
        else handled = false;
      } else if (auto) {
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
  }, [options, mapTask, pin, auto, revealed, correct, pick, grade, onFinish, results, q.id]);

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
        <div className="flex items-start gap-2">
          <div className="flex flex-1 flex-wrap gap-2">
            <CategoryBadge category={q.category} sub={[q.unit, q.prefecture, q.kind].filter(Boolean).join("・")} />
            <DifficultyBadge difficulty={q.difficulty} />
            <StatusBadge record={progress[q.id]} />
          </div>
          <FavoriteButton on={favorites.includes(q.id)} onClick={() => toggleFavorite(q.id)} />
        </div>

        <p className="text-lg leading-relaxed font-semibold sm:text-xl">{q.question}</p>

        {q.climate && <RainTempChart climate={q.climate} />}

        {q.imageUrl && (
          <figure className="space-y-1">
            {/* eslint-disable-next-line @next/next/no-img-element -- 静的書き出しのため next/image は使わない */}
            <img src={q.imageUrl} alt="問題の画像" loading="lazy" className="mx-auto max-h-80 rounded-xl border border-line" />
            {q.imageCredit && <figcaption className="text-center text-[11px] text-muted">{q.imageCredit}</figcaption>}
          </figure>
        )}

        {mapTask && (
          <div className="space-y-2">
            <MapTap task={mapTask} pin={pin} onPin={setPin} decided={revealed} />
            {!revealed && (
              <p className="text-center text-sm text-muted">地図をタップしてピンを立てよう。ドラッグで動かせるよ。</p>
            )}
          </div>
        )}

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
                  <img src={q.imageChoices![o].src} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-xl object-contain bg-surface-2" />
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

        {revealed ? (
          <Explanation
            q={q}
            verdict={
              mapVerdict ? MAP_VERDICT[mapVerdict] : options ? (correct ? "正解！" : "ざんねん") : undefined
            }
            note={mapTask && pin ? mapFeedback(mapTask, pin) : undefined}
          />
        ) : mapTask ? (
          <button
            type="button"
            disabled={!pin}
            onClick={() => setRevealed(true)}
            className="min-h-14 w-full rounded-2xl bg-accent text-lg font-bold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            けってい
          </button>
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
      {revealed && !auto && (
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
      {revealed && auto && (
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
        {mapTask
          ? "キーボード：Enter で決定・次へ（正解のとき 2 で「まぐれ」） ／ F でお気に入り ／ Esc で終了"
          : options
          ? "キーボード：1〜4 で選ぶ ／ Enter で次へ（正解のとき 2 で「まぐれ」） ／ F でお気に入り ／ Esc で終了"
          : "キーボード：Space で答え ／ 1・2・3 で 〇・△・× ／ F でお気に入り ／ Esc で終了"}
      </p>
    </div>
  );
}

const MAP_VERDICT = { ok: "正解！", close: "おしい！", ng: "ざんねん" };

function Explanation({ q, verdict, note }: { q: Question; verdict?: string; note?: string }) {
  return (
    <div className="space-y-4 border-t border-line pt-5">
      <div>
        <div className="text-xs font-bold tracking-wider text-muted">{verdict ?? "答え"}</div>
        <div className="mt-1 text-2xl font-bold text-accent sm:text-3xl">{q.answer}</div>
        {q.altAnswers.length > 0 && (
          <div className="mt-1 text-sm text-muted">別解：{q.altAnswers.join("／")}</div>
        )}
        {note && <div className="mt-1 text-sm font-semibold text-muted">{note}</div>}
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
