# 社会ドリル

中学受験 社会（歴史・地理・政治・経済）の一問一答 Web アプリ。
答えを見て 〇（完璧）／△（うろ覚え）／×（間違い）で自己採点し、△・× は自動で「要復習」に入る。

- ログイン・サーバーなし。学習記録はブラウザの localStorage に保存（端末ごと）
- iPad / スマホ / PC 対応。キーボード操作：Space で答え、1・2・3 で 〇・△・×、Esc で終了

## 開発

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # 本番ビルド確認
npm run lint
```

## 構成

| パス | 内容 |
|---|---|
| `data/questions.ts` | 問題データ（ここに追加する） |
| `lib/types.ts` | 問題の型・分野／難易度の表示名 |
| `lib/progress.ts` | 学習記録（localStorage） |
| `lib/session.ts` | 出題条件の絞り込み |
| `components/` | 画面（Home / Quiz / Result / ReviewList） |
| `docs/社会学習roadmap.xlsx` | ロードマップ・課題管理表 |

## 問題の追加ルール

- `id` は一度付けたら変えない（学習記録のキー）。歴史 `h`、地理 `g`、政治 `p`、経済 `e` + 3桁
- 問題文・解説は自分の文章で書く（市販教材・塾テキストの丸写しはしない）
- 統計の問題は、何年のデータかを解説に書く
- 画像は `public/images/` に置き、`imageUrl: "/images/xxx.png"` で指定

## 公開

GitHub に push → [Vercel](https://vercel.com/new) でリポジトリをインポート（設定はデフォルトのままでOK）。
以後は push するたびに自動で公開される。
