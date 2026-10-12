"use client";

import { useState } from "react";
import { MAP_SETS } from "@/data";
import { MAP_MODE_LABEL, setProgress, type MapMode } from "@/lib/mapSets";
import type { Progress } from "@/lib/progress";
import { STYLE_LABEL, type Style } from "@/lib/session";
import { Chip, Section } from "./ui";

/** 答え方の選び方（地図でえらぶ → 名前を答える → 場所をタップ の順にむずかしくなる） */
const WAYS: { mode: MapMode; style: Style; label: string; note: string }[] = [
  { mode: "pick", style: "card", label: MAP_MODE_LABEL.pick, note: "名前を見て、地図の印をタップ" },
  { mode: "name", style: "choice", label: `${MAP_MODE_LABEL.name}（${STYLE_LABEL.choice}）`, note: "光っている印の名前を4つからえらぶ" },
  { mode: "name", style: "card", label: `${MAP_MODE_LABEL.name}（カード）`, note: "光っている印の名前を思い出して、自己採点" },
  { mode: "locate", style: "card", label: MAP_MODE_LABEL.locate, note: "印のない地図で、場所をタップしてピンを立てる（いちばんむずかしい）" },
];

/** 白地図ドリル：地図セットを選ぶ画面 */
export default function MapSetsPage({
  progress,
  onStart,
}: {
  progress: Progress;
  onStart: (setId: string, mode: MapMode, style: Style) => void;
}) {
  const [way, setWay] = useState(0);
  const { mode, style } = WAYS[way];

  return (
    <div className="space-y-7">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">白地図ドリル</h1>
        <p className="text-sm text-muted">
          1枚の地図に、山脈や川の線・火山の▲・平野や湖の囲みがいくつかあります。1つずつ答えていこう。2回続けて〇なら、その地名は卒業です（答え方ごと）。
        </p>
      </header>

      <Section title="答え方">
        <div className="flex flex-wrap gap-2">
          {WAYS.map((w, i) => (
            <Chip key={w.label} selected={way === i} onClick={() => setWay(i)}>
              {w.label}
            </Chip>
          ))}
        </div>
        <p className="text-xs text-muted">{WAYS[way].note}</p>
      </Section>

      <Section title="地図をえらぶ">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {MAP_SETS.map((set) => {
            const p = setProgress(set, mode, progress);
            const done = p.graduated === p.total;
            return (
              <button
                key={set.id}
                type="button"
                onClick={() => onStart(set.id, mode, style)}
                className="rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-accent/60 hover:bg-surface-2"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-bold">{set.title}</span>
                  <span className="shrink-0 text-xs text-muted">{set.places.length}か所</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-ok" style={{ width: `${(p.graduated / p.total) * 100}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-muted">
                  {done ? "🎓 全部卒業！（もう一度全部できます）" : `卒業 ${p.graduated} / ${p.total}　解いた ${p.seen}`}
                </div>
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
