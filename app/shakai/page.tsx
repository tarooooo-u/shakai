import type { Metadata } from "next";
import { Suspense } from "react";
import App from "@/components/App";

export const metadata: Metadata = {
  title: "社会ドリル｜中学受験 社会の一問一答",
  description: "中学受験の社会（歴史・地理・政治・経済）をサクッと確認できる一問一答。間違えた問題は自動で復習リストへ。",
};

export default function Page() {
  // App が URL のクエリ（共有リンクの出題条件）を読むため Suspense で囲む
  return (
    <Suspense>
      <App />
    </Suspense>
  );
}
