"use client";

import { useState } from "react";
import {
  addProfile,
  removeProfile,
  renameProfile,
  selectProfile,
  useProfiles,
  type Profile,
  type ProfileColor,
} from "@/lib/profiles";

const COLOR_STYLE: Record<ProfileColor, string> = {
  accent: "bg-accent text-accent-ink",
  ok: "bg-ok text-accent-ink",
  unsure: "bg-unsure text-accent-ink",
  ng: "bg-ng text-accent-ink",
};

export function ProfileBadge({ profile, size = "md" }: { profile: Profile; size?: "sm" | "md" | "lg" }) {
  const box = { sm: "size-7 text-sm", md: "size-10 text-lg", lg: "size-16 text-3xl" }[size];
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${box} ${COLOR_STYLE[profile.color]}`}
    >
      {[...profile.name][0]}
    </span>
  );
}

const MAX_NAME = 10;

/** アプリを開いたとき「だれがやる？」を選ぶ画面。名前の追加・変更・削除もここで */
export default function ProfileGate() {
  const profiles = useProfiles();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const first = profiles.length === 0;

  const add = () => {
    const n = name.trim();
    if (!n) return;
    const p = addProfile(n.slice(0, MAX_NAME));
    setName("");
    if (first) selectProfile(p.id);
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-10">
      <header className="space-y-1 text-center">
        <h1 className="text-3xl font-bold">社会ドリル</h1>
        <p className="text-muted">{first ? "はじめに、名前を入れてください" : "だれがやる？"}</p>
      </header>

      {!first && (
        <ul className="space-y-2.5">
          {profiles.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              {editing ? (
                <>
                  <ProfileBadge profile={p} />
                  <input
                    defaultValue={p.name}
                    maxLength={MAX_NAME}
                    aria-label={`${p.name}の名前`}
                    onBlur={(e) => e.target.value.trim() && renameProfile(p.id, e.target.value.trim())}
                    className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`「${p.name}」と、その学習記録・お気に入りを消します。よろしいですか？`)) {
                        removeProfile(p.id);
                      }
                    }}
                    className="min-h-12 rounded-xl border border-ng/60 px-3 text-sm font-bold text-ng hover:bg-ng/10"
                  >
                    消す
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => selectProfile(p.id)}
                  className="flex min-h-20 w-full items-center gap-4 rounded-2xl border-2 border-line bg-surface px-5 text-left text-2xl font-bold transition-colors hover:border-accent"
                >
                  <ProfileBadge profile={p} size="lg" />
                  {p.name}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {(first || editing) && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
          className="flex gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME}
            placeholder="なまえ（ニックネームでOK）"
            aria-label="追加する名前"
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-lg"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="min-h-12 rounded-xl bg-accent px-5 font-bold text-accent-ink disabled:opacity-40"
          >
            {first ? "はじめる" : "追加"}
          </button>
        </form>
      )}

      {!first && (
        <button
          type="button"
          onClick={() => setEditing(!editing)}
          className="mx-auto min-h-11 text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          {editing ? "できた" : "名前の追加・変更（おうちの人）"}
        </button>
      )}

      <p className="text-center text-[11px] leading-relaxed text-muted">
        学習記録は、名前ごとにこの端末だけに保存されます。
      </p>
    </main>
  );
}
