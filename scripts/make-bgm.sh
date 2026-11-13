#!/bin/sh
# BGM の元データ（bgm-src/*.wav、Suno からダウンロードした WAV）を配信用の MP3（public/bgm/）にする。
#
# やること（1 曲ずつ）:
#   1. ステレオをモノラルに混ぜる（アプリは書き出し時にモノラルにするので、配る時点でモノラルにして半分の大きさにする）
#   2. 曲の大きさを測り（EBU R128 の統合ラウドネス）、-16 LUFS になるよう一定のゲインをかける。3 曲を切り替えても音量が変わらないように
#   3. リミッターで最大音量を -1.5 dB に抑える（ゲインで山が 0 dB を超えないように）
#   4. 頭 20 ms と末尾 50 ms を短くフェードして、ループの折り返しでプチッと鳴らないようにする
#   5. 44.1 kHz（アプリの BGM_SAMPLE_RATE と同じ。再生時のリサンプルを避ける）、96 kbps の MP3 にする
#
# 使い方: scripts/make-bgm.sh   （ffmpeg と ffprobe が要る。brew install ffmpeg）
set -eu
cd "$(dirname "$0")/.."

TARGET_LUFS=-16

for name in yasashii hazumu shizuka; do
  src="bgm-src/$name.wav"
  out="public/bgm/$name.mp3"

  # 2. モノラルにしたときの大きさを測る（ebur128 のまとめの I: 行）
  measured=$(ffmpeg -hide_banner -nostats -i "$src" \
    -af "pan=mono|c0=0.5*c0+0.5*c1,ebur128=framelog=quiet" -f null - 2>&1 \
    | awk '/^ +I:/ { print $2 }')
  gain=$(echo "$TARGET_LUFS - ($measured)" | bc)

  # 4. 末尾のフェードの開始位置（曲の長さ - 0.05 秒）
  duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$src")
  fade_out_start=$(echo "$duration - 0.05" | bc)

  ffmpeg -hide_banner -loglevel error -y -i "$src" \
    -af "pan=mono|c0=0.5*c0+0.5*c1,volume=${gain}dB,alimiter=limit=0.84:level=false:attack=5:release=50,afade=t=in:d=0.02,afade=t=out:st=${fade_out_start}:d=0.05,aresample=44100" \
    -ac 1 -ar 44100 -c:a libmp3lame -b:a 96k -id3v2_version 3 "$out"

  # 結果の確認（大きさと最大音量）
  result=$(ffmpeg -hide_banner -nostats -i "$out" -af "ebur128=peak=true:framelog=quiet" -f null - 2>&1 \
    | awk '/^ +I:/ { i=$2 } /^ +Peak:/ { p=$2 } END { print i " LUFS, peak " p " dBFS" }')
  size=$(wc -c < "$out" | tr -d ' ')
  echo "$name: measured $measured LUFS, gain ${gain} dB -> $result, ${duration}s, ${size} bytes"
done
