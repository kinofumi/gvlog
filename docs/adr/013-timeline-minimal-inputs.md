# 013 timeline/ の関数は素材ではなく必要な値だけを受け取る

日付: 2026-10-13

## 状況
プランでは `adjustDuration(items, id, newFrames)` や `compileTimeline(project)` のように、素材やプロジェクトを丸ごと渡す形だった。
M1 で実装するとき、純粋関数のテストに不要なフィールド（blobKey、width など）を毎回書くことになり、読みにくかった。

## 選択肢
1. プランどおり `MediaItem[]` / `Project` を受け取る
2. 必要な値だけを受け取る。尺の配分は `number[]`、区間計算は `TimelineItem`（itemId、durationFrames、transitionOut?、caption?）

## 決定
2 を採用。`MediaItem` は `TimelineItem` を含む型にして、そのまま渡せるようにする。
素材の配列と尺の対応付け（index ↔ itemId）は state 層で行う。

## 理由
テストが短く、関数の責務が名前どおりになる。timeline/ が model の細部に依存しないので、M2 以降でモデルが増えても壊れない。
