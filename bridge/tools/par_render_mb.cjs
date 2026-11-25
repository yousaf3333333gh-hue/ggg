// node par_render.cjs <tier> <from> <to> <segdir>   renders [from,to) into 60-frame segments (skips finished ones)
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path'),{spawn,spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..','..');const [tier,f0s,f1s,segDir]=process.argv.slice(2);const f0=+f0s,f1=+f1s,SEG=60;fs.mkdirSync(segDir,{recursive:true});
const mime={'.js':'text/javascript','.html':'text/html'};
const valid=(f)=>{try{if(!fs.existsSync(f)||fs.statSync(f).size<500)return false;const r=spawnSync('ffprobe',['-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=nb_read_frames','-of','csv=p=0',f],{encoding:'utf8'});return parseInt(r.stdout)>0}catch(e){return false}};
const srv=http.createServer((q,s)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));fs.readFile(p,(e,d)=>{if(e){s.writeHead(404);s.end();return}s.writeHead(200,{'content-type':mime[path.extname(p)]||'application/octet-stream'});s.end(d)})}).listen(0,async()=>{
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const pg=await b.newPage({viewport:{width:400,height:700}});
 pg.on('pageerror',e=>console.log('pageerror',e.message));
 await pg.goto(`http://localhost:${srv.address().port}/${process.env.APP||'tree'}/web/index.html?q=${tier}`);await pg.waitForFunction('window.ready',null,{timeout:180000});
 for(let a=f0;a<f1;a+=SEG){const e=Math.min(f1,a+SEG),out=path.join(segDir,String(a).padStart(6,'0')+'.mp4');if(valid(out))continue;const tmp=out+'.part.mp4';
  const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate','60','-c:v','mjpeg','-i','-','-vf','tmix=frames=2,select=eq(mod(n\\,2)\\,1),setpts=N/30/TB,scale=1080:1920:flags=lanczos','-r','30','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p',tmp],{stdio:['pipe','inherit','inherit']});
  const t0=Date.now();for(let f=a;f<e;f++){for(const o of [-0.25,0.25]){await pg.evaluate(`window.renderFrame(${f+o})`);const b64=await pg.evaluate(`(async()=>{const m=await import('./core.js');return await m.grabJpeg(0.95)})()`);const buf=Buffer.from(b64,'base64');if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));}}
  ff.stdin.end();await new Promise(r=>ff.on('close',r));fs.renameSync(tmp,out);console.log('seg',a,((Date.now()-t0)/1000/(e-a)).toFixed(2),'s/frame');}
 await b.close();srv.close();console.log('DONE');});
