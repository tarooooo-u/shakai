"use client";

import { MAP_SETS, PLACE_BY_ID } from "@/data";
import { createLocalStore } from "@/lib/localStore";
import { KIND_GROUPS, MAP_MODE_LABEL, MIN_FILTERED_MARKS, byKindOnly, filterSet, kindsIn, setProgress, type KindGroup, type MapMode, type MapSet } from "@/lib/mapSets";
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

const GROUPS: { id: KindGroup; label: string }[] = [{ id: "all", label: "ぜんぶ" }, ...KIND_GROUPS];

// 答え方・しぼる種類は、1回やって戻ってきても前のままにする
const viewStore = createLocalStore<{ way: number; group: KindGroup }>("shakai-mapsets-view", { way: 0, group: "all" });

/** 白地図ドリル：地図（全国＋7地方）を選ぶ画面 */
export default function MapSetsPage({
  progress,
  onStart,
}: {
  progress: Progress;
  onStart: (setId: string, group: KindGroup, mode: MapMode, style: Style) => void;
}) {
  const view = viewStore.use();
  const way = WAYS[view.way] ? view.way : 0;
  const group = GROUPS.some((g) => g.id === view.group) ? view.group : "all";
  const { mode, style } = WAYS[way];

  return (
    <div className="space-y-7">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">白地図ドリル</h1>
        <p className="text-sm text-muted">
          1枚の地図に、山脈や川の線・火山の▲・平野や湖の囲みがいくつかあります。1つずつ答えていこう。「しぼる」で山だけ・川だけにもできます。2回続けて〇なら、その地名は卒業です（答え方ごと）。
        </p>
      </header>

      <Section title="答え方">
        <div className="flex flex-wrap gap-2">
          {WAYS.map((w, i) => (
            <Chip key={w.label} selected={way === i} onClick={() => viewStore.set({ way: i, group })}>
              {w.label}
            </Chip>
          ))}
        </div>
        <p className="text-xs text-muted">{WAYS[way].note}</p>
      </Section>

      <Section title="しぼる">
        <div className="flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <Chip key={g.id} selected={group === g.id} onClick={() => viewStore.set({ way, group: g.id })}>
              {g.label}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="地図をえらぶ">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {MAP_SETS.map((base) => {
            if (byKindOnly(base)) {
              const kinds = kindsIn(base, group, PLACE_BY_ID);
              return (
                <div key={base.id} className="rounded-2xl border border-line bg-surface p-4 sm:col-span-2">
                  <div className="font-bold">{base.title}</div>
                  <p className="text-xs text-muted">全国の地図は、種類ごとに出します。</p>
                  <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {kinds.map((kind) => (
                      <MapButton key={kind} set={filterSet(base, kind, PLACE_BY_ID)} title={kind} mode={mode} progress={progress} onClick={() => onStart(base.id, kind, mode, style)} small />
                    ))}
                  </div>
                </div>
              );
            }
            const set = filterSet(base, group, PLACE_BY_ID);
            if (set.places.length < MIN_FILTERED_MARKS) return null;
            return <MapButton key={set.id} set={set} title={set.title} mode={mode} progress={progress} onClick={() => onStart(set.id, group, mode, style)} />;
          })}
        </div>
      </Section>
    </div>
  );
}

/** 地図1枚（全国は種類1つ）のボタン。卒業した数を棒で出す */
function MapButton({ set, title, mode, progress, onClick, small }: { set: MapSet; title: string; mode: MapMode; progress: Progress; onClick: () => void; small?: boolean }) {
  const p = setProgress(set, mode, progress);
  const done = p.graduated === p.total;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border border-line text-left transition-colors hover:border-accent/60 hover:bg-surface-2 ${small ? "bg-surface-2/40 p-3" : "bg-surface p-4"}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className={small ? "text-sm font-bold" : "font-bold"}>{title}</span>
        <span className="shrink-0 text-xs text-muted">{set.places.length}か所</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-ok" style={{ width: `${(p.graduated / p.total) * 100}%` }} />
      </div>
      <div className="mt-1 text-[11px] text-muted">
        {done ? (small ? "🎓 全部卒業！" : "🎓 全部卒業！（もう一度全部できます）") : `卒業 ${p.graduated} / ${p.total}${small ? "" : `　解いた ${p.seen}`}`}
      </div>
    </button>
  );
}
