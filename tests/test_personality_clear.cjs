// Optional DOM regression suite: npm install --no-save jsdom
// Run from repository root: node tests/test_personality_clear.cjs
const fs=require("node:fs"),assert=require("node:assert/strict");
const {JSDOM}=require("jsdom");
const sets=require("./questionnaire-fixtures.cjs");
const html=fs.readFileSync("static/personality.html","utf8");
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const history={questionnaire_version:"ktl-personality-20-v1",total:1,records:[
 {id:1,created_at:"2026-01-01T00:00:00Z",scores:{E:50,A:50,C:50,S:50,O:50}}
]};
function fixture(){
 const controls={holdHistory:false,holdLogin:false,calls:[]};
 const dom=new JSDOM(html,{runScripts:"dangerously",url:"https://example.test/llmjp/personality",
  beforeParse(window){
   window.HTMLElement.prototype.scrollIntoView=function(){};
   window.print=()=>{};
   window.fetch=async(url,options)=>{
    controls.calls.push({url,options});
    if(url.endsWith("/questionnaires"))return {ok:true,json:async()=>({sets})};
    if(url.endsWith("/auth/login")){
     if(controls.holdLogin)return new Promise(resolve=>controls.finishLogin=()=>resolve({ok:true,json:async()=>({access_token:"token"})}));
     return {ok:true,json:async()=>({access_token:"token"})};
    }
    if(controls.holdHistory)return new Promise(resolve=>controls.finishHistory=()=>resolve({ok:true,json:async()=>history}));
    return {ok:true,json:async()=>history};
   };
  }});
 const w=dom.window,d=w.document;
 return {dom,w,d,controls};
}
function answerNeutral(f){
 for(let i=0;i<20;i++){
  const radio=f.d.querySelector('input[name="q'+i+'"][value="3"]');
  // Reproduce a restored or harness-set neutral default, not just live checked state.
  radio.defaultChecked=true;radio.setAttribute("checked","");radio.checked=true;
  radio.dispatchEvent(new f.w.Event("change",{bubbles:true}));
 }
 f.d.getElementById("survey").dispatchEvent(new f.w.Event("submit",{bubbles:true,cancelable:true}));
 assert.equal(f.d.querySelectorAll("#scores article").length,5);
}
function assertCleared(f){
 assert.equal(f.d.querySelectorAll("#survey input:checked").length,0);
 assert.equal(f.d.querySelectorAll("#survey input[checked]").length,0);
 assert.ok([...f.d.querySelectorAll("#survey input")].every(r=>r.checked===false&&r.defaultChecked===false));
 assert.equal(f.d.getElementById("progress").value,0);
 assert.equal(f.d.getElementById("progressText").textContent,"0 / 20問 回答済み");
 assert.equal(f.d.getElementById("results").hidden,true);
 assert.equal(f.d.getElementById("saveDb").disabled,true);
 assert.equal(f.d.getElementById("scores").childElementCount,0);
 assert.equal(f.d.getElementById("trendCharts").childElementCount,0);
 assert.equal(f.d.getElementById("historyTable").childElementCount,0);
 assert.match(f.d.getElementById("clearStatus").textContent,/未回答/);
 assert.match(f.d.getElementById("historyStatus").textContent,/履歴の表示を消去しました/);
 assert.match(f.d.getElementById("historyStatus").textContent,/DB記録は削除していません/);
}
(async()=>{
 for(const id of ["clear","clearResult"]){
  const f=fixture();await tick();answerNeutral(f);
  f.d.getElementById(id).click();assertCleared(f);
  f.d.getElementById("survey").reset();
  assert.equal(f.d.querySelectorAll("#survey input:checked").length,0);
  f.dom.window.close();
 }
 {
  const f=fixture();await tick();f.controls.holdHistory=true;
  f.d.getElementById("saveUsername").value="alice";f.d.getElementById("savePassword").value="pw";
  f.d.getElementById("saveLogin").dispatchEvent(new f.w.Event("submit",{bubbles:true,cancelable:true}));
  await tick();assert.ok(f.controls.finishHistory);
  answerNeutral(f);f.d.getElementById("clear").click();assertCleared(f);
  f.controls.finishHistory();await tick();assertCleared(f);
  assert.equal(f.controls.calls.filter(c=>c.options?.method==="DELETE").length,0);
  f.dom.window.close();
 }
 {
  const f=fixture();await tick();f.controls.holdLogin=true;
  f.d.getElementById("saveLogin").dispatchEvent(new f.w.Event("submit",{bubbles:true,cancelable:true}));
  await tick();assert.ok(f.controls.finishLogin);
  f.d.getElementById("clear").click();assertCleared(f);
  f.controls.finishLogin();await tick();assertCleared(f);
  assert.equal(f.controls.calls.filter(call=>call.url.endsWith("/auth/login")).length,1); // A cancelled login cannot refresh the cleared history.
  assert.equal(f.d.getElementById("loginSaveBtn").disabled,false);
  f.dom.window.close();
 }
 console.log("DOM regression checks passed: both clear buttons, restored neutral defaults, progress/results/history clearing, no DB deletion, late history/login responses.");
})().catch(error=>{console.error(error);process.exit(1);});

