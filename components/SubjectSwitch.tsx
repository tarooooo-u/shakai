"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SUBJECT_META, entryHref, type Subject } from "@/lib/subjects";

/** メニューの上の教科名。押すと「どの教科をやる？」にもどる */
export default function SubjectSwitch({ subject, onHome }: { subject: Subject; onHome: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <button type="button" onClick={onHome} className="min-w-0 truncate rounded-lg px-1 text-base font-bold hover:text-accent">
        {SUBJECT_META[subject].app}
      </button>
      <button
        type="button"
        onClick={() => router.push(entryHref({ pick: true }))}
        aria-label="教科を切りかえる"
        title="教科を切りかえる"
        className="ml-auto flex min-h-9 shrink-0 items-center gap-1 rounded-lg bg-accent/10 px-2 text-xs font-bold text-accent hover:bg-accent/20"
      >
        <span aria-hidden="true">⇄</span>教科
      </button>
    </div>
  );
}

/** 人が選ばれていない（開き直した・人を切りかえた）ときは入口へ */
export function useSubjectGuard(subject: Subject, hasProfile: boolean, hydrated: boolean) {
  const router = useRouter();
  // この画面で人が選ばれていたか。選ばれていた → 「人を切りかえる」を押した。一度もない → 開き直した
  const hadProfile = useRef(false);
  useEffect(() => {
    if (hasProfile) {
      hadProfile.current = true;
      return;
    }
    if (!hydrated) return;
    // 人を切りかえたら、選んだ人が前に使った教科へ。開き直したら同じ教科（共有リンクのクエリもそのまま）へ
    router.replace(entryHref(hadProfile.current ? {} : { to: subject, query: window.location.search.slice(1) }));
  }, [subject, hasProfile, hydrated, router]);
}
