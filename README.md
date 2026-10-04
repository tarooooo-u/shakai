# 社会ドリル

中学受験 社会（歴史・地理・公民）の学習 Web アプリ。

- **カード**：答えを見て 〇（完璧）／△（うろ覚え）／×（間違い）で自己採点
- **4択**：選んで即判定。当たっても自信がなければ「まぐれ（△）」
- △・× は自動で「要復習」に入る
- 分野・単元・難易度・テーマ（人物・漢字・統計など）で絞り込み
- 保護者向け：問題と答えの一覧（口頭で出題用）、出題範囲を URL で子どもに送る
- ログイン・サーバーなし。学習記録はブラウザの localStorage に保存（端末ごと）

## 開発

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # 本番ビルド（out/ に静的ファイル）
npm run questions  # 問題データのチェックだけ
npm run lint
```

## 構成

| パス | 内容 |
|---|---|
| `content/questions/*.csv` | 問題データ（書き方は [content/README.md](content/README.md)） |
| `content/units.json` | 単元の一覧 |
| `content/inbox/` | 問題のタネ置き場（Claude Code が整形して CSV に追加） |
| `scripts/build-questions.mjs` | CSV を検証して `data/questions.generated.json` を生成 |
| `lib/` | 型・学習記録・出題条件 |
| `components/` | 画面（Home / Quiz / Result / QuestionList） |
| `docs/社会学習roadmap.xlsx` | ロードマップ・課題管理表 |

## 公開（Cloudflare Pages）

Cloudflare ダッシュボード → Workers & Pages → Pages → Git に接続 → このリポジトリを選ぶ。

- ビルドコマンド：`npm run build`
- 出力ディレクトリ：`out`

以後は push するたびに自動で公開される。

## 統計データ（e-Stat）

`npm run stats` で e-Stat API から生産量・漁港別出荷量のランキングを取得し、`content/stats/rankings.csv` に保存する（出典・年つき）。
アプリIDは `.env.local` の `ESTAT_APP_ID`（見本は `.env.example`）。新しい年の統計が出たら `scripts/update-stats.mjs` の表ID・年を差し替える。
表の探し方：`node scripts/estat.mjs search <語>` ／ `node scripts/estat.mjs meta <表ID>`

## 雨温図（気象庁）

`npm run climate` で気象庁の2020年平年値をダウンロードし、各気象台の月平均気温・月降水量を `content/climate/normals.csv` に保存する。
問題CSVの「画像」列に `climate:地点番号`（例：`climate:47662` は東京）と書くと、その地点の雨温図を表示する。

## 問題用の画像（Wikimedia Commons）

`npm run images` で `scripts/fetch-images.mjs` の SUBJECTS にある画像を Wikimedia Commons から取得し、
長い辺 480px 以内の WebP にして `public/images/q/` に保存、作者・ライセンスを `content/images.csv` に書く。
使うのはパブリックドメイン／CC0／CC BY／CC BY-SA のみ（それ以外は自動でスキップ）。出典はアプリの「画像・データの出典」に表示される。

問題CSVの「画像」列：
- `img:名前` … その画像を問題に表示（例：写真を見て「この建物は？」）
- `choices` … 答えと誤答選択肢を画像で並べる4択（例：「法隆寺はどれか」）。選択肢すべてに画像が必要
