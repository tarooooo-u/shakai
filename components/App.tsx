"use client";

import { useState } from "react";
import { QUESTION_BY_ID } from "@/data";
import { useProgress } from "@/lib/progress";
import { buildChoices, type Style } from "@/lib/session";
import type { Grade } from "@/lib/types";
import Home from "./Home";
import QuestionList from "./QuestionList";
import Quiz from "./Quiz";
import Result from "./Result";

export type Session = {
  ids: string[];
  style: Style;
  /** 4択の選択肢（開始時に決めておく）。null の問題はカードで出す */
  choices: Record<string, string[] | null>;
};

type View =
  | { kind: "home" }
  | { kind: "quiz"; session: Session }
  | { kind: "result"; session: Session; results: Record<string, Grade> }
  | { kind: "list"; title: string; ids: string[] };

export default function App() {
  const progress = useProgress();
  const [view, setView] = useState<View>({ kind: "home" });
  // 同じ問題セットで再スタートしたときに Quiz の状態をリセットするため
  const [runKey, setRunKey] = useState(0);

  const go = (next: View) => {
    setView(next);
    window.scrollTo(0, 0);
  };
  const start = (ids: string[], style: Style) => {
    if (ids.length === 0) return;
    const choices =
      style === "choice" ? Object.fromEntries(ids.map((id) => [id, buildChoices(QUESTION_BY_ID.get(id)!)])) : {};
    setRunKey((k) => k + 1);
    go({ kind: "quiz", session: { ids, style, choices } });
  };
  const home = () => go({ kind: "home" });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 sm:px-6 sm:py-8">
      {view.kind === "home" && (
        <Home progress={progress} onStart={start} onOpenList={(title, ids) => go({ kind: "list", title, ids })} />
      )}
      {view.kind === "quiz" && (
        <Quiz
          key={runKey}
          session={view.session}
          onFinish={(results) => {
            const answered = view.session.ids.filter((id) => results[id]);
            if (answered.length === 0) return home();
            go({ kind: "result", session: { ...view.session, ids: answered }, results });
          }}
        />
      )}
      {view.kind === "result" && (
        <Result
          ids={view.session.ids}
          results={view.results}
          onRetry={(ids) => start(ids, view.session.style)}
          onHome={home}
        />
      )}
      {view.kind === "list" && (
        <QuestionList
          title={view.title}
          ids={view.ids}
          progress={progress}
          onStart={(ids) => start(ids, "card")}
          onHome={home}
        />
      )}
    </main>
  );
}
