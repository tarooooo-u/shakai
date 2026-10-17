"use client";

import { syncNow, useSyncState } from "@/lib/sync";

/** 学習記録をサーバーに保存できているか。メニューの下と「だれがやる？」の画面に小さく出す */
export default function SyncStatus({ compact = false }: { compact?: boolean }) {
  const { status, pending } = useSyncState();

  const view = (() => {
    switch (status) {
      case "login":
        return { mark: "!", tone: "text-ng", text: "ログインが切れました。ページを開き直してください" };
      case "offline":
        return pending > 0
          ? { mark: "…", tone: "text-unsure", text: "まだ保存していない記録があります（つながったら保存します）" }
          : { mark: "…", tone: "text-muted", text: "サーバーにつながっていません" };
      case "ok":
        return pending > 0 ? { mark: "↑", tone: "text-muted", text: "保存中…" } : { mark: "✓", tone: "text-ok", text: "記録は保存ずみ" };
      default:
        return { mark: "↑", tone: "text-muted", text: "保存中…" };
    }
  })();

  return (
    <button
      type="button"
      // ログインが切れたら、開き直すと Access のログイン画面になる
      onClick={status === "login" ? () => window.location.reload() : syncNow}
      title={view.text}
      aria-label={view.text}
      className={`flex min-h-10 w-full items-center gap-2 rounded-xl px-2 text-left text-xs hover:bg-surface-2 ${compact ? "justify-center" : ""} ${view.tone}`}
    >
      <span aria-hidden="true" className="w-5 shrink-0 text-center font-bold">{view.mark}</span>
      {!compact && <span className="min-w-0">{view.text}</span>}
    </button>
  );
}
