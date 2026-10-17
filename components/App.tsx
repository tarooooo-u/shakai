"use client";

import { useEffect, useState } from "react";
import { MAP_SETS, PLACES, PLACE_BY_ID, QUESTIONS, QUESTION_BY_ID, SHEETS } from "@/data";
import { useFavorites } from "@/lib/favorites";
import { filterSet, placeChoices, recordKey, runTargets, type KindGroup, type MapMode, type MapRun } from "@/lib/mapSets";
import { isGraduated, needsReview, removeLegacyData, useProgress } from "@/lib/progress";
import { leaveProfile, useCurrentProfile, useHydrated, type Profile } from "@/lib/profiles";
import { buildChoices, type Style } from "@/lib/session";
import { startSync } from "@/lib/sync";
import { CATEGORY_LABEL, UNITS, type Grade } from "@/lib/types";
import Home from "./Home";
import ProfileGate, { ProfileBadge } from "./ProfileGate";
import QuestionList from "./QuestionList";
import Quiz from "./Quiz";
import Result from "./Result";
import Sidebar, { THEMES, type Page } from "./Sidebar";
import Credits from "./Credits";
import MapSetQuiz from "./MapSetQuiz";
import MapSetsPage from "./MapSetsPage";
import SheetView from "./SheetView";
import SheetsPage from "./SheetsPage";
import TopicPage from "./TopicPage";

export type Session = {
  ids: string[];
  style: Style;
  /** 4択の選択肢（開始時に決めておく）。null の問題はカードで出す */
  choices: Record<string, string[] | null>;
  /** 始めたときにもう卒業していた問題（結果画面で「今回卒業」を数えるため） */
  graduatedBefore: string[];
};

/** サイドバーで選んだ画面の上に重ねて出すもの（演習・結果・一覧） */
type Overlay =
  | null
  | { kind: "quiz"; session: Session }
  | { kind: "result"; session: Session; results: Record<string, Grade> }
  | { kind: "list"; title: string; ids: string[] }
  | { kind: "mapquiz"; run: MapRun }
  | { kind: "mapresult"; run: MapRun; results: Record<string, Grade> }
  | { kind: "sheet"; id: string };

const ALL_UNITS = Object.values(UNITS).flat();

export default function App() {
  const hydrated = useHydrated();
  const profile = useCurrentProfile();

  // プロフィールに分ける前の記録は使わない（リセット）
  useEffect(removeLegacyData, []);
  // 学習記録をサーバーと同期する
  useEffect(startSync, []);

  if (!hydrated) return null;
  if (!profile) return <ProfileGate />;
  // 人が変わったら画面の状態もすべて最初から
  return <Main key={profile.id} profile={profile} />;
}

function Main({ profile }: { profile: Profile }) {
  const progress = useProgress();
  const favorites = useFavorites();
  const [page, setPage] = useState<Page>({ kind: "home" });
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // 同じ問題セットで再スタートしたときに Quiz の状態をリセットするため
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const show = (next: Overlay) => {
    setOverlay(next);
    window.scrollTo(0, 0);
  };
  const navigate = (next: Page) => {
    setPage(next);
    setDrawerOpen(false);
    show(null);
  };
  const start = (ids: string[], style: Style) => {
    if (ids.length === 0) return;
    // 4択のときは全問、カードのときも画像で選ぶ問題と「4択のみ」の問題は選択肢を用意する
    const choices = Object.fromEntries(
      ids
        .map((id) => QUESTION_BY_ID.get(id)!)
        .filter((q) => style === "choice" || q.imageChoices || q.choiceOnly)
        .map((q) => [q.id, buildChoices(q)]),
    );
    const graduatedBefore = ids.filter((id) => isGraduated(progress[id]));
    setRunKey((k) => k + 1);
    show({ kind: "quiz", session: { ids, style, choices, graduatedBefore } });
  };
  // 白地図ドリル。group でしぼった種類だけ。onlyIds があればその地名だけ（結果画面の「もう一度」）
  const startMap = (setId: string, group: KindGroup, mode: MapMode, style: Style, onlyIds?: string[]) => {
    const set = filterSet(MAP_SETS.find((s) => s.id === setId)!, group, PLACE_BY_ID);
    const targets = runTargets(set, mode, progress, onlyIds);
    const choices =
      mode === "name" && style === "choice"
        ? Object.fromEntries(targets.map((id) => [id, placeChoices(PLACE_BY_ID.get(id)!, set, PLACES)]))
        : {};
    const graduatedBefore = targets.filter((id) => isGraduated(progress[recordKey(id, mode)]));
    setRunKey((k) => k + 1);
    show({ kind: "mapquiz", run: { setId, group, mode, style, targets, choices, graduatedBefore } });
  };
  const openList = (title: string, ids: string[]) => show({ kind: "list", title, ids });
  const back = () => show(null);

  const content = (() => {
    if (overlay?.kind === "quiz") {
      const { session } = overlay;
      return (
        <Quiz
          key={runKey}
          session={session}
          onFinish={(results) => {
            const answered = session.ids.filter((id) => results[id]);
            if (answered.length === 0) return back();
            show({ kind: "result", session: { ...session, ids: answered }, results });
          }}
        />
      );
    }
    if (overlay?.kind === "result") {
      const { session, results } = overlay;
      return (
        <Result
          ids={session.ids}
          results={results}
          graduated={session.ids.filter((id) => isGraduated(progress[id]) && !session.graduatedBefore.includes(id))}
          onRetry={(ids) => start(ids, session.style)}
          onHome={back}
        />
      );
    }
    if (overlay?.kind === "mapquiz") {
      const { run } = overlay;
      return (
        <MapSetQuiz
          key={runKey}
          run={run}
          onFinish={(results) => {
            const answered = run.targets.filter((id) => results[id]);
            if (answered.length === 0) return back();
            show({ kind: "mapresult", run: { ...run, targets: answered }, results });
          }}
        />
      );
    }
    if (overlay?.kind === "mapresult") {
      const { run, results } = overlay;
      return (
        <Result
          ids={run.targets}
          results={results}
          graduated={run.targets.filter((id) => isGraduated(progress[recordKey(id, run.mode)]) && !run.graduatedBefore.includes(id))}
          onRetry={(ids) => startMap(run.setId, run.group, run.mode, run.style, ids)}
          onHome={back}
          describe={(id) => {
            const p = PLACE_BY_ID.get(id)!;
            return { question: `${p.kind}${p.reading ? `（${p.reading}）` : ""}`, answer: p.name, kanjiNote: p.kanjiNote };
          }}
        />
      );
    }
    if (overlay?.kind === "sheet") {
      const sheet = SHEETS.find((s) => s.id === overlay.id);
      if (sheet) return <SheetView key={sheet.id} sheet={sheet} onBack={back} />;
    }
    if (overlay?.kind === "list") {
      return (
        <QuestionList
          title={overlay.title}
          ids={overlay.ids}
          progress={progress}
          onStart={(ids) => start(ids, "card")}
          onBack={back}
        />
      );
    }

    switch (page.kind) {
      case "home":
        return <Home progress={progress} onStart={start} onOpenList={openList} onOpenReview={() => navigate({ kind: "review" })} />;
      case "favorites":
        return (
          <QuestionList
            title="お気に入り"
            ids={favorites.filter((id) => QUESTION_BY_ID.has(id))}
            progress={progress}
            onStart={(ids) => start(ids, "card")}
            emptyMessage="問題カードの ☆ を押すと、ここに集まります。"
          />
        );
      case "review":
        return (
          <QuestionList
            title="間違えた問題"
            ids={QUESTIONS.filter((q) => needsReview(progress[q.id])).map((q) => q.id)}
            progress={progress}
            onStart={(ids) => start(ids, "card")}
            emptyMessage="△・× をつけた問題が、ここに集まります。"
          />
        );
      case "category":
        return (
          <TopicPage
            key={page.category}
            label="分野"
            title={CATEGORY_LABEL[page.category]}
            questions={QUESTIONS.filter((q) => q.category === page.category)}
            unitOrder={UNITS[page.category]}
            progress={progress}
            onStart={start}
            onOpenList={openList}
          />
        );
      case "theme": {
        const theme = THEMES.find((t) => t.tag === page.tag);
        return (
          <TopicPage
            key={page.tag}
            label="テーマ"
            title={theme?.label ?? page.tag}
            questions={QUESTIONS.filter((q) => q.tags.includes(page.tag))}
            unitOrder={ALL_UNITS}
            progress={progress}
            onStart={start}
            onOpenList={openList}
          />
        );
      }
      case "mapsets":
        return <MapSetsPage progress={progress} onStart={startMap} />;
      case "sheets":
        return <SheetsPage onOpen={(id) => show({ kind: "sheet", id })} />;
      case "credits":
        return <Credits />;
      case "all":
        return (
          <QuestionList
            title="問題と答えの一覧"
            ids={QUESTIONS.map((q) => q.id)}
            progress={progress}
            onStart={(ids) => start(ids, "card")}
          />
        );
    }
  })();

  return (
    <div className="flex flex-1">
      {/* PC・iPad横向き：左に常に出す */}
      <div className="sticky top-0 hidden h-dvh shrink-0 md:block">
        <Sidebar mode="rail" page={page} profile={profile} progress={progress} onNavigate={navigate} />
      </div>

      {/* スマホ・iPad縦向き：上に重ねて開く */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <Sidebar mode="drawer" page={page} profile={profile} progress={progress} onNavigate={navigate} onClose={() => setDrawerOpen(false)} />
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
          <button type="button" onClick={() => navigate({ kind: "home" })} className="rounded-lg px-1 font-bold hover:text-accent">
            社会ドリル
          </button>
          <button
            type="button"
            onClick={leaveProfile}
            aria-label={`${profile.name}（人を切りかえる）`}
            className="ml-auto flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold hover:bg-surface-2"
          >
            <ProfileBadge profile={profile} size="sm" />
            {profile.name}
          </button>
        </div>
        {/* データシートは図が横に広いので、はばを広くとる */}
        <main className={`mx-auto w-full px-4 py-5 sm:px-6 sm:py-8 ${overlay?.kind === "sheet" ? "max-w-5xl" : "max-w-3xl"}`}>{content}</main>
      </div>
    </div>
  );
}
