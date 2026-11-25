# python3 tools/captions.py <APP>   -> reads <APP>/words.json (+ optional <APP>/script.txt to restore exact spelling) and writes <APP>/captions.ass
import json, sys, re
app = sys.argv[1]; w = json.load(open(f'{app}/words.json'))
try:
    sw = open(f'{app}/script.txt').read().split()
    ww = []
    for x in w:   # whisper sometimes glues two words ("Haycarts"); split them so counts match the script
        ww.append(x)
    if len(sw) != len(ww):
        i = j = 0; fixed = []
        while i < len(ww) and j < len(sw):
            a = re.sub(r'\W', '', ww[i]['w'].lower()); b = re.sub(r'\W', '', sw[j].lower())
            if j + 1 < len(sw) and a == b + re.sub(r'\W', '', sw[j + 1].lower()):
                m = (ww[i]['s'] + ww[i]['e']) / 2; fixed += [{'w': sw[j], 's': ww[i]['s'], 'e': m}, {'w': sw[j + 1], 's': m, 'e': ww[i]['e']}]; i += 1; j += 2
            else: fixed.append({**ww[i], 'w': sw[j]}); i += 1; j += 1
        ww = fixed
    else: ww = [{**x, 'w': t} for x, t in zip(ww, sw)]
except FileNotFoundError: ww = w
def ts(t): return f"0:{int(t//60):02d}:{t%60:05.2f}"
out = ["[Script Info]", "ScriptType: v4.00+", "PlayResX: 1080", "PlayResY: 1920", "WrapStyle: 2", "", "[V4+ Styles]",
 "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
 "Style: W,DejaVu Sans,92,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,9,3,5,40,40,0,1", "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
for i, x in enumerate(ww):
    e = ww[i + 1]['s'] if i + 1 < len(ww) else x['e'] + 0.5; e = min(e, x['e'] + 0.6)
    out.append(f"Dialogue: 0,{ts(x['s'])},{ts(e)},W,,0,0,0,,{{\\pos(540,1330)\\fscx118\\fscy118\\t(0,90,\\fscx100\\fscy100)}}{x['w']}")
open(f'{app}/captions.ass', 'w').write('\n'.join(out) + '\n'); print('captions:', len(ww), 'words')
