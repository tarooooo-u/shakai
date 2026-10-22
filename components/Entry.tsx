"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { leaveProfile, useCurrentProfile, useHydrated, type Profile } from "@/lib/profiles";
import { APP_NAME, SUBJECTS, SUBJECT_META, getLastSubject, isSubject, useAppBoot, type Subject } from "@/lib/subjects";
import ProfileGate, { ProfileBadge } from "./ProfileGate";
import SyncStatus from "./SyncStatus";

/**
 * 入口（/）。「だれがやる？」→ その人が前に使った教科へそのまま入る。
 * - ?to=rika   … その教科に入る（教科の画面を開き直したときなど）
 * - ?pick=1    … 教科を選ぶ画面を出す（教科の画面の「切りかえ」から）
 * - そのほかのクエリ（?u=江戸&n=7 など、前からある社会の共有リンク）は社会に渡す
 */
export default function Entry() {
  useAppBoot();
  const hydrated = useHydrated();
  const profile = useCurrentProfile();

  if (!hydrated) return null;
  if (!profile) return <ProfileGate />;
  return <Route key={profile.id} profile={profile} />;
}

function Route({ profile }: { profile: Profile }) {
  const router = useRouter();
  // Next はもどってきた画面の状態を残すので、URL はその時どきのものを読む
  const params = useSearchParams();
  const p = new URLSearchParams(params.toString());
  const to = p.get("to");
  const pick = p.get("pick") === "1";
  p.delete("to");
  p.delete("pick");
  const rest = p.toString();
  const last = getLastSubject(profile.id);
  const target: Subject | null = pick ? null : isSubject(to) ? to : rest ? "shakai" : last;
  const href = (s: Subject, query = "") => `${SUBJECT_META[s].path}${query ? `?${query}` : ""}`;
  const enter = (s: Subject) => router.replace(href(s));

  useEffect(() => {
    if (target) router.replace(href(target, rest));
  }, [target, rest, router]);

  if (target) return null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-10">
      <header className="space-y-1 text-center">
        <h1 className="text-3xl font-bold">{APP_NAME}</h1>
        <p className="text-muted">どの教科をやる？</p>
      </header>

      <ul className="space-y-3">
        {SUBJECTS.map((s) => (
          <li key={s} data-subject={s}>
            <button
              type="button"
              onClick={() => enter(s)}
              aria-label={`${SUBJECT_META[s].label}${s === last ? "（前回）" : ""}`}
              className="flex min-h-24 w-full items-center gap-4 rounded-2xl border-2 border-accent/40 bg-accent/8 px-5 text-left transition-colors hover:border-accent"
            >
              <span
                aria-hidden="true"
                className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-2xl font-bold text-accent-ink"
              >
                {SUBJECT_META[s].mark}
              </span>
              <span className="min-w-0 flex-1 text-2xl font-bold text-accent">{SUBJECT_META[s].label}</span>
              {s === last && <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-muted">前回</span>}
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={leaveProfile}
        className="mx-auto flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-muted hover:bg-surface-2 hover:text-ink"
      >
        <ProfileBadge profile={profile} size="sm" />
        {profile.name}（人を切りかえる）
      </button>

      <div className="mx-auto w-fit">
        <SyncStatus />
      </div>
    </main>
  );
}
