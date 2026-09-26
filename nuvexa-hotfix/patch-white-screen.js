const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const APPDIR = process.argv[2];
if (!APPDIR) process.exit(2);
const RES = path.join(APPDIR, "resources");
const ASAR = path.join(RES, "app.asar");
const LOGDIR = path.join(process.env.APPDATA || ".", "Nuvexa", "logs");
fs.mkdirSync(LOGDIR, {recursive:true});
const LOG = path.join(LOGDIR, "white-screen-hotfix.log");
function log(){ const s="["+new Date().toISOString()+"] "+Array.from(arguments).join(" "); fs.appendFileSync(LOG,s+"\n"); console.log(s); }
function align4(n){ return (n+3)&~3; }
function encodeHeader(header){
  const json=Buffer.from(JSON.stringify(header),"utf8");
  const payload=4+align4(json.length);
  const hb=Buffer.alloc(4+payload);
  hb.writeUInt32LE(payload,0); hb.writeUInt32LE(json.length,4); json.copy(hb,8);
  const sb=Buffer.alloc(8); sb.writeUInt32LE(4,0); sb.writeUInt32LE(hb.length,4);
  return Buffer.concat([sb,hb]);
}
function parseAsar(file){
  const fd=fs.openSync(file,"r");
  try{
    const h=Buffer.alloc(8); fs.readSync(fd,h,0,8,0);
    if(h.readUInt32LE(0)!==4) throw new Error("Unsupported ASAR");
    const hs=h.readUInt32LE(4);
    const hb=Buffer.alloc(hs); fs.readSync(fd,hb,0,hs,8);
    const jl=hb.readUInt32LE(4);
    return {header:JSON.parse(hb.subarray(8,8+jl).toString("utf8")),base:8+hs};
  }finally{fs.closeSync(fd);}
}
function walk(node,prefix,out){
  prefix=prefix||""; out=out||[];
  if(!node||!node.files) return out;
  for(const name of Object.keys(node.files)){
    const e=node.files[name], p=prefix?prefix+"/"+name:name;
    if(e.files) walk(e,p,out); else out.push({path:p,entry:e});
  }
  return out;
}
function getEntry(header,p){
  let cur=header;
  for(const part of p.split("/")){ if(!cur.files||!cur.files[part]) return null; cur=cur.files[part]; }
  return cur;
}
function sha(buf){ return crypto.createHash("sha256").update(buf).digest("hex"); }
function integ(buf,old){
  const bs=(old&&old.blockSize)||4194304, blocks=[];
  for(let i=0;i<buf.length;i+=bs) blocks.push(sha(buf.subarray(i,Math.min(buf.length,i+bs))));
  return {algorithm:"SHA256",hash:sha(buf),blockSize:bs,blocks};
}
function escapeRe(s){ return s.replace(/[.*+?^$()|[\]{}\\]/g,"\\$&"); }
function rootVars(src){
  const set=new Set(["root","rootEl","appRoot","reactRoot"]);
  const re=/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*document\.(?:getElementById\(\s*["']root["']\s*\)|querySelector\(\s*["']#root["']\s*\))/g;
  let m; while((m=re.exec(src))) set.add(m[1]); return Array.from(set);
}
function patchHelper(src,label){
  let s=src;
  for(const v of rootVars(s)){
    const q=escapeRe(v);
    s=s.replace(new RegExp(q+"\\.style\\.display\\s*=\\s*([\\\"'])none\\1","g"),v+'.style.display="block"');
    s=s.replace(new RegExp(q+"\\.style\\.visibility\\s*=\\s*([\\\"'])hidden\\1","g"),v+'.style.visibility="visible"');
    s=s.replace(new RegExp(q+"\\.style\\.opacity\\s*=\\s*([\\\"'])0([\\\"'])","g"),v+'.style.opacity="1"');
  }
  s=s.replace(/(?:window\.)?location\.reload\(\s*\)\s*;?/g,"void 0;/* hotfix: reload disabled */");
  s=s.replace(/document\.location\.reload\(\s*\)\s*;?/g,"void 0;/* hotfix: reload disabled */");
  log(s===src?"no destructive pattern":"patched helper",label);
  return s;
}
const guard = String.raw\`(() => {
  if (window.__NUVEXA_ROUTE_GUARD_V3__) return;
  window.__NUVEXA_ROUTE_GUARD_V3__ = true;
  const st={root:null,last:[],timer:null,lastError:""};
  const find=()=>{const r=document.getElementById("root");if(r)st.root=r;return r||st.root;};
  const visible=()=>{document.documentElement.classList.remove("nuvexa-boot");document.documentElement.style.visibility="visible";document.documentElement.style.opacity="1";if(document.body){document.body.style.visibility="visible";document.body.style.opacity="1";}const r=find();if(r){r.hidden=false;r.removeAttribute("aria-hidden");r.style.setProperty("display","block","important");r.style.setProperty("visibility","visible","important");r.style.setProperty("opacity","1","important");r.style.setProperty("pointer-events","auto","important");}};
  const remember=()=>{const r=find();if(r&&r.childNodes.length)st.last=Array.from(r.childNodes);};
  const recovery=(msg)=>{const r=find();if(!r||r.childNodes.length)return;const d=document.createElement("div");d.dataset.nuvexaRecovery="1";d.style.cssText="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f6f8;font-family:system-ui,-apple-system,Segoe UI,Microsoft YaHei,sans-serif;color:#1d2939;padding:32px;box-sizing:border-box";d.innerHTML='<div style="width:min(620px,100%);background:#fff;border:1px solid #dfe3ea;border-radius:14px;padding:28px;box-shadow:0 14px 40px rgba(16,24,40,.10);text-align:center"><div style="font-size:20px;font-weight:700;margin-bottom:10px">页面加载异常已被拦截</div><div style="font-size:14px;line-height:1.8;color:#667085;margin-bottom:20px">'+(msg||"当前模块没有完成渲染，系统已阻止整页白屏。")+'</div><button id="nuvexa-safe-reload" style="height:40px;padding:0 22px;border:0;border-radius:8px;background:#2563eb;color:#fff;font-weight:600;cursor:pointer">返回工作台</button></div>';r.appendChild(d);const b=document.getElementById("nuvexa-safe-reload");if(b)b.onclick=()=>{try{history.replaceState({},"","/workspace");}catch{}location.reload();};};
  const recover=(why)=>{visible();const r=find();if(!r)return;if(r.childNodes.length){remember();return;}const a=st.last.filter(n=>!n.isConnected);if(a.length){for(const n of a)r.appendChild(n);visible();return;}recovery(why||st.lastError);};
  const schedule=(why,ms)=>{clearTimeout(st.timer);st.timer=setTimeout(()=>recover(why),ms||1200);};
  const watch=()=>{visible();const r=find();if(!r){setTimeout(watch,50);return;}remember();new MutationObserver(()=>{visible();if(r.childNodes.length){clearTimeout(st.timer);setTimeout(remember,100);}else schedule("模块切换后主界面没有重新挂载。",1200);}).observe(r,{childList:true,attributes:true,attributeFilter:["style","class","hidden","aria-hidden"]});new MutationObserver(()=>{const c=document.getElementById("root");if(!c&&st.root&&document.body&&!st.root.isConnected){document.body.appendChild(st.root);schedule("主界面节点被移除，已自动恢复。",50);}visible();}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["class","style"]});};
  document.addEventListener("click",e=>{const x=e.target&&e.target.closest?e.target.closest("a,button,[role=button]"):null;if(!x)return;remember();schedule("页面切换未完成。",1600);},true);
  addEventListener("popstate",()=>{remember();schedule("返回页面未完成。",1600);});
  addEventListener("hashchange",()=>{remember();schedule("页面切换未完成。",1600);});
  addEventListener("error",e=>{st.lastError="模块脚本错误："+(e.message||"unknown");console.error("[Nuvexa renderer error]",e.error||e.message);schedule(st.lastError,250);});
  addEventListener("unhandledrejection",e=>{st.lastError="模块数据加载失败";console.error("[Nuvexa unhandled rejection]",e.reason);schedule(st.lastError,250);});
  const ps=history.pushState.bind(history);history.pushState=function(){remember();const v=ps.apply(history,arguments);schedule("页面切换未完成。",1600);return v;};
  const rs=history.replaceState.bind(history);history.replaceState=function(){remember();const v=rs.apply(history,arguments);schedule("页面切换未完成。",1600);return v;};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",watch,{once:true});else watch();
})();\`;
function patchIndex(html){
  let s=html.replace(/\sclass=["'][^"']*\bnuvexa-boot\b[^"']*["']/i,"");
  s=s.replace(/<script[^>]+src=["']\.\/assets\/ui-enhancements\.js["'][^>]*><\/script>\s*/gi,"");
  const tag='    <script src="./assets/ui-enhancements.js"></script>\\n';
  const m=s.match(/<script\s+type=["']module["'][^>]*>/i);
  if(m)s=s.replace(m[0],tag+m[0]); else s=s.replace("</head>",tag+"</head>");
  return s;
}
function repack(file){
  const parsed=parseAsar(file), header=parsed.header;
  const list=walk(header).filter(x=>!x.entry.link&&!x.entry.unpacked&&x.entry.offset!==undefined);
  list.sort((a,b)=>Number(a.entry.offset)-Number(b.entry.offset));
  const targets=new Set(["dist/client/app/index.html","dist/client/app/assets/ui-enhancements.js","dist/client/app/assets/live-workspace.js","dist/client/app/assets/live-group-monitor.js"]);
  const mods=new Map(), oldOffsets=new Map();
  const fd=fs.openSync(file,"r");
  try{
    for(const f of list){
      oldOffsets.set(f.path,Number(f.entry.offset));
      if(!targets.has(f.path))continue;
      const n=Number(f.entry.size||0), b=Buffer.alloc(n);
      if(n)fs.readSync(fd,b,0,n,parsed.base+Number(f.entry.offset));
      const t=b.toString("utf8");
      if(f.path.endsWith("index.html"))mods.set(f.path,Buffer.from(patchIndex(t),"utf8"));
      else if(f.path.endsWith("ui-enhancements.js"))mods.set(f.path,Buffer.from(guard,"utf8"));
      else mods.set(f.path,Buffer.from(patchHelper(t,f.path),"utf8"));
    }
  }finally{fs.closeSync(fd);}
  if(!mods.has("dist/client/app/index.html"))throw new Error("renderer index not found");
  if(!mods.has("dist/client/app/assets/ui-enhancements.js"))throw new Error("ui-enhancements not found");
  let off=0;
  for(const f of list){
    f.entry.offset=String(off);
    const b=mods.get(f.path);
    if(b){f.entry.size=b.length;f.entry.integrity=integ(b,f.entry.integrity);off+=b.length;}
    else off+=Number(f.entry.size||0);
  }
  const prefix=encodeHeader(header), tmp=file+".hotfix.tmp";
  const out=fs.openSync(tmp,"w"), src=fs.openSync(file,"r");
  try{
    fs.writeSync(out,prefix);
    for(const f of list){
      let b=mods.get(f.path);
      if(!b){const n=Number(f.entry.size||0);b=Buffer.alloc(n);if(n)fs.readSync(src,b,0,n,parsed.base+oldOffsets.get(f.path));}
      if(b.length)fs.writeSync(out,b);
    }
  }finally{fs.closeSync(src);fs.closeSync(out);}
  const chk=parseAsar(tmp);
  if(!getEntry(chk.header,"dist/client/app/index.html")||!getEntry(chk.header,"dist/client/app/assets/ui-enhancements.js"))throw new Error("repack verify failed");
  return tmp;
}
function cleanLocks(){
  const root=path.join(process.env.APPDATA||"","Nuvexa"); if(!root||!fs.existsSync(root))return;
  const re=/(group|monitor).*(lock|pid)|(lock|pid).*(group|monitor)/i, stack=[root];
  while(stack.length){const d=stack.pop();for(const n of fs.readdirSync(d)){const p=path.join(d,n);let st;try{st=fs.statSync(p);}catch{continue;}if(st.isDirectory())stack.push(p);else if(re.test(n)){try{fs.unlinkSync(p);log("removed stale lock",p);}catch{}}}}
}
try{
  if(!fs.existsSync(ASAR))throw new Error("app.asar not found: "+ASAR);
  const stamp=new Date().toISOString().replace(/[:.]/g,"-"), backup=path.join(RES,"app.asar.backup-white-screen-"+stamp);
  fs.copyFileSync(ASAR,backup);log("backup",backup);
  const tmp=repack(ASAR);fs.renameSync(tmp,ASAR);cleanLocks();log("HOTFIX_OK");console.log("HOTFIX_OK");process.exit(0);
}catch(e){log("HOTFIX_FAILED",e&&e.stack?e.stack:String(e));console.error(e&&e.stack?e.stack:String(e));process.exit(20);}
