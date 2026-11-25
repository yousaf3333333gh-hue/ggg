import sys,glob,os
from PIL import Image, ImageDraw
d=sys.argv[1]; out=sys.argv[2]; cols=int(sys.argv[3]) if len(sys.argv)>3 else 4; tw=int(sys.argv[4]) if len(sys.argv)>4 else 270
fs=sorted(glob.glob(d+'/f*.jpg'))
if len(sys.argv)>5: fs=[f for f in fs if any(('f%05d'%int(x)) in f for x in sys.argv[5].split(','))]
ims=[Image.open(f).convert('RGB') for f in fs]
th=int(tw*ims[0].height/ims[0].width)
rows=(len(ims)+cols-1)//cols
S=Image.new('RGB',(cols*tw,rows*th),(20,20,20))
for i,(im,f) in enumerate(zip(ims,fs)):
    S.paste(im.resize((tw,th),Image.LANCZOS),((i%cols)*tw,(i//cols)*th)); ImageDraw.Draw(S).text(((i%cols)*tw+4,(i//cols)*th+4),os.path.basename(f)[1:6],fill=(255,255,0))
S.save(out,quality=88)
