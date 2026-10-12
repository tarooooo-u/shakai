"use client";

import { useEffect, useState } from "react";
import { MAP_SETS, PLACE_BY_ID } from "@/data";
import { judgeLocate, locateTolerance, recordKey, type MapRun, type Place } from "@/lib/mapSets";
import type { LatLng } from "@/lib/mapTask";
import { recordGrade, useProgress } from "@/lib/progress";
import type { Grade } from "@/lib/types";
import LocateMap from "./LocateMap";
import MarksMap, { type Mark } from "./MarksMap";
import { GRADE_META, StatusBadge } from "./ui";

const GRADES: Grade[] = ["ok", "unsure", "ng"];

const GRADE_BUTTON: Record<Grade, string> = {
  ok: "border-ok text-ok hover:bg-ok/10",
  unsure: "border-unsure text-unsure hover:bg-unsure/10",
  ng: "border-ng text-ng hover:bg-ng/10",
};

/**
 * 白地図ドリルの1回分。1枚の地図の印を、1つずつ答えていく。
 *   pick … 名前を見て、地図の印をタップ（自動で採点）
 *   name … 光っている印の名前を答える（カードは自己採点、4択は自動で採点）
 *   locate … 印のない地図で、場所をタップしてピンを立てる（自動で採点）
 */
export default function MapSetQuiz({ run, onFinish }: { run: MapRun; onFinish: (results: Record<string, Grade>) => void }) {
  const set = MAP_SETS.find((s) => s.id === run.setId)!;
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
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(index / targets.length) * 100}%` }} />
        </div>
        <span className="text-sm font-semibold tabular-nums text-muted">
          {index + 1} / {targets.length}
        </span>
      </div>

      <article className="space-y-4 rounded-3xl border border-line bg-surface p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted">白地図・{set.title}</span>
          <StatusBadge record={progress[recordKey(target.id, mode)]} />
        </div>

        {mode !== "name" ? (
          <p className="text-lg leading-relaxed font-semibold sm:text-xl">
            <span className="text-accent">{target.name}</span>
            {target.reading && <span className="ml-1 text-sm font-normal text-muted">（{target.reading}）</span>}
            {mode === "pick" ? "はどれ？" : "はどこ？"}
          </p>
        ) : (
          <p className="text-lg leading-relaxed font-semibold sm:text-xl">
            光っている<span className="text-accent">{target.kind}</span>の名前は？
          </p>
        )}

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
        {mode === "pick" && !revealed && <p className="text-center text-sm text-muted">地図の印をタップしよう。</p>}
        {mode === "locate" && !revealed && (
          <>
            <p className="text-center text-sm text-muted">
              地図をタップしてピンを立てよう。ドラッグで動かせるよ。{target.coords.length > 1 && "山脈・山地は、線のどこかに立てればOK。"}
            </p>
            <button
              type="button"
              disabled={!pin}
              onClick={() => setRevealed(true)}
              className="min-h-14 w-full rounded-2xl bg-accent text-lg font-bold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              けってい
            </button>
          </>
        )}

        {options && (
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((o, i) => {
              const state = !revealed
                ? "border-line hover:border-accent/60"
                : o === target.name
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
          <PlaceExplanation
            place={target}
            verdict={located ? LOCATE_VERDICT[located.verdict] : auto ? (correct ? "正解！" : "ざんねん") : undefined}
            note={
              located &&
              (located.other
                ? `きみのピンは「${located.other.name}」のあたり`
                : located.km < 5
                  ? "ほぼぴったり"
                  : `きみのピンは約${Math.round(located.km)}kmはなれていた`)
            }
          />
        ) : (
          !auto && (
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
