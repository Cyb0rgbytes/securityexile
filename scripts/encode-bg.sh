#!/usr/bin/env bash
# Turns brand-src/background.mp4 (5s zoom, 10-bit HEVC, 42 Mbps, with audio)
# into web-ready silent loops: a ping-pong (forward + reversed) 10s clip so the
# zoom breathes instead of jumping, hue-shifted toward the brand green.
set -euo pipefail
cd "$(dirname "$0")/.."

IN=brand-src/background.mp4
OUT=public/assets/bg
mkdir -p "$OUT"

# Shared filter: green shift, 8-bit, ping-pong, 24fps.
PP="hue=h=-40:s=0.9,format=yuv420p,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0,fps=24"

encode() { # <scale-w> <name> <vp9-bitrate> <x264-crf>
  local W=$1 NAME=$2 VBR=$3 CRF=$4
  ffmpeg -v error -y -i "$IN" -an \
    -filter_complex "[0:v]${PP},scale=${W}:-2[v]" -map "[v]" \
    -c:v libvpx-vp9 -b:v "$VBR" -crf 34 -row-mt 1 -deadline good -cpu-used 2 -g 120 \
    "$OUT/$NAME.webm"
  ffmpeg -v error -y -i "$IN" -an \
    -filter_complex "[0:v]${PP},scale=${W}:-2[v]" -map "[v]" \
    -c:v libx264 -crf "$CRF" -preset slow -profile:v high -g 120 -movflags +faststart \
    "$OUT/$NAME.mp4"
}

encode 1920 bg-1080 2200k 24
encode 1280 bg-720 1100k 25

# Poster: first processed frame (matches what the loop starts on).
ffmpeg -v error -y -i "$IN" -frames:v 1 \
  -vf "hue=h=-40:s=0.9,scale=1920:-2" -c:v libwebp -quality 72 "$OUT/bg-poster.webp"

ls -la "$OUT"
