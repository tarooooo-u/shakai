"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createLocalStore } from "@/lib/localStore";
import {
  BAR_LABEL_MIN,
  MAIN_PERCENT,
  TOP3_PERCENT,
  cellsOf,
  hasMinorRows,
  isMainRow,
  setNg,
  sheetKey,
  touchSheet,
  useSheetProgress,
  type Sheet,
  type TreeNode,
} from "@/lib/sheets";
import { CategoryBadge, Chip } from "./ui";

// シートごとに、前に選んだかくし方を覚えておく
const modeStore = createLocalStore<Record<string, string>>("shakai-sheet-mode", {});
// シートごとに「大事なところだけ」（main）か「ぜんぶ」（all）か。はじめは main
const scopeStore = createLocalStore<Record<string, "main" | "all">>("shakai-sheet-scope", {});

type Ctx = {
  hide: string[];
  /** 表の大事でない行はかくさない */
  onlyMain: boolean;
  revealed: Set<string>;
  ng: Set<string>;
  tap: (key: string) => void;
};
const SheetCtx = createContext<Ctx>({ hide: [], onlyMain: false, revealed: new Set(), ng: new Set(), tap: () => {} });

/**
 * かくせる文字。かくすモードのときは赤い紙でおおう。
 * タップでめくる → もう一度タップで ×（もう一度で × を消す）
 * fill … 赤い紙をまわりのはばいっぱいにする（文字の長さで答えが分からないように。表の列など）
 * minor … 大事でない行。「大事なところだけ」のときはかくさず、うすく出す
 */
function Hide({
  k,
  field,
  children,
  className = "",
  fill = false,
  minor = false,
}: {
  k: string;
  field: string;
  children: ReactNode;
  className?: string;
  fill?: boolean;
  minor?: boolean;
}) {
  const { hide, onlyMain, revealed, ng, tap } = useContext(SheetCtx);
  if (minor && onlyMain && hide.includes(field)) return <span className={`${className} text-muted opacity-70`}>{children}</span>;
  if (!hide.includes(field)) return <span className={className}>{children}</span>;
  const open = revealed.has(k);
  const isNg = ng.has(k);
  return (
    <button
      type="button"
      onClick={() => tap(k)}
      aria-label={open ? `${typeof children === "string" ? children : ""}${isNg ? "（×）" : ""}` : "かくれている所（タップでめくる）"}
      className={`relative rounded-md px-1 text-left align-middle transition-colors ${fill ? "block w-full" : "inline-block"} ${className} ${
        open
          ? isNg
            ? "!bg-ng/15 !text-ng ring-2 ring-ng"
            : "ring-1 ring-accent/30"
          : "min-w-[5em] !border-ng !bg-ng/85 !text-transparent hover:!bg-ng"
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
  const scopes = scopeStore.use();
  const canScope = hasMinorRows(sheet) && (mode.hide.includes("label") || mode.hide.includes("value"));
  const onlyMain = canScope && (scopes[sheet.id] ?? "main") === "main";
  const progress = useSheetProgress();
  const ng = new Set(progress[sheetKey(sheet.id, mode.id)]?.ng ?? []);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const keys = cellsOf(sheet, onlyMain)
    .filter((c) => mode.hide.includes(c.field))
    .map((c) => c.key);

  useEffect(() => touchSheet(sheet.id, mode.id), [sheet.id, mode.id]);

  const selectScope = (scope: "main" | "all") => {
    scopeStore.set({ ...scopeStore.get(), [sheet.id]: scope });
    setRevealed(new Set());
  };
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
      {canScope && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted">かくす所</span>
          <Chip selected={onlyMain} onClick={() => selectScope("main")}>
            大事なところだけ
          </Chip>
          <Chip selected={!onlyMain} onClick={() => selectScope("all")}>
            ぜんぶ
          </Chip>
        </div>
      )}

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

      <SheetCtx.Provider value={{ hide: mode.hide, onlyMain, revealed, ng, tap }}>
        <div className="@container rounded-2xl border border-line bg-surface p-3 sm:p-4">
          {sheet.kind === "tree" && <Tree node={sheet.root} />}
          {sheet.kind === "cards" && <Cards sheet={sheet} />}
          {sheet.kind === "bars" && <Bars sheet={sheet} />}
          {sheet.kind === "lines" && <Lines sheet={sheet} />}
        </div>
      </SheetCtx.Provider>

      <p className="text-xs text-muted">
        赤い所をタップするとめくれます。めくったあと、もう一度タップすると × がつきます（「×だけかくす」で復習）。
        {canScope && `「大事なところだけ」は、1位・${MAIN_PERCENT}%以上・3位までで${TOP3_PERCENT}%以上の行をかくし、ほかはうすく見せます。`}
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
            <div className="min-w-0 flex-1">
              <Hide k={c.title} field="title" className="font-bold" fill>
                {c.title}
              </Hide>
            </div>
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
                    <Hide k={`${c.title}/${i + 1}`} field="label" fill minor={!isMainRow(c, i)}>
                      {r.label}
                    </Hide>
                  </td>
                  <td className="min-w-16 whitespace-nowrap py-1.5 pr-3 pl-2 text-right tabular-nums text-muted">
                    <Hide k={`${c.title}/${i + 1}.value`} field="value" className="text-right" fill minor={!isMainRow(c, i)}>
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
              <Hide k={`row/${r.label}`} field="row" fill>
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

// ───── 折れ線グラフ（普及率の移り変わりなど）─────
// 線には A・B… の記号だけを書き、下の「A ＝ 〇〇」の名前をかくす（入試の「A〜Dはどれか」の形）

const LINE_COLORS = ["#2b6cb0", "#c05621", "#2f855a", "#b83280", "#6b46c1", "#4a5568"];
const LINE_DASH = ["", "8 4", "", "3 3", "8 3 2 3", ""];
const LETTERS = "ABCDEFGH";

const W = 640;
const H = 360;
const PAD = { left: 36, right: 14, top: 22, bottom: 30 };

function Lines({ sheet }: { sheet: Extract<Sheet, { kind: "lines" }> }) {
  const { years, yMax } = sheet;
  const first = years[0];
  const last = years[years.length - 1];
  const x = (year: number) => PAD.left + ((year - first) / (last - first)) * (W - PAD.left - PAD.right);
  const y = (v: number) => H - PAD.bottom - (v / yMax) * (H - PAD.top - PAD.bottom);
  const yTicks = Array.from({ length: 6 }, (_, i) => (yMax / 5) * i);
  const xTicks = years.filter((yr) => yr % 5 === 0);
  // 調査がない年（null）では線を切る
  const path = (values: (number | null)[]) =>
    values
      .map((v, i) => (v === null ? null : `${i > 0 && values[i - 1] !== null ? "L" : "M"}${x(years[i]).toFixed(1)},${y(v).toFixed(1)}`))
      .filter(Boolean)
      .join("");

  // 広いとき（iPad の横など）は、名前の欄をグラフの右に並べる
  return (
    <div className="space-y-3 @3xl:grid @3xl:grid-cols-[minmax(0,1fr)_14rem] @3xl:items-center @3xl:gap-4 @3xl:space-y-0">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[460px] w-full" style={{ maxHeight: "55vh" }} role="img" aria-label={sheet.title}>
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="currentColor" className="text-line" />
              <text x={PAD.left - 5} y={y(v) + 4} textAnchor="end" fontSize="11" fill="currentColor" className="text-muted tabular-nums">
                {v}
              </text>
            </g>
          ))}
          <text x={PAD.left - 5} y={PAD.top - 9} textAnchor="end" fontSize="10" fill="currentColor" className="text-muted">
            （{sheet.yUnit}）
          </text>
          {xTicks.map((yr) => (
            <text key={yr} x={x(yr)} y={H - PAD.bottom + 16} textAnchor="middle" fontSize="11" fill="currentColor" className="text-muted tabular-nums">
              {yr % 10 === 0 ? yr : `’${String(yr).slice(2)}`}
            </text>
          ))}
          <text x={W - PAD.right} y={H - 2} textAnchor="end" fontSize="10" fill="currentColor" className="text-muted">
            （年）
          </text>
          {sheet.marks.map((m) => (
            <g key={m.label}>
              <line x1={x(m.year)} x2={x(m.year)} y1={PAD.top} y2={H - PAD.bottom} stroke="currentColor" strokeDasharray="2 3" className="text-muted" />
              <text x={x(m.year) + 3} y={PAD.top - 6} fontSize="10" fill="currentColor" className="text-muted">
                {m.year} {m.label}
              </text>
            </g>
          ))}
          {sheet.series.map((l, i) => (
            <path
              key={l.name}
              d={path(l.values)}
              fill="none"
              stroke={LINE_COLORS[i % LINE_COLORS.length]}
              strokeWidth="2.5"
              strokeDasharray={LINE_DASH[i % LINE_DASH.length]}
              strokeLinejoin="round"
            />
          ))}
          {sheet.series.map((l, i) => {
            const v = l.values[years.indexOf(l.labelAt)] ?? 0;
            return (
              <g key={l.name} transform={`translate(${x(l.labelAt)},${y(v)})`}>
                <circle r="10" fill="white" stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth="2" />
                <text y="4" textAnchor="middle" fontSize="12" fontWeight="bold" fill={LINE_COLORS[i % LINE_COLORS.length]}>
                  {LETTERS[i]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="grid gap-2 @md:grid-cols-2 @3xl:grid-cols-1">
        {sheet.series.map((l, i) => (
          <div key={l.name} className="flex items-center gap-2 rounded-xl border border-line px-3 py-1.5">
            <span className="w-4 shrink-0 text-center font-bold" style={{ color: LINE_COLORS[i % LINE_COLORS.length] }}>
              {LETTERS[i]}
            </span>
            <svg aria-hidden="true" width="28" height="8" className="shrink-0">
              <line x1="0" x2="28" y1="4" y2="4" stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth="2.5" strokeDasharray={LINE_DASH[i % LINE_DASH.length]} />
            </svg>
            <div className="min-w-0 flex-1">
              <Hide k={`series/${l.name}`} field="series" className="font-semibold" fill>
                {l.name}
              </Hide>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
