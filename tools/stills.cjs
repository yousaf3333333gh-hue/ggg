// node stills.cjs <scale> <outdir> <frame,frame,...>
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const root=require('path').resolve(__dirname,'..');const APP=process.env.APP||'starter',PAGE=process.env.PAGE||'index';const [scale,outdir,frames]=process.argv.slice(2);fs.mkdirSync(outdir,{recursive:true});
const mime={'.js':'text/javascript','.html':'text/html','.json':'application/json'};
const srv=http.createServer((q,s)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));fs.readFile(p,(e,d)=>{if(e){s.writeHead(404);s.end();return}s.writeHead(200,{'content-type':mime[path.extname(p)]||'application/octet-stream'});s.end(d)})}).listen(0,async()=>{
 const port=srv.address().port;
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const pg=await b.newPage({viewport:{width:400,height:700}});
 pg.on('console',m=>console.log('console:',m.text().slice(0,400)));pg.on('pageerror',e=>console.log('pageerror:',e.message));
 await pg.goto(`http://localhost:${port}/${APP}/web/${PAGE}.html?s=${scale}${process.env.CAM?'&cam='+process.env.CAM:''}`);
 await pg.waitForFunction('window.ready',null,{timeout:120000});
 for(const f of frames.split(',')){const t0=Date.now();
  try{const id=await pg.evaluate(`window.renderFrame(${f})`);
  const b64=await pg.evaluate(`(async()=>{const m=await import('./core.js');return await m.grabJpeg(0.92)})()`);
  fs.writeFileSync(`${outdir}/f${String(f).padStart(5,'0')}.jpg`,Buffer.from(b64,'base64'));console.log(f,id,(Date.now()-t0)+'ms');}catch(e){console.log('ERR',f,e.message.slice(0,300))}}
 await b.close();srv.close();
});
