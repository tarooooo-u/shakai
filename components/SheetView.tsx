"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createLocalStore } from "@/lib/localStore";
import { BAR_LABEL_MIN, cellsOf, setNg, sheetKey, touchSheet, useSheetProgress, type Sheet, type TreeNode } from "@/lib/sheets";
import { CategoryBadge, Chip } from "./ui";

// シートごとに、前に選んだかくし方を覚えておく
const modeStore = createLocalStore<Record<string, string>>("shakai-sheet-mode", {});

type Ctx = {
  hide: string[];
  revealed: Set<string>;
  ng: Set<string>;
  tap: (key: string) => void;
};
const SheetCtx = createContext<Ctx>({ hide: [], revealed: new Set(), ng: new Set(), tap: () => {} });

/**
 * かくせる文字。かくすモードのときは赤い紙でおおう。
 * タップでめくる → もう一度タップで ×（もう一度で × を消す）
 */
function Hide({ k, field, children, className = "" }: { k: string; field: string; children: ReactNode; className?: string }) {
  const { hide, revealed, ng, tap } = useContext(SheetCtx);
  if (!hide.includes(field)) return <span className={className}>{children}</span>;
  const open = revealed.has(k);
  const isNg = ng.has(k);
  return (
    <button
      type="button"
      onClick={() => tap(k)}
      aria-label={open ? `${typeof children === "string" ? children : ""}${isNg ? "（×）" : ""}` : "かくれている所（タップでめくる）"}
      className={`relative inline-block rounded-md px-1 text-left align-middle transition-colors ${className} ${
        open
          ? isNg
            ? "!bg-ng/15 !text-ng ring-2 ring-ng"
            : "ring-1 ring-accent/30"
          : "min-w-[3.5em] !border-ng !bg-ng/85 !text-transparent hover:!bg-ng"
      }`}
    >
      {children}
      {isNg && <span className={`absolute -top-2 -right-2 flex size-4 items-center justify-center rounded-full text-[10px] font-bold ${open ? "bg-ng text-white" : "bg-white text-ng"}`}>×</span>}
    </button>
  );
}

export default function SheetView({ sheet, onBack }: { sheet: Sheet; onBack: () => void }) {
  const modes = modeStore.use();
  const mode = sheet.modes.find((m) => m.id === modes[sheet.id]) ?? sheet.modes[0];
  const progress = useSheetProgress();
  const ng = new Set(progress[sheetKey(sheet.id, mode.id)]?.ng ?? []);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const keys = cellsOf(sheet)
    .filter((c) => mode.hide.includes(c.field))
    .map((c) => c.key);

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
        <CategoryBadge category={sheet.category} sub={sheet.unit} />
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

      <SheetCtx.Provider value={{ hide: mode.hide, revealed, ng, tap }}>
        <div className="@container rounded-2xl border border-line bg-surface p-3 sm:p-4">
          {sheet.kind === "tree" && <Tree node={sheet.root} />}
          {sheet.kind === "cards" && <Cards sheet={sheet} />}
          {sheet.kind === "bars" && <Bars sheet={sheet} />}
        </div>
      </SheetCtx.Provider>

      <p className="text-xs text-muted">
        赤い所をタップするとめくれます。めくったあと、もう一度タップすると × がつきます（「×だけかくす」で復習）。
      </p>
      <p className="text-[11px] leading-relaxed text-muted">出典：{sheet.source}</p>
    </div>
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

// ───── 組織図 ─────
// 広いときは左から右へ、せまいときは上から下へ枝分かれする

const TONE: Record<NonNullable<TreeNode["tone"]>, string> = {
  amber: "bg-unsure/12",
  green: "bg-ok/12",
  blue: "bg-accent/10",
  gray: "bg-surface-2",
};

function Tree({ node }: { node: TreeNode }) {
  return (
    <div className="overflow-x-auto">
      <TreeNodeView node={node} />
    </div>
  );
}

function NameBox({ node, inline }: { node: TreeNode; inline: boolean }) {
  const name = node.name!;
  return (
    <div className={`flex gap-x-2 gap-y-1 ${inline ? "flex-wrap items-center" : "flex-col items-start"}`}>
      <Hide k={name} field="name" className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-base font-bold">
        {name}
      </Hide>
      {node.desc && (
        <Hide k={`${name}.desc`} field="desc" className={`text-sm leading-snug text-muted ${inline ? "max-w-[18em]" : "max-w-[18em] @2xl:max-w-[9em]"}`}>
          {node.desc}
        </Hide>
      )}
    </div>
  );
}

function TreeNodeView({ node, inGroup = false }: { node: TreeNode; inGroup?: boolean }) {
  if (node.label) {
    return (
      <div className={`rounded-xl px-3 py-2 ${TONE[node.tone ?? "gray"]}`}>
        <div className="mb-1 text-xs font-bold text-muted">【{node.label}】</div>
        <div className="space-y-2">
          {node.children?.map((c, i) => <TreeNodeView key={c.name ?? c.label ?? i} node={c} inGroup />)}
        </div>
      </div>
    );
  }
  const children = node.children ?? [];
  // まとまりの中では、子は下に出す（横に出すとはみ出す）
  const side = !inGroup;
  return (
    <div className={`flex flex-col ${side ? "@2xl:flex-row @2xl:items-center" : ""}`}>
      <div className="shrink-0">
        <NameBox node={node} inline={inGroup} />
      </div>
      {children.length > 0 && (
        <>
          {side && <div aria-hidden="true" className="hidden w-5 shrink-0 border-t border-ink/40 @2xl:block" />}
          <div className={`ml-4 flex flex-col ${side ? "@2xl:ml-0" : ""}`}>
            {children.map((c, i) => (
              <Branch key={c.name ?? c.label ?? i} first={i === 0} last={i === children.length - 1} side={side}>
                <TreeNodeView node={c} inGroup={inGroup} />
              </Branch>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** 子の箱の左に、枝の線を引く */
function Branch({ first, last, side, children }: { first: boolean; last: boolean; side: boolean; children: ReactNode }) {
  return (
    <div className="relative py-1 pl-5">
      <span
        aria-hidden="true"
        className={`absolute left-0 border-l border-ink/40 ${first && side ? "top-0 @2xl:top-1/2" : "top-0"} ${last ? "bottom-1/2" : "bottom-0"}`}
      />
      <span aria-hidden="true" className="absolute top-1/2 left-0 w-5 border-t border-ink/40" />
      {children}
    </div>
  );
}

// ───── 表（国ごとのランキングなど）─────

function Cards({ sheet }: { sheet: Extract<Sheet, { kind: "cards" }> }) {
  const [, labelHead, valueHead] = sheet.columns;
  return (
    <div className="grid gap-3 @md:grid-cols-2 @3xl:grid-cols-3">
      {sheet.cards.map((c) => (
        <div key={c.title} className="overflow-hidden rounded-xl border border-line">
          <div className="flex flex-wrap items-center justify-between gap-x-2 bg-surface-2 px-3 py-1.5">
            <Hide k={c.title} field="title" className="font-bold">
              {c.title}
            </Hide>
            {c.sub && <span className="text-[11px] text-muted">{c.sub}</span>}
          </div>
          <table className="w-full text-sm">
            <thead className="sr-only">
              <tr>
                <th>{sheet.columns[0]}</th>
                <th>{labelHead}</th>
                <th>{valueHead}</th>
              </tr>
            </thead>
            <tbody>
              {c.rows.map((r, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="w-10 whitespace-nowrap py-1.5 pr-2 pl-3 text-xs text-muted">{r.head ?? `${i + 1}位`}</td>
                  <td className="py-1.5">
                    <Hide k={`${c.title}/${i + 1}`} field="label">
                      {r.label}
                    </Hide>
                  </td>
                  <td className="min-w-16 whitespace-nowrap py-1.5 pr-3 pl-2 text-right tabular-nums text-muted">
                    <Hide k={`${c.title}/${i + 1}.value`} field="value">
                      {r.value}
                    </Hide>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ───── 帯グラフ（割合の移り変わり）─────

const SERIES_COLORS = ["#7fb0de", "#9aa0a8", "#e8b04f", "#7cc485", "#c497d6", "#e48c7c"];

function Bars({ sheet }: { sheet: Extract<Sheet, { kind: "bars" }> }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {sheet.series.map((s, i) => (
          <span key={s} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3.5 rounded-sm" style={{ background: SERIES_COLORS[i] }} />
            <Hide k={`series/${s}`} field="series" className="font-semibold">
              {s}
            </Hide>
          </span>
        ))}
        <span className="ml-auto text-xs text-muted">（％）</span>
      </div>
      <div className="space-y-2">
        {sheet.rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            <div className="w-[5.5em] shrink-0 text-right text-sm">
              <Hide k={`row/${r.label}`} field="row">
                {r.label}
              </Hide>
            </div>
            <div className="flex h-10 min-w-0 flex-1 overflow-hidden rounded-md border border-line">
              {r.percents.map((p, i) =>
                p > 0 ? (
                  <div
                    key={i}
                    className="flex items-center justify-center overflow-hidden border-r border-white/70 text-xs font-bold text-[#1f2933] last:border-r-0"
                    style={{ width: `${p}%`, background: SERIES_COLORS[i] }}
                  >
                    {p >= BAR_LABEL_MIN && (
                      <Hide k={`${r.label}/${sheet.series[i]}`} field="value" className="px-0.5 tabular-nums">
                        {p.toFixed(1)}
                      </Hide>
                    )}
                  </div>
                ) : null,
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
