// Optional DOM test dependency: npm install --no-save jsdom
const fs=require("node:fs"),crypto=require("node:crypto"),assert=require("node:assert/strict"),{JSDOM}=require("jsdom");
const html=fs.readFileSync("static/personality.html","utf8");
function sorted(x){if(Array.isArray(x))return x.map(sorted);if(x&&typeof x==="object")return Object.fromEntries(Object.keys(x).sort().map(k=>[k,sorted(x[k])]));return x;}
const sets=JSON.parse(fs.readFileSync("tests/fixtures/questionnaires.json","utf8")).map(s=>({...s,digest:crypto.createHash("sha256").update(JSON.stringify(sorted(s))).digest("hex")}));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const state={calls:[],deferNextHistory:false,failDefinitions:false};
 const dom=new JSDOM(html,{runScripts:"dangerously",url:"https://example.test/llmjp/personality",
  beforeParse(w){
   w.HTMLElement.prototype.scrollIntoView=function(){};
   w.fetch=async(url,options)=>{
    state.calls.push({url,options});
    if(url.endsWith("/questionnaires"))return {ok:!state.failDefinitions,json:async()=>({sets})};
    if(url.endsWith("/auth/login"))return {ok:true,json:async()=>({access_token:"token"})};
    if(options?.method==="POST")return {ok:true,json:async()=>({id:1,created_at:"2026-01-01T00:00:00Z"})};
    const version=new URL(url,w.location.origin).searchParams.get("version");
    const data={questionnaire_version:version,total:0,records:[]};
    if(state.deferNextHistory){state.deferNextHistory=false;return new Promise(resolve=>state.completeHistory=()=>resolve({ok:true,json:async()=>({...data,total:1,records:[{id:1,created_at:"2026-01-01T00:00:00Z",scores:{E:50,A:50,C:50,S:50,O:50}}]})}));}
    return {ok:true,json:async()=>data};
   };
  }});
 const w=dom.window,d=w.document;await tick();await tick();
 assert.equal(d.querySelectorAll("#questionSet option").length,3);
 assert.equal(d.getElementById("questionSet").disabled,false);
 assert.equal(d.querySelectorAll("#questions fieldset").length,20);
 const choose=async(index)=>{
  d.getElementById("questionSet").value=sets[index].version;
  d.getElementById("questionSet").dispatchEvent(new w.Event("change",{bubbles:true}));await tick();
 };
 const answer=(values)=>{values.forEach((value,i)=>d.querySelector('input[name="q'+i+'"][value="'+value+'"]').click());d.getElementById("survey").dispatchEvent(new w.Event("submit",{bubbles:true,cancelable:true}));};
 answer(Array(20).fill(3));assert.equal(d.getElementById("results").hidden,false);
 d.getElementById("saveUsername").value="alice";d.getElementById("savePassword").value="pw";
 d.getElementById("saveLogin").dispatchEvent(new w.Event("submit",{bubbles:true,cancelable:true}));await tick();
 d.getElementById("saveDb").click();await tick();
 let payload=JSON.parse(state.calls.filter(c=>c.url.endsWith("/results")&&c.options.method==="POST").at(-1).options.body);
 assert.equal(payload.questionnaire_version,sets[0].version);assert.equal(payload.questionnaire_digest,sets[0].digest);
 await choose(1);
 assert.equal(d.querySelectorAll("#survey input:checked").length,0);
 assert.equal(d.getElementById("results").hidden,true);
 assert.equal(d.getElementById("saveDb").disabled,true);
 assert.match(d.getElementById("activeSetMeta").textContent,/この1週間/);
 assert.ok(d.querySelector("#questions legend").textContent.includes(sets[1].questions[0].text));
 answer(sets[1].questions.map(q=>q.reverse?1:5));
 assert.ok([...d.querySelectorAll("#scores .score")].every(node=>node.textContent==="100 / 100"));
 d.getElementById("saveDb").click();await tick();
 payload=JSON.parse(state.calls.filter(c=>c.url.endsWith("/results")&&c.options.method==="POST").at(-1).options.body);
 assert.equal(payload.questionnaire_version,sets[1].version);assert.equal(payload.questionnaire_digest,sets[1].digest);
 state.deferNextHistory=true;d.getElementById("historyRefresh").click();await tick();
 await choose(2);state.completeHistory();await tick();
 assert.equal(d.getElementById("trendCharts").childElementCount,0);
 assert.ok(state.calls.some(c=>c.url.includes("version="+sets[2].version)));
 state.failDefinitions=true;d.getElementById("reloadSets").click();await tick();
 assert.equal(d.getElementById("questionSet").disabled,true);
 assert.equal(d.getElementById("saveDb").disabled,true);
 assert.match(d.getElementById("setsStatus").textContent,/取得できません/);
 dom.window.close();
 console.log("Questionnaire set DOM checks passed: selection, clear on switch, metadata, dynamic scoring, signed definition digest, versioned saves/history, late history rejected, fetch failure.");
})().catch(error=>{console.error(error);process.exit(1);});
