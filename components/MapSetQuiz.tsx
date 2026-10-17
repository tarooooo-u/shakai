"use client";

import { useEffect, useState } from "react";
import { MAP_SETS, PLACE_BY_ID } from "@/data";
import { filterSet, groupLabel, judgeLocate, locateTolerance, recordKey, type MapRun, type Place } from "@/lib/mapSets";
import type { LatLng } from "@/lib/mapTask";
import { recordGrade, useProgress } from "@/lib/progress";
import type { Grade } from "@/lib/types";
import LocateMap from "./LocateMap";
import MarksMap, { type Mark } from "./MarksMap";
import { BarButton, BottomBar, GRADE_META, GradeButtons, StatusBadge } from "./ui";

const GRADES: Grade[] = ["ok", "unsure", "ng"];

/**
 * 白地図ドリルの1回分。1枚の地図の印を、1つずつ答えていく。
 *   pick … 名前を見て、地図の印をタップ（自動で採点）
 *   name … 光っている印の名前を答える（カードは自己採点、4択は自動で採点）
 *   locate … 印のない地図で、場所をタップしてピンを立てる（自動で採点）
 */
export default function MapSetQuiz({ run, onFinish }: { run: MapRun; onFinish: (results: Record<string, Grade>) => void }) {
  const set = filterSet(MAP_SETS.find((s) => s.id === run.setId)!, run.group, PLACE_BY_ID);
  const label = groupLabel(run.group);
  const { targets, mode } = run;
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  // pick：タップした印の id／name の4択：えらんだ名前
  const [picked, setPicked] = useState<string | null>(null);
  // locate：立てたピン
  const [pin, setPin] = useState<LatLng | null>(null);
  const [results, setResults] = useState<Record<string, Grade>>({});
  const progress = useProgress();

  const target = PLACE_BY_ID.get(targets[index])!;
  const options = mode === "name" ? (run.choices[target.id] ?? null) : null;
  const auto = mode !== "name" || options !== null;
  const located = mode === "locate" && revealed && pin ? judgeLocate(set, target, pin, PLACE_BY_ID) : null;
  const correct = located ? located.verdict === "ok" : mode === "pick" ? picked === target.id : picked === target.name;
  const verdict = !revealed ? undefined : located ? LOCATE_VERDICT[located.verdict] : auto ? (correct ? "正解！" : "ざんねん") : undefined;

  const grade = (g: Grade) => {
    recordGrade(recordKey(target.id, mode), g);
    const next = { ...results, [target.id]: g };
    setResults(next);
    if (index + 1 >= targets.length) {
      onFinish(next);
    } else {
      setIndex(index + 1);
      setRevealed(false);
      setPicked(null);
      setPin(null);
    }
  };

  const pick = (value: string) => {
    setPicked(value);
    setRevealed(true);
  };

  // キーボード：4択は 1〜4、カードは Space で答え → 1/2/3、場所をタップはピンを立てて Enter で決定、
  // 自動採点のあとは Enter で次へ（正解なら 2 で「まぐれ」）、Esc で終了。
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
        else if (mode === "locate" && enter && pin) setRevealed(true);
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

  const marks: Mark[] = set.places.map((id) => {
    const place = PLACE_BY_ID.get(id)!;
    if (id === target.id) return { place, tone: revealed ? "ok" : mode === "name" ? "target" : "normal", label: revealed };
    if (revealed && mode === "pick" && id === picked) return { place, tone: "ng", label: true };
    if (id in results) return { place, tone: "done", label: true };
    return { place, tone: mode === "name" ? "faded" : "normal" };
  });

  return (
    <div className="space-y-3">
      {/* 進捗と問題。地図を大きくとるため、1つにまとめる */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onFinish(results)}
            className="min-h-11 shrink-0 rounded-xl px-2 text-sm font-semibold text-muted hover:text-ink"
          >
            ✕ 終了
          </button>
          {mode !== "name" ? (
            <p className="min-w-0 flex-1 text-lg leading-snug font-semibold sm:text-xl">
              <span className="text-accent">{target.name}</span>
              {target.reading && <span className="ml-1 text-sm font-normal text-muted">（{target.reading}）</span>}
              {mode === "pick" ? "はどれ？" : "はどこ？"}
            </p>
          ) : (
            <p className="min-w-0 flex-1 text-lg leading-snug font-semibold sm:text-xl">
              光っている<span className="text-accent">{target.kind}</span>の名前は？
            </p>
          )}
          <span className="shrink-0 text-sm font-semibold tabular-nums text-muted">
            {index + 1} / {targets.length}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(index / targets.length) * 100}%` }} />
        </div>
      </div>

      {/*
        たて向き：地図 → 解説 の順に1列。地図の高さは、画面から上の問題と下の帯を引いた分まで
        iPad の横向き（lg 以上の横長）：左に地図（画面の高さいっぱい）、右に答えるボタンと解説の2列
      */}
      <div className="flex flex-col gap-3 [--map-max-h:calc(100dvh-14.5rem)] lg:landscape:grid lg:landscape:[--map-max-h:calc(100dvh-6rem)] lg:landscape:grid-cols-[minmax(0,1fr)_20rem] lg:landscape:items-start lg:landscape:gap-4">
        {mode === "locate" ? (
          <LocateMap
            extent={set.extent}
            marks={marks.filter((m) => m.tone === "done")}
            pin={pin}
            onPin={setPin}
            answer={located ? { place: target, tol: locateTolerance(set.extent, target), verdict: located.verdict } : undefined}
          />
        ) : (
          <MarksMap extent={set.extent} marks={marks} onPick={mode === "pick" && !revealed ? pick : undefined} />
        )}

        {/* 右の列（横向き）。たて向きでは地図の下にそのまま並ぶ */}
        <div className="contents lg:landscape:flex lg:landscape:flex-col lg:landscape:gap-3">
          <article className="space-y-3 rounded-3xl border border-line bg-surface p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted">白地図・{set.title}{label && `（${label}）`}</span>
              <StatusBadge record={progress[recordKey(target.id, mode)]} />
            </div>
            {revealed ? (
              <PlaceExplanation
                place={target}
                verdict={verdict}
                note={
                  located
                    ? located.other
                      ? `きみのピンは「${located.other.name}」のあたり`
                      : located.km < 5
                        ? "ほぼぴったり"
                        : `きみのピンは約${Math.round(located.km)}kmはなれていた`
                    : options && !correct && picked
                      ? `えらんだのは「${picked}」`
                      : null
                }
              />
            ) : (
              <p className="text-sm text-muted">答えると、ここに解説が出ます。</p>
            )}
          </article>
          {/* 答える操作（4択の選択肢もふくむ）。たて向きは画面の下に固定、横向きは右の列の上 */}
          <BottomBar className="lg:landscape:static lg:landscape:order-first lg:landscape:mx-0 lg:landscape:rounded-2xl lg:landscape:border lg:landscape:p-3 lg:landscape:backdrop-blur-none">
            {revealed ? (
              <div className="space-y-2">
                {/* 地図は大きいので、答えと判定を帯にも出す（解説までスクロールしなくてよいように） */}
                {verdict && (
                  <p className="text-center text-sm font-bold">
                    <span className={correct ? "text-ok" : located?.verdict === "close" ? "text-unsure" : "text-ng"}>{verdict}</span>　答え：{target.name}
                  </p>
                )}
                <GradeButtons self={!auto} correct={correct} onGrade={grade} />
              </div>
            ) : options ? (
              <div className="grid grid-cols-2 gap-2">
                {options.map((o, i) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => pick(o)}
                    className="flex min-h-12 items-center gap-3 rounded-2xl border-2 border-line bg-surface px-4 py-2 text-left font-semibold transition-colors hover:border-accent/60"
                  >
                    <span className="text-sm text-muted tabular-nums">{i + 1}</span>
                    <span>{o}</span>
                  </button>
                ))}
              </div>
            ) : mode === "pick" ? (
              <p className="py-2 text-center text-sm text-muted">地図の印をタップしよう。</p>
            ) : mode === "locate" ? (
              <div className="space-y-2">
                <p className="text-center text-xs text-muted">
                  地図をトンとたたいてピンを立てよう。ピンをつかむと動かせるよ。{target.area ? `${target.kind}は、その中に立てればOK。` : target.coords.length > 1 && "線のどこかに立てればOK。"}
                </p>
                <BarButton disabled={!pin} onClick={() => setRevealed(true)}>
                  けってい
                </BarButton>
              </div>
            ) : (
              <BarButton onClick={() => setRevealed(true)}>答えを見る</BarButton>
            )}
          </BottomBar>
        </div>
      </div>
    </div>
  );
}

const LOCATE_VERDICT = { ok: "正解！", close: "おしい！", ng: "ざんねん" };

function PlaceExplanation({ place, verdict, note }: { place: Place; verdict?: string; note?: string | null }) {
  return (
    <div className="space-y-3 border-t border-line pt-4">
      <div>
        <div className="text-xs font-bold tracking-wider text-muted">{verdict ?? "答え"}</div>
        <div className="mt-1 text-2xl font-bold text-accent sm:text-3xl">
          {place.name}
          {place.reading && <span className="ml-2 text-base font-semibold text-muted">{place.reading}</span>}
        </div>
        {note && <div className="mt-1 text-sm font-semibold text-muted">{note}</div>}
      </div>
      {place.kanjiNote && (
        <div className="rounded-xl bg-note px-4 py-3 text-sm text-note-ink">
          <span className="font-bold">漢字・読み注意　</span>
          {place.kanjiNote}
        </div>
      )}
      <p className="text-[15px] leading-relaxed">{place.explanation}</p>
      {place.source && !place.source.startsWith("要確認") && <p className="text-xs text-muted">出典：{place.source}</p>}
    </div>
  );
}
