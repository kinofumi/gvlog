# 019 「つなげる」に BGM を付ける（AAC、ループと末尾フェードアウト）

日付: 2026-11-12

## 状況

利用者の要望「数曲 BGM を用意して試聴と選択できるようにしたい」。これまで出力は無音 MP4（plan §0「音声」）。
聞いたうえでの決定: BGM を付けるのは「つなげる」（合体版）だけ。各自の 15 秒に付けると、つなげたときに境界で曲が途切れる。
曲は利用者が著作権フリーのものを後で渡す。それまでは Python で合成した仮の 3 曲（`public/bgm/`）。

## 選択肢

1. WebCodecs の AudioEncoder で AAC にエンコードする（mediabunny の `AudioBufferSource`）。曲は Web Audio でデコードし、ループとフェードアウトは自前の純粋関数
2. 曲を AAC（.m4a）で用意し、パケットをデコードせずにコピーする（`EncodedAudioPacketSource`）。エンコーダ不要で古い端末でも動く
3. 音声は付けず、利用者が別のアプリで付ける

## 決定

1 を採用。

- `bgm/loop.ts`（純粋）: `loopedChunk` が曲をループさせ、`fadeGain` で末尾 2 秒を直線でフェードアウト。`totalSamplesFor` で動画とぴったり同じ長さ。
- `bgm/bgmAudio.ts`（ブラウザ）: `loadBgm` が fetch と `OfflineAudioContext.decodeAudioData`（44.1 kHz）をして、`mixToMono` で 1 チャンネルにする
  （decodeAudioData はチャンネル数を変えないので、ステレオの曲でも対応確認・エンコード・メモリ見積もりがモノラルで一致するように）。
  `createBgmProvider` が出力の長さ（`totalSamples`）を持ち、1 秒ずつ `AudioBuffer` を作る。`canEncodeBgm` は mediabunny の `canEncodeAudio('aac')`（1 チャンネル）。
- `export/encoder.ts`: `createMp4Encoder(..., withAudio)` で AAC の音声トラックを足し、`addAudio` で順に渡す。`exportFrames` は映像を全部エンコードしたあとに BGM を 1 秒ずつ足し、
  その間は進捗の `stage: 'bgm'`（画面は「BGM を付けています…」）。組み立て役 `exportProject` は `export/exportProject.ts` に分けた（BGM の対応確認は最初に行う）。
- `bgm/useBgm.ts` + `components/BgmPicker.tsx`: 対応の確認、曲の選択、`<audio controls preload="none">` で試聴。読み込み中は生成を始めない。
- 作れない端末では曲を選べなくし理由を出す。書き出し側でも `canEncodeBgm` を確かめて、だめなら分かる文で止める。

## 理由

- 1 は、フェードアウトと「曲の長さに関係なくループ」ができ、曲の形式も問わない（MP3 でも可）。コードは純粋関数 + 薄い包みで教科書向き。
- 2 はフェードアウトができず、曲の長さで切るしかない。パケットの時刻をずらしてループする処理も説明しにくい。
- 1 の弱点は対応端末: iPhone の Safari は AudioEncoder に iOS 26（2025-09）から対応。それより古い iPhone では BGM なしで生成する。
  フィールドテストから 1 年以上あとの利用なので許容した。

## 影響

- 出力は「H.264 + AAC の MP4」になる（BGM なしなら従来どおり無音）。写真アプリ・ギャラリー・CapCut での扱いは実機で確認する（チェックリスト）。
- メモリ: デコードした曲はモノラルにそろえるので 44.1 kHz で 1 分あたり約 10 MB（ステレオの曲でも同じ）。曲は 1〜2 分のループを想定する。出力側は 1 秒ずつ作るので増えない。
- 試聴は同時に 1 曲だけで、タブを離れたときと書き出し中は止める（`BgmPicker` が `active` を受ける）。
- BGM の分だけ書き出しが長くなる（AAC のエンコードは映像より十分速い）。進捗バーは映像のぶんだけで、BGM の間は 100% の手前で止まって見える。
- 曲の差し替えは `public/bgm/` と `bgm/tracks.ts`（題名と出どころ）を直すだけ。

## 追記（2026-11-13）: 本番の曲に差し替え

- 利用者が Suno（有料の Pro プラン。無料プランの曲は非商用に限られ権利も Suno 側に残るので、公開リポジトリで配る曲には使えない）で 3 曲（やさしい 98 秒、はずむ 79 秒、しずか 93 秒、いずれもインスト）を生成し、WAV でダウンロードした。
- 国内のフリー BGM サイトは「動画に使う」のは自由でも音源ファイルの再配布を禁じるところが多く、`public/bgm/` に置いて配る形と合わないため、生成に寄せた。
- 元の WAV（1 曲 15〜19 MB）は `bgm-src/` に置き `.gitignore` でコミットしない。配信用は `scripts/make-bgm.sh` で作る: モノラルに混ぜ、EBU R128 の統合ラウドネスが -16 LUFS になる一定のゲイン、リミッターで最大 -1.5 dB、頭 20 ms と末尾 50 ms の短いフェード、44.1 kHz・96 kbps の MP3（1 曲約 1 MB）。
- 「はずむ」は最初 17 秒しか生成されなかった。プロンプトの「crisp final hit」と構成タグの少なさが原因と見て、終わり方の指定を弱め構成タグを増やしたら 79 秒になった。
- 画面の出どころ表示（`credit`）は「Suno で生成（Pro プラン、2026-11）」。
