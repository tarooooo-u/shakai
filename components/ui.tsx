import type { ReactNode } from "react";
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
