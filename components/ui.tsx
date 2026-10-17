import type { ReactNode } from "react";
import { GRADUATE_STREAK, statusOf, type QuestionRecord } from "@/lib/progress";
import { CATEGORY_LABEL, DIFFICULTY_LABEL, type Category, type Difficulty, type Grade } from "@/lib/types";

export const GRADE_META: Record<Grade, { mark: string; label: string; key: string }> = {
  ok: { mark: "〇", label: "完璧", key: "1" },
  unsure: { mark: "△", label: "うろ覚え", key: "2" },
  ng: { mark: "×", label: "間違い", key: "3" },
};

const GRADE_TEXT: Record<Grade, string> = {
  ok: "text-ok",
  unsure: "text-unsure",
  ng: "text-ng",
};

export function GradeMark({ grade }: { grade: Grade }) {
  return <span className={`font-bold ${GRADE_TEXT[grade]}`}>{GRADE_META[grade].mark}</span>;
}

/** 卒業までの進み具合。まだ解いていない問題には出さない */
export function StatusBadge({ record }: { record: QuestionRecord | undefined }) {
  const status = statusOf(record);
  if (!record || status === "new") return null;
  const [text, style] =
    status === "graduated"
      ? ["卒業ずみ", "border-ok/50 text-ok"]
      : status === "check"
        ? ["卒業の確認", "border-ok/50 text-ok"]
        : record.streak > 0
          ? [`あと${GRADUATE_STREAK - record.streak}回〇で卒業`, "border-line text-muted"]
          : ["練習中", "border-line text-muted"];
  return <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style}`}>{text}</span>;
}

const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  basic: "border-line text-muted",
  standard: "border-accent/40 text-accent",
  advanced: "border-unsure/50 text-unsure",
  top: "border-ng/50 text-ng",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${DIFFICULTY_STYLE[difficulty]}`}>
      {DIFFICULTY_LABEL[difficulty]}
    </span>
  );
}

export function CategoryBadge({ category, sub }: { category: Category; sub?: string }) {
  return (
    <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted">
      {CATEGORY_LABEL[category]}
      {sub ? `・${sub}` : ""}
    </span>
  );
}

export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
        selected
          ? "border-accent bg-accent text-accent-ink"
          : "border-line bg-surface text-ink hover:border-accent/60"
      }`}
    >
      {children}
    </button>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className="text-xs font-bold tracking-wider text-muted">{title}</h2>
      {children}
    </section>
  );
}

export function SmallChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-9 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
        selected ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface text-ink hover:border-accent/60"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * 画面の下に固定する帯（「答えを見る」「〇△×」「次へ」など）。
 * 地図や長い解説があっても、スクロールせずに押せるように
 */
export function BottomBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`sticky bottom-0 z-20 -mx-4 border-t border-line bg-bg/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6 ${className}`}
    >
      {children}
    </div>
  );
}

const GRADE_BUTTON: Record<Grade, string> = {
  ok: "border-ok text-ok hover:bg-ok/10",
  unsure: "border-unsure text-unsure hover:bg-unsure/10",
  ng: "border-ng text-ng hover:bg-ng/10",
};

/** 答えを見たあとの採点。self は 〇△×（自己採点）、auto は自動で採点したあとの「次へ」（正解なら「まぐれ」も） */
export function GradeButtons({
  self,
  correct,
  onGrade,
}: {
  self: boolean;
  correct: boolean;
  onGrade: (g: Grade) => void;
}) {
  if (self)
    return (
      <div className="grid grid-cols-3 gap-2.5">
        {(["ok", "unsure", "ng"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onGrade(g)}
            className={`flex min-h-16 items-center justify-center gap-2 rounded-2xl border-2 bg-surface transition-colors ${GRADE_BUTTON[g]}`}
          >
            <span className="text-3xl leading-none font-bold">{GRADE_META[g].mark}</span>
            <span className="text-sm font-semibold">{GRADE_META[g].label}</span>
          </button>
        ))}
      </div>
    );
  return (
    <div className={`grid gap-2.5 ${correct ? "grid-cols-2" : "grid-cols-1"}`}>
      <button
        type="button"
        onClick={() => onGrade(correct ? "ok" : "ng")}
        className="min-h-16 rounded-2xl bg-accent text-lg font-bold text-accent-ink transition-opacity hover:opacity-90"
      >
        次へ
      </button>
      {correct && (
        <button
          type="button"
          onClick={() => onGrade("unsure")}
          className={`min-h-16 rounded-2xl border-2 bg-surface font-bold transition-colors ${GRADE_BUTTON.unsure}`}
        >
          △ まぐれだった
        </button>
      )}
    </div>
  );
}

/** 帯の大きなボタン（「答えを見る」「けってい」） */
export function BarButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="min-h-16 w-full rounded-2xl bg-accent text-lg font-bold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** ☆／★ お気に入りの切り替え */
export function FavoriteButton({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "お気に入りから外す" : "お気に入りに追加"}
      title={on ? "お気に入りから外す" : "お気に入りに追加"}
      onClick={onClick}
      className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-xl transition-colors ${
        on ? "bg-unsure/15 text-unsure" : "text-muted hover:bg-surface-2 hover:text-unsure"
      }`}
    >
      {on ? "★" : "☆"}
    </button>
  );
}
