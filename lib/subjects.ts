"use client";

import { useEffect } from "react";
import { createProfileStore } from "./profiles";
import { removeLegacyData } from "./progress";
import { startSync } from "./sync";

/**
 * 教科。社会（/shakai）と理科（/rika）は、画面・問題・学習記録をすべて別々に持つ。
 * 共通なのはプロフィール・サーバーとの同期・卒業のしくみ（lib/progress.ts の statusOf など）だけ。
 * - 社会の記録の名前は今まで通り（progress:v2 など）。理科は "rika-" をつける（rika-progress:v1 など）
 * - 教科ごとのコードは 社会＝components/・lib/・content/ の直下（もとからの場所）、理科＝各フォルダの rika/
 */
export const SUBJECTS = ["shakai", "rika"] as const;
export type Subject = (typeof SUBJECTS)[number];

export const SUBJECT_META: Record<Subject, { label: string; app: string; path: string; mark: string }> = {
  shakai: { label: "社会", app: "社会ドリル", path: "/shakai", mark: "社" },
  rika: { label: "理科", app: "理科ドリル", path: "/rika", mark: "理" },
};

/** アプリ全体の名前（「だれがやる？」の画面など） */
export const APP_NAME = "中学受験ドリル";

export const isSubject = (s: unknown): s is Subject => typeof s === "string" && (SUBJECTS as readonly string[]).includes(s);

// 最後に使った教科（プロフィールごと。サーバーにも保存するので、ほかの端末でも同じ教科から始まる）
const lastStore = createProfileStore<Subject | null>("subject:v1", null, "whole");

export const getLastSubject = (profileId: string) => {
  const s = lastStore.getFor(profileId);
  return isSubject(s) ? s : null;
};

/** 教科の画面を開いたときに呼ぶ */
export function useRememberSubject(subject: Subject) {
  useEffect(() => {
    if (lastStore.get() !== subject) lastStore.set(subject);
  }, [subject]);
}

/** どの画面から開いても1回だけ：古い記録の片づけと、サーバーとの同期 */
export function useAppBoot() {
  useEffect(removeLegacyData, []);
  useEffect(startSync, []);
}

/** 入口（/）へのアドレス。to＝その教科に入る、pick＝教科を選ぶ画面を出す */
export function entryHref(opts: { to?: Subject; pick?: boolean; query?: string } = {}) {
  const p = new URLSearchParams(opts.query ?? "");
  if (opts.to) p.set("to", opts.to);
  if (opts.pick) p.set("pick", "1");
  const q = p.toString();
  return q ? `/?${q}` : "/";
}
