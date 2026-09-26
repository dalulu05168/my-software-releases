const http=require("node:http");
const fs=require("node:fs");
const path=require("node:path");
const port=Number(process.argv[2]||9228);
const outPath=path.join(process.env.APPDATA||".","Nuvexa","logs","white-screen-smoke-test.json");
fs.mkdirSync(path.dirname(outPath),{recursive:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function getJson(p){return new Promise((resolve,reject)=>{http.get({host:"127.0.0.1",port,path:p},res=>{let s="";res.on("data",d=>s+=d);res.on("end",()=>{try{resolve(JSON.parse(s));}catch(e){reject(e);}});}).on("error",reject);});}
class CDP{
  constructor(url){this.url=url;this.id=0;this.pending=new Map();}
  open(){return new Promise((resolve,reject)=>{this.ws=new WebSocket(this.url);this.ws.onopen=resolve;this.ws.onerror=reject;this.ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&this.pending.has(m.id)){const p=this.pending.get(m.id);this.pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}};});}
  call(method,params){params=params||{};const id=++this.id;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
  async eval(expr){const r=await this.call("Runtime.evaluate",{expression:expr,returnByValue:true,awaitPromise:true});return r.result&&r.result.value;}
  close(){try{this.ws.close();}catch{}}
}
(async()=>{
  const result={time:new Date().toISOString(),port,pages:[],pass:false,loginRequired:false};
  try{
    let targets=null;
    for(let i=0;i<30;i++){try{targets=await getJson("/json/list");if(targets&&targets.length)break;}catch{}await wait(500);}
    if(!targets||!targets.length)throw new Error("DevTools target not found");
    const page=targets.find(x=>x.type==="page")||targets[0], c=new CDP(page.webSocketDebuggerUrl);
    await c.open(); await c.call("Runtime.enable");
    const first=await c.eval('(()=>({text:(document.body?.innerText||"").slice(0,1200),root:!!document.getElementById("root"),children:document.getElementById("root")?.childElementCount||0}))()');
    if(/登录|账号\s*\/\s*邮箱|密码/.test((first&&first.text)||"")){
      result.loginRequired=true;result.message="需要先登录后再执行模块切换验收";fs.writeFileSync(outPath,JSON.stringify(result,null,2));console.log("SMOKE_LOGIN_REQUIRED");c.close();process.exit(3);
    }
    const labels=["运营总览","群组中心","客户中心","消息中心","批量发送","自动化营销","数据分析","系统设置"];
    let all=true;
    for(const label of labels){
      const expr='(()=>{const label='+JSON.stringify(label)+';const p=[...document.querySelectorAll("button,a,[role=button]")];let el=p.find(e=>(e.textContent||"").trim().includes(label));if(!el){const a=[...document.querySelectorAll("*")].filter(e=>e.children.length<=2);el=a.find(e=>(e.textContent||"").trim()===label);}if(!el)return false;el.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true,view:window}));return true;})()';
      const clicked=await c.eval(expr); await wait(1800);
      const state=await c.eval('(()=>{const r=document.getElementById("root");const cs=r?getComputedStyle(r):null;return{root:!!r,children:r?.childElementCount||0,text:(document.body?.innerText||"").trim().length,display:cs?.display||"",visibility:cs?.visibility||"",opacity:cs?.opacity||"",recovery:!!document.querySelector("[data-nuvexa-recovery]")};})()');
      const pass=!!clicked&&state.root&&state.children>0&&state.text>20&&state.display!=="none"&&state.visibility!=="hidden"&&state.opacity!=="0"&&!state.recovery;
      result.pages.push({label,clicked,state,pass});if(!pass)all=false;
    }
    result.pass=all;fs.writeFileSync(outPath,JSON.stringify(result,null,2));console.log(all?"SMOKE_PASS":"SMOKE_FAIL");c.close();process.exit(all?0:5);
  }catch(e){result.error=String(e&&e.stack?e.stack:e);fs.writeFileSync(outPath,JSON.stringify(result,null,2));console.error(result.error);process.exit(9);}
})();