#!/bin/bash
# LOCAL render (your own computer or a cloud box). Usage: bash tools/render_local.sh <APP> [tier=good] [workers=auto]
# Needs: node 18+, ffmpeg, `npm i playwright && npx playwright install chromium`. GPU is used automatically if the browser has one.
set -e; cd "$(dirname "$0")/.."; APP=$1; TIER=${2:-good}; N=$(cat $APP/frames.txt); WK=${3:-$(nproc)}; [ $WK -gt 8 ] && WK=8
rm -rf out/$APP && mkdir -p out/$APP/seg; per=$(( (N/60 + WK - 1) / WK * 60 ))
for ((w=0; w<WK; w++)); do a=$((w*per)); b=$((a+per)); [ $b -gt $N ] && b=$N; [ $a -lt $N ] && APP=$APP node $APP/tools/par_render_mb.cjs $TIER $a $b out/$APP/seg > out/$APP/w$w.log 2>&1 & done
wait; ls out/$APP/seg | grep -v part | sort | sed "s|^|file '$PWD/out/$APP/seg/|; s|$|'|" > out/$APP/list.txt
AUD=$APP/audio/mix.mp3; [ -f $AUD ] || AUD=$APP/audio/voice_clean.mp3; VF=null; [ -f $APP/captions.ass ] && VF="ass=$APP/captions.ass"
ffmpeg -v error -y -f concat -safe 0 -i out/$APP/list.txt -i $AUD -vf "$VF" -map 0:v -map 1:a -c:v libx264 -profile:v main -preset medium -b:v 3500k -pix_fmt yuv420p -c:a aac -ar 44100 -ac 2 -b:a 160k -shortest -movflags +faststart out/${APP}_final.mp4
echo "DONE -> out/${APP}_final.mp4"
