// node tools/qa_scene.cjs <APP> [step=3]   -> runs window.__qa() on every <step>th frame (draft quality) and prints problems.
// Must end with "QA: clean" before any long render. Needs the scene to import web/safety.js and call guardCam() each frame.
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');const APP=process.argv[2]||process.env.APP;const step=+(process.argv[3]||3);
const N=+fs.readFileSync(path.join(root,APP,'frames.txt'),'utf8');const mime={'.js':'text/javascript','.html':'text/html'};
const srv=http.createServer((q,s)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));fs.readFile(p,(e,d)=>{if(e){s.writeHead(404);s.end();return}s.writeHead(200,{'content-type':mime[path.extname(p)]||'application/octet-stream'});s.end(d)})}).listen(0,async()=>{
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const pg=await b.newPage();let perr=0;pg.on('pageerror',e=>{perr++;console.log('pageerror',e.message)});
 await pg.goto(`http://localhost:${srv.address().port}/${APP}/web/index.html?q=draft`);await pg.waitForFunction('window.ready',null,{timeout:180000});
 const bad={};for(let f=0;f<N;f+=step){await pg.evaluate(`window.renderFrame(${f})`);const r=await pg.evaluate('window.__qa?window.__qa():["NO_QA_HOOK (import web/safety.js)"]');for(const m of r){const k=m.split(' ').slice(0,2).join(' ');(bad[k]=bad[k]||[]).push((f/30).toFixed(2))}}
 const keys=Object.keys(bad);if(!keys.length&&!perr)console.log('QA: clean');else for(const k of keys)console.log(k,'at seconds',bad[k].slice(0,12).join(', '),bad[k].length>12?`(+${bad[k].length-12} more)`:'');
 await b.close();srv.close();process.exit(keys.length||perr?1:0)});
