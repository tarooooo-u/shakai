"use client";

import { RIKA_QUESTIONS } from "@/data/rika";
import { createLocalStore } from "@/lib/localStore";
import { leaveProfile, type Profile } from "@/lib/profiles";
import { needsReview, type Progress } from "@/lib/progress";
import { RIKA_CATEGORIES, RIKA_CATEGORY_LABEL, RIKA_CATEGORY_MARK, type RikaCategory } from "@/lib/rika/types";
import { ProfileBadge } from "../ProfileGate";
import SubjectSwitch from "../SubjectSwitch";
import SyncStatus from "../SyncStatus";

/** 理科のメニューから移動できる画面 */
export type RikaPage =
  | { kind: "home" }
  | { kind: "dashboard" }
  | { kind: "review" }
  | { kind: "category"; category: RikaCategory }
  | { kind: "credits" };

const CATEGORY_COUNT = Object.fromEntries(
  RIKA_CATEGORIES.map((c) => [c, RIKA_QUESTIONS.filter((q) => q.category === c).length]),
) as Record<RikaCategory, number>;

// PC で「アイコンだけ」に縮めた状態（社会とは別に覚える）
const collapsedStore = createLocalStore<boolean>("rika-drill:sidebar-collapsed:v1", false);

const samePage = (a: RikaPage, b: RikaPage) =>
  a.kind === b.kind && (a.kind !== "category" || a.category === (b as typeof a).category);

type NavProps = { page: RikaPage; collapsed: boolean; onNavigate: (page: RikaPage) => void };

function Item({ to, mark, label, count, tone, page, collapsed, onNavigate }: NavProps & { to: RikaPage; mark: string; label: string; count?: number; tone?: string }) {
  const active = samePage(page, to);
  return (
    <button
      type="button"
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      onClick={() => onNavigate(to)}
      className={`flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-sm transition-colors ${
        collapsed ? "justify-center" : ""
      } ${active ? "bg-accent/12 font-bold text-accent" : "text-ink hover:bg-surface-2"}`}
    >
      <span
        aria-hidden="true"
        className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold ${
          active ? "bg-accent text-accent-ink" : `bg-surface-2 ${tone ?? "text-muted"}`
        }`}
      >
        {mark}
      </span>
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {count !== undefined && <span className="text-xs tabular-nums text-muted">{count}</span>}
        </>
      )}
    </button>
  );
}

function Heading({ children, collapsed }: { children: string; collapsed: boolean }) {
  return collapsed ? (
    <div className="mx-2 my-2 border-t border-line" />
  ) : (
    <div className="px-2.5 pt-4 pb-1 text-[11px] font-bold tracking-wider text-muted">{children}</div>
  );
}

/** 理科のメニュー。rail＝PC・iPad横向き（左に常に出す）、drawer＝スマホ・iPad縦向き（上に重ねる） */
export default function RikaSidebar({
  mode,
  page,
  profile,
  progress,
  onNavigate,
  onClose,
}: {
  mode: "rail" | "drawer";
  page: RikaPage;
  profile: Profile;
  progress: Progress;
  onNavigate: (page: RikaPage) => void;
  onClose?: () => void;
}) {
  const storedCollapsed = collapsedStore.use();
  const collapsed = mode === "rail" && storedCollapsed;
  const reviewCount = RIKA_QUESTIONS.filter((q) => needsReview(progress[q.id])).length;
  const nav = { page, collapsed, onNavigate };

  return (
    <nav
      aria-label="メニュー"
      className={`flex h-full flex-col overflow-y-auto border-r border-line bg-surface px-2 py-3 ${
        mode === "rail" ? (collapsed ? "w-16" : "w-60") : "w-72 max-w-[85vw] shadow-xl"
      }`}
    >
      <div className={`mb-2 flex items-center gap-2 px-1 ${collapsed ? "justify-center" : ""}`}>
        <button
          type="button"
          aria-label={mode === "drawer" ? "メニューを閉じる" : collapsed ? "メニューを広げる" : "メニューを縮める"}
          onClick={() => (mode === "drawer" ? onClose?.() : collapsedStore.set(!storedCollapsed))}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-lg text-muted hover:bg-surface-2 hover:text-ink"
        >
          {mode === "drawer" ? "✕" : collapsed ? "»" : "«"}
        </button>
        {!collapsed && <SubjectSwitch subject="rika" onHome={() => onNavigate({ kind: "home" })} />}
      </div>

      <button
        type="button"
        onClick={leaveProfile}
        title={collapsed ? `${profile.name}（人を切りかえる）` : undefined}
        className={`mb-1 flex min-h-12 w-full items-center gap-2.5 rounded-xl border border-line px-2 text-left hover:bg-surface-2 ${
          collapsed ? "justify-center border-transparent" : ""
        }`}
      >
        <ProfileBadge profile={profile} size="sm" />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate font-bold">{profile.name}</span>
            <span className="text-xs text-muted">切りかえ</span>
          </>
        )}
      </button>

      <Item {...nav} to={{ kind: "home" }} mark="⌂" label="ホーム" />
      <Item {...nav} to={{ kind: "dashboard" }} mark="◎" label="ダッシュボード" />

      <Heading collapsed={collapsed}>じぶんの問題</Heading>
      <Item {...nav} to={{ kind: "review" }} mark="×" label="間違えた問題" count={reviewCount} tone="text-ng" />

      <Heading collapsed={collapsed}>分野</Heading>
      {RIKA_CATEGORIES.map((c) => (
        <Item {...nav} key={c} to={{ kind: "category", category: c }} mark={RIKA_CATEGORY_MARK[c]} label={RIKA_CATEGORY_LABEL[c]} count={CATEGORY_COUNT[c]} />
      ))}

      <Heading collapsed={collapsed}>おうちの人</Heading>
      <Item {...nav} to={{ kind: "credits" }} mark="©" label="画像・データの出典" />

      <div className="mt-auto pt-3">
        <SyncStatus compact={collapsed} />
      </div>
    </nav>
  );
}
