#!/usr/bin/env bash
# 書き出した MP4 を検証する。
#   1. ffprobe で属性（コーデック、解像度、fps、尺、音声なし）を表示する
#   2. 冒頭・中央・末尾のフレームを PNG に取り出して目視できるようにする
# 使い方: scripts/verify-output.sh out.mp4 [出力ディレクトリ]
set -euo pipefail

file="${1:?MP4 ファイルを指定してください}"
outdir="${2:-$(dirname "$file")/verify-$(basename "$file" .mp4)}"
mkdir -p "$outdir"

echo "== 属性 =="
ffprobe -v error -show_entries stream=codec_type,codec_name,profile,level,width,height,r_frame_rate,nb_frames,color_transfer \
  -show_entries format=duration,size -of default=noprint_wrappers=1 "$file"

echo
echo "== 音声トラックの有無 =="
audio=$(ffprobe -v error -select_streams a -show_entries stream=codec_name -of csv=p=0 "$file" || true)
if [ -z "$audio" ]; then echo "音声なし（期待どおり）"; else echo "音声あり: $audio（想定外）"; fi

echo
echo "== フレーム画像 =="
duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$file")
mid=$(awk -v d="$duration" 'BEGIN { printf "%.3f", d / 2 }')
last=$(awk -v d="$duration" 'BEGIN { printf "%.3f", d - 0.05 }')
for t in 0 "$mid" "$last"; do
  out="$outdir/frame-${t}.png"
  ffmpeg -v error -y -ss "$t" -i "$file" -frames:v 1 "$out"
  echo "$out"
done
