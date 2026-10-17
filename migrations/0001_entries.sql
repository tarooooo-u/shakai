-- 学習記録。1行 = 1つの記録（問題1問ぶん、データシート1枚ぶん、プロフィール一覧まるごと など）
-- owner : Cloudflare Access でログインした保護者のメール（将来は保護者アカウントの id）
-- doc   : 記録の種類（端末の localStorage のキーから "shakai-drill:" を取ったもの。例 p:<プロフィールid>:progress:v2）
-- k     : doc の中のキー（問題id など。まるごと保存するものは "_"）
-- v     : 中身（JSON）
-- last  : 端末でその記録を更新した時刻 (ms)。同じキーは新しいほうを残す
-- updated_at : サーバーに書いた時刻 (ms)
CREATE TABLE entries (
  owner TEXT NOT NULL,
  doc TEXT NOT NULL,
  k TEXT NOT NULL,
  v TEXT NOT NULL,
  last INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (owner, doc, k)
);
