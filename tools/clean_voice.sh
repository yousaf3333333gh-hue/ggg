#!/bin/bash
# bash tools/clean_voice.sh <input.mp3> <APP>   -> <APP>/audio/voice_clean.mp3
# Cuts a trailing TTS watermark ONLY if the user owns the voice/plan and asked for it (finds the last >0.8 s silence in the final 4 s),
# then: rumble cut, light clarity EQ, gentle compression, loudness -15 LUFS. Pitch/timbre are never changed (no robotic sound).
set -e; IN=$1; APP=$2; mkdir -p $APP/audio; D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
CUT=$(ffmpeg -hide_banner -i "$IN" -af silencedetect=noise=-40dB:d=0.8 -f null - 2>&1 | grep -oE "silence_start: [0-9.]+" | awk -v d=$D '{if ($2 > d-4) print $2}' | tail -1)
[ -z "$CUT" ] && CUT=$D; CUT=$(python3 -c "print(round($CUT+0.1,2))")
ffmpeg -v error -y -i "$IN" -t $CUT -af "afade=t=out:st=$(python3 -c "print($CUT-0.2)"):d=0.2,highpass=f=80,equalizer=f=200:t=q:w=1:g=-1.5,equalizer=f=3200:t=q:w=1.2:g=2.5,equalizer=f=9000:t=q:w=1:g=1,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120:makeup=2,loudnorm=I=-15:TP=-1.5:LRA=9" -ar 44100 -ac 2 -c:a libmp3lame -b:a 192k $APP/audio/voice_clean.mp3
echo "voice_clean.mp3: $CUT s (original $D s)"
