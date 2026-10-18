"use client";

import { SHEETS } from "@/data";
import { ngCount, sheetKey, useSheetProgress, type Sheet } from "@/lib/sheets";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/types";
import { Section } from "./ui";

const KIND_LABEL: Record<Sheet["kind"], string> = { tree: "組織図", cards: "表", bars: "グラフ", lines: "折れ線" };

/** データ：図表・組織図のシートを選ぶ画面 */
export default function SheetsPage({ onOpen }: { onOpen: (id: string) => void }) {
  const progress = useSheetProgress();
  return (
    <div className="space-y-7">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">データ</h1>
        <p className="text-sm text-muted">
          表やグラフ、組織図の一部が赤い紙でかくれています。思い出してからタップしてめくろう。まちがえた所はもう一度タップして × をつけておくと、あとで × の所だけかくして復習できます。
        </p>
      </header>
      {CATEGORIES.map((cat) => {
        const sheets = SHEETS.filter((s) => s.category === cat);
        if (sheets.length === 0) return null;
        return (
          <Section key={cat} title={CATEGORY_LABEL[cat]}>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {sheets.map((s) => {
                const ng = ngCount(progress, s);
                const seen = s.modes.some((m) => progress[sheetKey(s.id, m.id)]);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onOpen(s.id)}
                    className="rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-accent/60 hover:bg-surface-2"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-bold">{s.title}</span>
                      <span className="shrink-0 text-xs text-muted">{KIND_LABEL[s.kind]}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {s.unit}
                      {ng > 0 ? <span className="ml-2 font-bold text-ng">× {ng}</span> : seen ? <span className="ml-2">× なし</span> : <span className="ml-2">まだ</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>
        );
      })}
    </div>
  );
}
