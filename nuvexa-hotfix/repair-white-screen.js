const fs = require('node:fs');
const path = require('node:path');

const appDir = process.argv[2];
if (!appDir) { console.error('Missing APPDIR'); process.exit(10); }

const resDir = path.join(appDir, 'resources');
const asarPath = path.join(resDir, 'app.asar');
const unpackedDir = path.join(resDir, 'app');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

function ensureDir(p){ fs.mkdirSync(p,{recursive:true}); }
function safeRename(src,dst){ if(fs.existsSync(dst)) fs.rmSync(dst,{recursive:true,force:true}); fs.renameSync(src,dst); }

function extractTree(src,dst){
  const st = fs.statSync(src);
  if(st.isDirectory()){
    ensureDir(dst);
    for(const name of fs.readdirSync(src)) extractTree(path.join(src,name), path.join(dst,name));
    return;
  }
  ensureDir(path.dirname(dst));
  const buf = fs.readFileSync(src);
  fs.writeFileSync(dst,buf);
}

function findRendererIndex(root){
  const preferred=[
    path.join(root,'dist','client','app','index.html'),
    path.join(root,'dist','client','index.html')
  ];
  for(const p of preferred) if(fs.existsSync(p)) return p;
  let found=null;
  function walk(dir,depth=0){
    if(found||depth>7) return;
    for(const name of fs.readdirSync(dir)){
      const p=path.join(dir,name), st=fs.statSync(p);
      if(st.isDirectory()) walk(p,depth+1);
      else if(name==='index.html'){
        const s=fs.readFileSync(p,'utf8');
        if(s.includes('id="root"')||s.includes("id='root'")){ found=p; return; }
      }
    }
  }
  walk(root);
  return found;
}

function patchHelper(file){
  if(!fs.existsSync(file)) return;
  let s=fs.readFileSync(file,'utf8');
  const before=s;
  s=s.replace(/\b(?:window\.)?location\.reload\(\s*\)\s*;?/g,'/* hard reload disabled by white-screen fix */');
  s=s.replace(/(document\.(?:getElementById\(["']root["']\)|querySelector\(["']#root["']\))\.style\.(?:display|visibility|opacity)\s*=\s*)["'](?:none|hidden|0)["']/g,'$1"visible"');
  s=s.replace(/\b(root|rootEl|appRoot|reactRoot)\.style\.display\s*=\s*["']none["']/g,'$1.style.display="block"');
  s=s.replace(/\b(root|rootEl|appRoot|reactRoot)\.style\.visibility\s*=\s*["']hidden["']/g,'$1.style.visibility="visible"');
  s=s.replace(/\b(root|rootEl|appRoot|reactRoot)\.style\.opacity\s*=\s*["']0["']/g,'$1.style.opacity="1"');
  s=s.replace(/\b(root|rootEl|appRoot|reactRoot)\.innerHTML\s*=\s*["']\s*["']\s*;?/g,'/* root clear disabled */');
  s=s.replace(/\b(root|rootEl|appRoot|reactRoot)\.replaceChildren\(\s*\)\s*;?/g,'/* root replaceChildren disabled */');
  if(s!==before){
    fs.copyFileSync(file,file+'.before-white-screen-fix-'+stamp);
    fs.writeFileSync(file,s,'utf8');
    console.log('patched helper:',file);
  }
}

const guard = String.raw`(() => {
  if (window.__NUVEXA_ROUTE_STABILITY_V2__) return;
  window.__NUVEXA_ROUTE_STABILITY_V2__ = true;

  let lastGood = [];
  let timer = null;
  const getRoot = () => document.getElementById('root');

  function visible(root){
    if(!root) return;
    root.style.setProperty('display','block','important');
    root.style.setProperty('visibility','visible','important');
    root.style.setProperty('opacity','1','important');
    root.removeAttribute('aria-hidden');
  }

  function remember(root){
    if(root && root.childNodes.length) lastGood = Array.from(root.childNodes);
  }

  function recover(root){
    if(!root || root.childNodes.length) return;
    for(const node of lastGood){
      if(node && !node.isConnected) root.appendChild(node);
    }
    visible(root);
    if(!root.childNodes.length){
      const box=document.createElement('div');
      box.style.cssText='min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4f6f8;font-family:system-ui,Microsoft YaHei,sans-serif';
      box.innerHTML='<div style="background:#fff;border:1px solid #dfe3e8;border-radius:14px;padding:28px;text-align:center;max-width:520px"><div style="font-size:20px;font-weight:700;margin-bottom:10px">页面切换失败</div><div style="color:#667085;line-height:1.7;margin-bottom:18px">系统已阻止整页白屏。点击下面按钮重新加载工作台。</div><button id="nuvexa-safe-reload" style="height:40px;padding:0 22px;border:0;border-radius:8px;background:#2563eb;color:white;cursor:pointer">重新加载工作台</button></div>';
      root.appendChild(box);
      const b=document.getElementById('nuvexa-safe-reload'); if(b) b.onclick=()=>location.reload();
    }
  }

  function arm(){
    const root=getRoot(); if(!root) return;
    visible(root); remember(root);
    new MutationObserver((records)=>{
      visible(root);
      if(root.childNodes.length){ remember(root); if(timer){clearTimeout(timer);timer=null;} return; }
      const removed=[];
      for(const r of records) for(const n of r.removedNodes||[]) removed.push(n);
      if(removed.length) lastGood=removed;
      if(timer) clearTimeout(timer);
      timer=setTimeout(()=>recover(root),350);
    }).observe(root,{childList:true,attributes:true,attributeFilter:['style','class','aria-hidden']});
  }

  const check=()=>setTimeout(()=>{const r=getRoot();visible(r);if(r&&!r.childNodes.length)recover(r);},700);
  const p=history.pushState.bind(history); history.pushState=(...a)=>{const x=p(...a);check();return x;};
  const q=history.replaceState.bind(history); history.replaceState=(...a)=>{const x=q(...a);check();return x;};
  addEventListener('popstate',check); addEventListener('hashchange',check);
  addEventListener('error',check); addEventListener('unhandledrejection',check);

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',arm,{once:true}); else arm();
})();`;

try{
  if(fs.existsSync(asarPath)){
    const tmp=path.join(resDir,'app.__repair_tmp');
    const old=path.join(resDir,'app.__old_'+stamp);
    if(fs.existsSync(tmp)) fs.rmSync(tmp,{recursive:true,force:true});
    if(fs.existsSync(unpackedDir)) safeRename(unpackedDir,old);
    console.log('extracting app.asar...');
    extractTree(asarPath,tmp);
    safeRename(tmp,unpackedDir);
    fs.renameSync(asarPath,path.join(resDir,'app.asar.backup-'+stamp));
  } else if(!fs.existsSync(unpackedDir)){
    throw new Error('resources/app.asar and resources/app are both missing');
  }

  const index=findRendererIndex(unpackedDir);
  if(!index) throw new Error('renderer index.html not found');
  const assets=path.join(path.dirname(index),'assets');
  ensureDir(assets);

  for(const f of ['ui-enhancements.js','live-workspace.js','live-group-monitor.js']) patchHelper(path.join(assets,f));

  fs.writeFileSync(path.join(assets,'route-stability-v2.js'),guard,'utf8');

  let html=fs.readFileSync(index,'utf8');
  fs.copyFileSync(index,index+'.before-white-screen-fix-'+stamp);
  const style='<style id="nuvexa-root-safety">html,body,#root{min-height:100%!important}#root{display:block!important;visibility:visible!important;opacity:1!important}</style>';
  const tag='<script defer src="./assets/route-stability-v2.js"></script>';
  if(!html.includes('nuvexa-root-safety')) html=html.replace('</head>','  '+style+'\n</head>');
  if(!html.includes('route-stability-v2.js')){
    const marker='<script defer src="./assets/ui-enhancements.js"></script>';
    html=html.includes(marker) ? html.replace(marker,tag+'\n    '+marker) : html.replace('</head>','  '+tag+'\n</head>');
  }
  fs.writeFileSync(index,html,'utf8');

  console.log('white-screen fix installed:',index);
  process.exit(0);
}catch(e){
  console.error(e&&e.stack?e.stack:String(e));
  process.exit(20);
}