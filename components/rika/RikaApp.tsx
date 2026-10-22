"use client";

import { useEffect, useState } from "react";
import { RIKA_QUESTIONS } from "@/data/rika";
import { leaveProfile, useCurrentProfile, useHydrated, type Profile } from "@/lib/profiles";
import { isGraduated, needsReview, statusOf, type Progress } from "@/lib/progress";
import { useRikaProgress } from "@/lib/rika/progress";
import { RIKA_CATEGORIES, RIKA_CATEGORY_LABEL, RIKA_CATEGORY_MARK, RIKA_UNIT_GROUPS, type RikaCategory, type RikaQuestion } from "@/lib/rika/types";
import { useAppBoot, useRememberSubject } from "@/lib/subjects";
import { ProfileBadge } from "../ProfileGate";
import SubjectSwitch, { useSubjectGuard } from "../SubjectSwitch";
import { Section } from "../ui";
import RikaSidebar, { type RikaPage } from "./RikaSidebar";

/**
 * 理科ドリル（/rika）。社会（components/App.tsx）とは画面・問題・記録を共有しない。
 * 今はガワだけ：問題を解く画面（カード・4択）は、問題を入れるときに作る。
 */
export default function RikaApp() {
  const hydrated = useHydrated();
  const profile = useCurrentProfile();
  useAppBoot();
  useSubjectGuard("rika", profile !== null, hydrated);

  if (!hydrated || !profile) return null;
  return (
    <div data-subject="rika" className="flex flex-1">
      <Main key={profile.id} profile={profile} />
    </div>
  );
}

function Main({ profile }: { profile: Profile }) {
  useRememberSubject("rika");
  const progress = useRikaProgress();
  const [page, setPage] = useState<RikaPage>({ kind: "home" });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const navigate = (next: RikaPage) => {
    setPage(next);
    setDrawerOpen(false);
    window.scrollTo(0, 0);
  };

  const content = (() => {
    switch (page.kind) {
      case "home":
        return <Home progress={progress} profile={profile} onNavigate={navigate} />;
      case "dashboard":
        return <Dashboard progress={progress} />;
      case "review":
        return <Review progress={progress} />;
      case "category":
        return <CategoryPage key={page.category} category={page.category} progress={progress} />;
      case "credits":
        return <Credits />;
    }
  })();

  return (
    <div className="flex flex-1">
      <div className="sticky top-0 hidden h-dvh shrink-0 md:block">
        <RikaSidebar mode="rail" page={page} profile={profile} progress={progress} onNavigate={navigate} />
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <RikaSidebar mode="drawer" page={page} profile={profile} progress={progress} onNavigate={navigate} onClose={() => setDrawerOpen(false)} />
          <button type="button" aria-label="メニューを閉じる" className="flex-1 bg-black/30" onClick={() => setDrawerOpen(false)} />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/95 px-2 py-1.5 backdrop-blur md:hidden">
          <button
            type="button"
            aria-label="メニューを開く"
            onClick={() => setDrawerOpen(true)}
            className="flex size-10 items-center justify-center rounded-xl text-xl hover:bg-surface-2"
          >
            ☰
          </button>
          <SubjectSwitch subject="rika" onHome={() => navigate({ kind: "home" })} />
          <button
            type="button"
            onClick={leaveProfile}
            aria-label={`${profile.name}（人を切りかえる）`}
            className="flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold hover:bg-surface-2"
          >
            <ProfileBadge profile={profile} size="sm" />
            {profile.name}
          </button>
        </div>
        <main className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 sm:py-8">{content}</main>
      </div>
    </div>
  );
}

// ───── 画面 ─────

function countOf(questions: RikaQuestion[], progress: Progress) {
  let graduated = 0;
  let review = 0;
  let check = 0;
  for (const q of questions) {
    const r = progress[q.id];
    if (isGraduated(r)) graduated++;
    if (needsReview(r)) review++;
    if (statusOf(r) === "check") check++;
  }
  return { total: questions.length, graduated, review, check };
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <div className="text-xs font-bold text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

/** 問題がまだないときの案内 */
function Empty({ children }: { children: string }) {
  return <p className="rounded-2xl border border-dashed border-line bg-surface p-5 text-sm leading-relaxed text-muted">{children}</p>;
}

function Home({ progress, profile, onNavigate }: { progress: Progress; profile: Profile; onNavigate: (p: RikaPage) => void }) {
  const c = countOf(RIKA_QUESTIONS, progress);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted">{profile.name}さん</p>
        <h1 className="text-2xl font-bold">理科ドリル</h1>
      </header>

      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="問題" value={c.total} />
        <Stat label="間違えた" value={c.review} />
        <Stat label="卒業" value={c.graduated} />
      </div>

      {RIKA_QUESTIONS.length === 0 && (
        <Empty>まだ問題がありません。生物・地学・化学の一部から、少しずつ問題を入れていきます。</Empty>
      )}

      <Section title="分野">
        <ul className="grid gap-2.5 sm:grid-cols-3">
          {RIKA_CATEGORIES.map((cat) => (
            <li key={cat}>
              <button
                type="button"
                onClick={() => onNavigate({ kind: "category", category: cat })}
                className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 text-left hover:border-accent"
              >
                <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/12 font-bold text-accent">
                  {RIKA_CATEGORY_MARK[cat]}
                </span>
                <span className="min-w-0 flex-1 font-bold">{RIKA_CATEGORY_LABEL[cat]}</span>
                <span className="text-xs tabular-nums text-muted">{RIKA_QUESTIONS.filter((q) => q.category === cat).length}問</span>
              </button>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

/** 単元ごとの問題数と卒業数（小見出しごと） */
function UnitGroups({ category, progress }: { category: RikaCategory; progress: Progress }) {
  return (
    <div className="space-y-4">
      {RIKA_UNIT_GROUPS[category].map((g) => (
        <div key={g.label} className="space-y-1.5">
          <h3 className="text-xs font-bold text-muted">{g.label}</h3>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {g.units.map((u) => {
              const c = countOf(RIKA_QUESTIONS.filter((q) => q.category === category && q.unit === u), progress);
              const rate = c.total ? c.graduated / c.total : 0;
              return (
                <li key={u} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">{u}</span>
                  <span className="h-2 w-20 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                    <span className="block h-full bg-ok" style={{ width: `${rate * 100}%` }} />
                  </span>
                  <span className="w-16 text-right text-xs tabular-nums text-muted">
                    {c.total ? `${c.graduated}/${c.total}` : "0問"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

// 入試の日（カウントダウン用）
const EXAM_DATE = new Date(2027, 1, 1);
const DAY = 24 * 60 * 60 * 1000;

function Dashboard({ progress }: { progress: Progress }) {
  const [now] = useState(() => Date.now());
  const daysLeft = Math.ceil((EXAM_DATE.getTime() - now) / DAY);
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        {daysLeft > 0 && <p className="text-sm text-muted">入試まで あと {daysLeft}日</p>}
      </header>
      {RIKA_CATEGORIES.map((cat) => (
        <Section key={cat} title={RIKA_CATEGORY_LABEL[cat]}>
          <UnitGroups category={cat} progress={progress} />
        </Section>
      ))}
    </div>
  );
}

function CategoryPage({ category, progress }: { category: RikaCategory; progress: Progress }) {
  const c = countOf(RIKA_QUESTIONS.filter((q) => q.category === category), progress);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted">分野</p>
        <h1 className="text-2xl font-bold">{RIKA_CATEGORY_LABEL[category]}</h1>
      </header>
      {c.total === 0 && <Empty>この分野の問題は、まだありません。</Empty>}
      <UnitGroups category={category} progress={progress} />
    </div>
  );
}

function Review({ progress }: { progress: Progress }) {
  const ids = RIKA_QUESTIONS.filter((q) => needsReview(progress[q.id]));
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">間違えた問題</h1>
      {ids.length === 0 ? (
        <Empty>△・× をつけた問題が、ここに集まります。</Empty>
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {ids.map((q) => (
            <li key={q.id} className="px-4 py-3 text-sm">
              <div>{q.question}</div>
              <div className="mt-1 font-bold text-accent">{q.answer}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Credits() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">画像・データの出典</h1>
        <p className="mt-1 text-sm text-muted">理科の問題で使う画像・データの出典を、ここにまとめます。</p>
      </header>
      <Empty>まだ画像・データは使っていません。</Empty>
    </div>
  );
}
