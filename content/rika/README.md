# 理科の問題データ

社会（`content/` の直下）とは別。`npm run questions` で `scripts/rika/build-questions.mjs` が検証し、`data/rika/questions.generated.json`（git 管理外）を作る。

## ファイル

- `questions/biology.csv`（生物・id `b0001`〜）／`earth.csv`（地学・`e0001`〜）／`chemistry.csv`（化学の一部・`c0001`〜）
- `units.json` … 分野ごとの単元。単元を足したら `unit-groups.json`（ダッシュボードの小見出し）にも入れる

## 列

社会の CSV（`content/README.md`）と同じ書き方。都道府県・地図・時事テーマの列はない。

| 列 | 書き方 |
|---|---|
| id | 分野の頭文字＋4けた。各CSVの最大値の次から。既存の id は変えない |
| 単元 | `units.json` のどれか |
| 分類 | 任意（こん虫・岩石 など） |
| 難易度 | 基本／標準／発展／最難関 |
| 学年 | 4／5／6 か空欄 |
| 問題・答え・別解 | 別解は `|` 区切り |
| 誤答選択肢 | `|` 区切りで3つ以上。同じ種類で、まぎらわしいもの |
| 解説・漢字注意・タグ | |
| 画像 | `img:名前`（写真1枚を見せる。「写真の鳥を何というか」など）、`imgs:名前\|名前\|…`（2〜6枚にア・イ・ウ…を付けて並べる）、`choices`（答えと誤答選択肢を写真で並べて選ぶ。いつも4択で出す。「冬鳥はどれか」「秋の七草ではないものはどれか」など）。名前は `images.csv` の「名前」 |
| 出典メモ・確認・参考過去問 | 社会と同じ。確認は保護者が `済` にする |
| 出題形式 | 選択肢を見ないと答えられない問題は `4択のみ` |

CSV は UTF-8（BOM付き）・CRLF。

## 写真（`images.csv`）

- `npm run rika:images` で Wikimedia Commons から取って `public/images/rika/` に保存し、出典を `images.csv` に書く（社会の `npm run images` とは別）。取るものは `scripts/rika/fetch-images.mjs` の SUBJECTS に書く
- パブリックドメイン／CC0／CC BY／CC BY-SA のみ。取ったら1枚ずつ目で確かめる（絵・葉や実だけ・別の種類のことがある）。合わないときは `npm run rika:images -- --find 学名 flower` で候補をさがし、SUBJECTS に `file:` で書く
- 写真で見分けにくい組み合わせ（カッコウとホトトギス、ハルジオンとヒメジョオンなど）は、同じ問題の選択肢に入れない
- 問題で使っている写真は、理科の「画像・データの出典」ページに自動で出る
