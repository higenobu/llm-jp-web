// Optional DOM test dependency: npm install --no-save jsdom
// Run: node tests/test_personality_token_copy.cjs
const fs=require("node:fs"),assert=require("node:assert/strict"),{JSDOM}=require("jsdom");
const html=fs.readFileSync("static/personality.html","utf8"),TOKEN="test-bearer-token";
const sets=require("./questionnaire-fixtures.cjs");
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(mode="clipboard"){
 const state={writes:[],calls:[]};
 const dom=new JSDOM(html,{runScripts:"dangerously",url:"https://example.test/llmjp/personality",
  beforeParse(w){
   w.HTMLElement.prototype.scrollIntoView=function(){};
   Object.defineProperty(w,"isSecureContext",{value:mode!=="fallback"&&mode!=="failure"});
   Object.defineProperty(w.navigator,"clipboard",{value:{writeText:async value=>{
    if(mode==="pending")await new Promise(resolve=>state.finish=resolve);
    state.writes.push(value);
   }}});
   w.document.execCommand=command=>{
    assert.equal(command,"copy");
    if(mode==="failure")return false;
    state.writes.push(w.document.activeElement.value);return true;
   };
   w.fetch=async(url,options)=>{
    state.calls.push({url,options});
    if(url.endsWith("/questionnaires"))return {ok:true,json:async()=>({sets})};
    return {ok:true,json:async()=>url.endsWith("/auth/login")?{access_token:TOKEN}:{records:[],total:0,questionnaire_version:"ktl-personality-20-v1"}};
   };
  }});
 return {dom,w:dom.window,d:dom.window.document,state};
}
async function login(f){
 f.d.getElementById("saveUsername").value="alice";
 f.d.getElementById("savePassword").value="password";
 f.d.getElementById("saveLogin").dispatchEvent(new f.w.Event("submit",{bubbles:true,cancelable:true}));
 await tick();
 assert.match(f.d.getElementById("loginSaveStatus").textContent,/ログイン済み/);
 assert.equal(f.d.getElementById("copySaveToken").disabled,false);
}
function answer(f){
 for(let i=0;i<20;i++){
  const radio=f.d.querySelector('input[name="q'+i+'"][value="3"]');
  radio.click();
 }
 f.d.getElementById("survey").dispatchEvent(new f.w.Event("submit",{bubbles:true,cancelable:true}));
}
(async()=>{
 for(const mode of ["clipboard","fallback"]){
  const f=fixture(mode);await tick();
  assert.equal(f.d.getElementById("copySaveToken").disabled,true);
  await login(f);answer(f);
  const before=[...f.d.querySelectorAll("#survey input:checked")].map(x=>x.name+":"+x.value);
  f.d.getElementById("copySaveToken").click();await tick();
  assert.deepEqual(f.state.writes,[TOKEN]);
  assert.match(f.d.getElementById("copyTokenStatus").textContent,/コピーしました/);
  assert.deepEqual([...f.d.querySelectorAll("#survey input:checked")].map(x=>x.name+":"+x.value),before);
  assert.equal(f.d.querySelectorAll("#questions fieldset").length,20);
  assert.equal(f.d.querySelectorAll("#scores article").length,5);
  assert.equal(f.d.getElementById("results").hidden,false);
  assert.equal(f.d.querySelectorAll("textarea").length,0);
  assert.equal(f.w.localStorage.length,0);
  assert.ok(!f.d.body.textContent.includes(TOKEN));
  assert.ok(f.state.calls.some(call=>call.options.headers?.Authorization==="Bearer "+TOKEN));
  f.d.getElementById("logoutSaveBtn").click();
  assert.equal(f.d.getElementById("copySaveToken").disabled,true);
  assert.equal(f.d.getElementById("copyTokenStatus").textContent,"");
  f.dom.window.close();
 }
 {
  const f=fixture("failure");await tick();await login(f);answer(f);
  f.d.getElementById("copySaveToken").click();await tick();
  assert.match(f.d.getElementById("copyTokenStatus").textContent,/コピーできませんでした/);
  assert.equal(f.d.getElementById("copySaveToken").disabled,false);
  assert.equal(f.d.querySelectorAll("textarea").length,0);
  assert.equal(f.d.querySelectorAll("#survey input:checked").length,20);
  f.dom.window.close();
 }
 {
  const f=fixture("pending");await tick();await login(f);
  f.d.getElementById("copySaveToken").click();await tick();
  assert.equal(f.d.getElementById("copySaveToken").disabled,true);
  f.d.getElementById("logoutSaveBtn").click();f.state.finish();await tick();
  assert.equal(f.d.getElementById("copyTokenStatus").textContent,"");
  assert.equal(f.d.getElementById("copySaveToken").disabled,true);
  f.dom.window.close();
 }
 console.log("Token-copy DOM tests passed: clipboard/fallback receive issued Bearer token; questionnaire/results unchanged; temporary fields removed; no token storage; logout/stale completion safe.");
})().catch(error=>{console.error(error);process.exit(1);});

