"use client";

import { useState } from "react";
import { useProgress } from "@/lib/progress";
import type { Grade } from "@/lib/types";
import Home from "./Home";
import Quiz from "./Quiz";
import Result from "./Result";
import ReviewList from "./ReviewList";

type View =
  | { kind: "home" }
  | { kind: "quiz"; ids: string[] }
  | { kind: "result"; ids: string[]; results: Record<string, Grade> }
  | { kind: "list" };

export default function App() {
  const progress = useProgress();
  const [view, setView] = useState<View>({ kind: "home" });
  // 同じ問題セットで再スタートしたときに Quiz の状態をリセットするため
  const [runKey, setRunKey] = useState(0);

  const start = (ids: string[]) => {
    if (ids.length === 0) return;
    setRunKey((k) => k + 1);
    setView({ kind: "quiz", ids });
    window.scrollTo(0, 0);
  };
  const home = () => {
    setView({ kind: "home" });
    window.scrollTo(0, 0);
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 sm:px-6 sm:py-8">
      {view.kind === "home" && (
        <Home progress={progress} onStart={start} onOpenList={() => setView({ kind: "list" })} />
      )}
      {view.kind === "quiz" && (
        <Quiz
          key={runKey}
          ids={view.ids}
          onFinish={(results) => {
            const answered = view.ids.filter((id) => results[id]);
            if (answered.length === 0) return home();
            setView({ kind: "result", ids: answered, results });
          }}
        />
      )}
      {view.kind === "result" && (
        <Result ids={view.ids} results={view.results} onRetry={start} onHome={home} />
      )}
      {view.kind === "list" && <ReviewList progress={progress} onStart={start} onHome={home} />}
    </main>
  );
}
