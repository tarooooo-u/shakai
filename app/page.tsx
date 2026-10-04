import { Suspense } from "react";
import App from "@/components/App";

export default function Page() {
  // App が URL のクエリ（共有リンクの出題条件）を読むため Suspense で囲む
  return (
    <Suspense>
      <App />
    </Suspense>
  );
}
