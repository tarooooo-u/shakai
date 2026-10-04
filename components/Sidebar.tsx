"use client";

import { QUESTIONS } from "@/data";
import { useFavorites } from "@/lib/favorites";
import { createLocalStore } from "@/lib/localStore";
import { needsReview, type Progress } from "@/lib/progress";
import { CATEGORIES, CATEGORY_LABEL, type Category } from "@/lib/types";

/** サイドバーから移動できる画面 */
export type Page =
  | { kind: "home" }
  | { kind: "favorites" }
  | { kind: "review" }
  | { kind: "category"; category: Category }
  | { kind: "theme"; tag: string }
  | { kind: "all" };

/** テーマ：タグで分野をまたいで問題を集める（問題が1つもないテーマは出さない） */
export const THEMES = [
  { tag: "漢字", label: "漢字まちがえやすい", mark: "漢" },
  { tag: "白地図", label: "白地図", mark: "白" },
  { tag: "雨温図", label: "雨温図", mark: "雨" },
  { tag: "人物", label: "人物", mark: "人" },
].filter((t) => QUESTIONS.some((q) => q.tags.includes(t.tag)));

const CATEGORY_MARK: Record<Category, string> = { history: "歴", geography: "地", civics: "公" };
const CATEGORY_COUNT = Object.fromEntries(
  CATEGORIES.map((c) => [c, QUESTIONS.filter((q) => q.category === c).length]),
) as Record<Category, number>;
const THEME_COUNT = Object.fromEntries(
  THEMES.map((t) => [t.tag, QUESTIONS.filter((q) => q.tags.includes(t.tag)).length]),
);

// PC で「アイコンだけ」に縮めた状態を覚えておく
const collapsedStore = createLocalStore<boolean>("shakai-drill:sidebar-collapsed:v1", false);

const samePage = (a: Page, b: Page) =>
  a.kind === b.kind &&
  (a.kind !== "category" || a.category === (b as typeof a).category) &&
  (a.kind !== "theme" || a.tag === (b as typeof a).tag);

type NavProps = { page: Page; collapsed: boolean; onNavigate: (page: Page) => void };

function Item({
  to,
  mark,
  label,
  count,
  tone,
  page,
  collapsed,
  onNavigate,
}: NavProps & { to: Page; mark: string; label: string; count?: number; tone?: string }) {
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

/**
 * mode="rail"   … PC・iPad横向き。画面の左に常に出ていて、アイコンだけに縮められる
 * mode="drawer" … スマホ・iPad縦向き。ボタンで上に重ねて開く
 */
export default function Sidebar({
  mode,
  page,
  progress,
  onNavigate,
  onClose,
}: {
  mode: "rail" | "drawer";
  page: Page;
  progress: Progress;
  onNavigate: (page: Page) => void;
  onClose?: () => void;
}) {
  const favorites = useFavorites();
  const storedCollapsed = collapsedStore.use();
  const collapsed = mode === "rail" && storedCollapsed;
  const reviewCount = QUESTIONS.filter((q) => needsReview(progress[q.id])).length;
  const favoriteCount = favorites.filter((id) => QUESTIONS.some((q) => q.id === id)).length;
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
        {!collapsed && <span className="text-base font-bold">社会ドリル</span>}
      </div>

      <Item {...nav} to={{ kind: "home" }} mark="⌂" label="ホーム" />

      <Heading collapsed={collapsed}>じぶんの問題</Heading>
      <Item {...nav} to={{ kind: "favorites" }} mark="★" label="お気に入り" count={favoriteCount} tone="text-unsure" />
      <Item {...nav} to={{ kind: "review" }} mark="×" label="間違えた問題" count={reviewCount} tone="text-ng" />

      <Heading collapsed={collapsed}>分野</Heading>
      {CATEGORIES.map((c) => (
        <Item
          {...nav}
          key={c}
          to={{ kind: "category", category: c }}
          mark={CATEGORY_MARK[c]}
          label={CATEGORY_LABEL[c]}
          count={CATEGORY_COUNT[c]}
        />
      ))}

      {THEMES.length > 0 && <Heading collapsed={collapsed}>テーマ</Heading>}
      {THEMES.map((t) => (
        <Item {...nav} key={t.tag} to={{ kind: "theme", tag: t.tag }} mark={t.mark} label={t.label} count={THEME_COUNT[t.tag]} />
      ))}

      <Heading collapsed={collapsed}>おうちの人</Heading>
      <Item {...nav} to={{ kind: "all" }} mark="≡" label="問題と答えの一覧" />
    </nav>
  );
}
