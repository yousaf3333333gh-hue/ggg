# python3 tools/mix_audio.py <APP>   -> <APP>/audio/mix.mp3 from <APP>/audio/voice_clean.mp3 + <APP>/cues.json
# cues.json: {"duration": 47.6, "cues": [["sfx/05-war-drum.mp3", 1.96, null, -16], ["music/01-march.mp3", 6.6, 8.1, -31], ...]}
#   [file (relative to <APP>/), start seconds, length seconds or null (=whole file), target loudness dB]
#   Loudness guide (voice is about -15): hits/impacts -16..-20, footsteps/whoosh -22..-30, ambience -36..-40, music -30..-33.
# Voice ducking is automatic: every SFX/music gets pushed down while the voice speaks, so words stay clear.
import json, subprocess, re, sys
app = sys.argv[1]; cfg = json.load(open(f'{app}/cues.json')); D = cfg['duration']
def mean(f):
    o = subprocess.run(['ffmpeg', '-hide_banner', '-i', f, '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.search(r'mean_volume: ([-\d.]+)', o).group(1))
mc = {}; inp = ['-i', f'{app}/audio/voice_clean.mp3']; fl = [f'[0:a]aformat=sample_rates=44100:channel_layouts=stereo,apad=whole_dur={D},asplit=2[v][key]']; lab = []
for k, (f, st, d, tg) in enumerate(cfg['cues'], 1):
    f = f'{app}/{f}'; mc.setdefault(f, mean(f)); g = tg - mc[f]
    if d: inp += ['-stream_loop', '-1', '-i', f]; fo = min(0.6, d / 3); tr = f'atrim=0:{d},asetpts=N/SR/TB,afade=t=in:d=0.08,afade=t=out:st={d-fo:.2f}:d={fo:.2f},'
    else: inp += ['-i', f]; tr = ''
    ms = int(max(0, st) * 1000); fl.append(f'[{k}:a]aformat=sample_rates=44100:channel_layouts=stereo,{tr}volume={g:.1f}dB,adelay={ms}|{ms}[s{k}]'); lab.append(f'[s{k}]')
fl.append(''.join(lab) + f'amix=inputs={len(lab)}:normalize=0:duration=longest,atrim=0:{D}[fx]')
fl.append('[fx][key]sidechaincompress=threshold=0.03:ratio=5:attack=15:release=300:makeup=1[duck]')
fl.append('[v][duck]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.9[out]')
r = subprocess.run(['ffmpeg', '-v', 'error', '-y'] + inp + ['-filter_complex', ';'.join(fl), '-map', '[out]', '-t', str(D), '-c:a', 'libmp3lame', '-b:a', '192k', f'{app}/audio/mix.mp3'], capture_output=True, text=True)
print('mix:', 'OK' if r.returncode == 0 else r.stderr[-400:])
