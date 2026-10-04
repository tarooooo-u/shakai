@AGENTS.md

# 社会ドリル

中学受験（最難関志望の小6）向け、社会の学習アプリ。将来は一般公開・マネタイズ予定（ログイン・Stripe）。

- 今はクライアントのみ（静的書き出し → Cloudflare Pages）。学習記録は `lib/progress.ts` の localStorage
- 問題データは `content/questions/{history,geography,civics}.csv`。書式は `content/README.md`、単元は `content/units.json`
  - `scripts/build-questions.mjs` が検証して `data/questions.generated.json`（git 管理外）を作る
- ロードマップと課題は `docs/社会学習roadmap.xlsx`
- UI文言は小学生が読める日本語で。難易度名に実在の学校名を使わない（「最難関」）

## 問題を追加・修正するとき（「inbox を処理して」）

1. `content/inbox/` のメモ・依頼を読む（形式はバラバラ。写真もある）
2. 1問ずつ CSV の行にする：単元・難易度を判断し、解説・漢字注意・誤答選択肢3つ・タグを補う
   - 問題文・解説は必ず自作の文章。塾テキスト・市販教材・過去問の文を写さない（同じ知識を問う別の文にする）
   - 事実の正確性が最優先。年号・統計・人名の漢字は特に確認する。自信がない点は出典メモに `要確認：…` と書き、報告する
   - 統計問題は何年のデータか分かるようにする（分からなければ `要確認`）
   - 誤答選択肢は「同じ種類で、まぎらわしいもの」（天皇なら天皇、条約なら条約）
   - 既存の問題と重複しないか確認する。id は各CSVの最大値の次から振り、既存 id は変えない
   - `確認` 列は空欄のまま（保護者が確認して `済` にする）
3. `npm run questions` でチェックを通す
4. 処理したファイルを `content/inbox/done/` に移し、追加した問題の一覧（id・問題・答え）と要確認点を報告する
5. CSV は UTF-8（BOM付き）・CRLF を維持する（Excel で開けるように）
