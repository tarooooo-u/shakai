"use client";

import { useEffect, useState, type ReactNode } from "react";
import { RIKA_SHEETS } from "@/data/rika";
import { createLocalStore } from "@/lib/localStore";
import { cellKey, hiddenKeys, ngCount, setNg, sheetKey, touchSheet, useRikaSheetProgress, type RikaSheet } from "@/lib/rika/sheets";
import { RIKA_CATEGORIES, RIKA_CATEGORY_LABEL } from "@/lib/rika/types";
import { Chip, Section } from "../ui";

// 理科のデータシート（表の一部を赤い紙でかくし、タップでめくる）。社会の SheetView とは別。

// シートごとに、前に選んだかくし方を覚えておく
const modeStore = createLocalStore<Record<string, string>>("rika-drill:sheet-mode:v1", {});

/** データ：表を選ぶ画面 */
export function RikaSheetsPage({ onOpen }: { onOpen: (id: string) => void }) {
  const progress = useRikaSheetProgress();
  return (
    <div className="space-y-7">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">データ</h1>
        <p className="text-sm text-muted">
          表の一部が赤い紙でかくれています。思い出してからタップしてめくろう。まちがえた所はもう一度タップして × をつけておくと、あとで × の所だけかくして復習できます。
        </p>
      </header>
      {RIKA_CATEGORIES.map((cat) => {
        const sheets = RIKA_SHEETS.filter((s) => s.category === cat);
        if (sheets.length === 0) return null;
        return (
          <Section key={cat} title={RIKA_CATEGORY_LABEL[cat]}>
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
                    <div className="font-bold">{s.title}</div>
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

/** 1枚の表。かくし方を選び、赤い所をタップでめくる → もう一度で ×（もう一度で × を消す） */
export function RikaSheetView({ sheet, onBack }: { sheet: RikaSheet; onBack: () => void }) {
  const modes = modeStore.use();
  const mode = sheet.modes.find((m) => m.id === modes[sheet.id]) ?? sheet.modes[0];
  const progress = useRikaSheetProgress();
  const ng = new Set(progress[sheetKey(sheet.id, mode.id)]?.ng ?? []);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const keys = hiddenKeys(sheet, mode);

  useEffect(() => touchSheet(sheet.id, mode.id), [sheet.id, mode.id]);

  const selectMode = (id: string) => {
    modeStore.set({ ...modeStore.get(), [sheet.id]: id });
    setRevealed(new Set());
  };
  const tap = (key: string) => {
    if (!revealed.has(key)) setRevealed((prev) => new Set(prev).add(key));
    else setNg(sheet.id, mode.id, key, !ng.has(key));
  };
  const openCount = keys.filter((k) => revealed.has(k)).length;

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-accent hover:underline">
        ← データの一覧へ
      </button>
      <header className="space-y-1.5">
        <p className="text-xs font-bold text-accent">
          {RIKA_CATEGORY_LABEL[sheet.category]}・{sheet.unit}
        </p>
        <h1 className="text-2xl font-bold">{sheet.title}</h1>
        {sheet.note && <p className="text-xs leading-relaxed text-muted">{sheet.note}</p>}
      </header>

      <div className="flex flex-wrap gap-2">
        {sheet.modes.map((m) => (
          <Chip key={m.id} selected={m.id === mode.id} onClick={() => selectMode(m.id)}>
            {m.label}
          </Chip>
        ))}
      </div>

      <div className="sticky top-14 z-20 -mx-1 flex flex-wrap items-center gap-2 rounded-xl bg-bg/95 px-1 py-1.5 backdrop-blur md:top-0">
        <ToolButton onClick={() => setRevealed(new Set(keys))}>ぜんぶめくる</ToolButton>
        <ToolButton onClick={() => setRevealed(new Set())}>かくし直す</ToolButton>
        <ToolButton onClick={() => setRevealed(new Set(keys.filter((k) => !ng.has(k))))} disabled={ng.size === 0}>
          ×だけかくす
        </ToolButton>
        <span className="ml-auto text-xs text-muted tabular-nums">
          めくった {openCount}/{keys.length}　<span className={ng.size ? "font-bold text-ng" : ""}>× {ng.size}</span>
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface-2">
              {sheet.columns.map((c, i) => (
                <th key={i} scope="col" className="border-b border-line px-2.5 py-2 text-left text-xs font-bold whitespace-nowrap text-muted">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row, r) => (
              <tr key={row[0]} className="border-b border-line last:border-b-0">
                {row.map((v, c) => {
                  const k = cellKey(sheet, r, c);
                  const hidden = v !== "" && mode.cols.includes(c);
                  const Tag = c === 0 ? "th" : "td";
                  // 短い語（星の名前・色など）は1行におさめる。長い説明は折り返す
                  const short = [...v].length <= 8;
                  return (
                    <Tag
                      key={c}
                      scope={c === 0 ? "row" : undefined}
                      className={`px-2 py-1.5 align-middle leading-snug ${c === 0 ? "text-left font-bold" : ""} ${short ? "whitespace-nowrap" : "min-w-[9em]"} ${hidden ? "min-w-[5.5em]" : ""}`}
                    >
                      {hidden ? (
                        <Cell open={revealed.has(k)} isNg={ng.has(k)} onTap={() => tap(k)} text={v} />
                      ) : (
                        <span className="block px-1">{v}</span>
                      )}
                    </Tag>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted">赤い所をタップするとめくれます。めくったあと、もう一度タップすると × がつきます（「×だけかくす」で復習）。</p>
      <p className="text-[11px] leading-relaxed text-muted">出典：{sheet.source}</p>
    </div>
  );
}

/** かくれているマス。赤い紙はマスのはばいっぱいにする（文字の長さで答えが分からないように） */
function Cell({ open, isNg, onTap, text }: { open: boolean; isNg: boolean; onTap: () => void; text: string }) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={open ? `${text}${isNg ? "（×）" : ""}` : "かくれている所（タップでめくる）"}
      className={`relative block min-h-9 w-full rounded-md px-1 text-left transition-colors ${
        open ? (isNg ? "bg-ng/15 text-ng ring-2 ring-ng" : "ring-1 ring-accent/30") : "bg-ng/85 text-transparent hover:bg-ng"
      }`}
    >
      {text}
      {isNg && (
        <span className={`absolute -top-2 -right-2 flex size-4 items-center justify-center rounded-full text-[10px] font-bold ${open ? "bg-ng text-white" : "bg-white text-ng"}`}>
          ×
        </span>
      )}
    </button>
  );
}

function ToolButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-10 rounded-xl border border-line bg-surface px-3 text-sm font-semibold hover:border-accent/60 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
