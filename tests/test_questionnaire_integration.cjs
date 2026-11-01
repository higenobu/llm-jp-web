// Optional DOM dependency: npm install --no-save jsdom
const fs=require("node:fs"),assert=require("node:assert/strict"),{JSDOM,VirtualConsole}=require("jsdom");
const html=fs.readFileSync(process.env.QUESTIONNAIRE_HTML||"static/personality.html","utf8");
const sets=require("./questionnaire-fixtures.cjs"),tick=()=>new Promise(resolve=>setImmediate(resolve));
for(const id of ["questionSet","reloadSets","activeSetMeta","setDescription","setsStatus","copySaveToken","historyRefresh","trendCharts","historyTable"]){
 assert.ok(html.includes('id="'+id+'"'),"Required integration control missing: "+id);
}
(async()=>{
 const state={calls:[],copied:[],failSets:false,errors:[]};
 const virtualConsole=new VirtualConsole();
 virtualConsole.on("jsdomError",error=>state.errors.push(error));
 const dom=new JSDOM(html,{runScripts:"dangerously",url:"https://example.test/llmjp/personality",virtualConsole,
  beforeParse(w){
   w.HTMLElement.prototype.scrollIntoView=function(){};
   Object.defineProperty(w,"isSecureContext",{value:true});
   Object.defineProperty(w.navigator,"clipboard",{value:{writeText:async value=>state.copied.push(value)}});
   w.fetch=async(url,options)=>{
    state.calls.push({url,options});
    if(url.endsWith("/questionnaires"))return {ok:!state.failSets,json:async()=>({sets})};
    if(url.endsWith("/auth/login"))return {ok:true,json:async()=>({access_token:"issued-token"})};
    const version=new URL(url,w.location.origin).searchParams.get("version");
    return {ok:true,status:200,json:async()=>({questionnaire_version:version,total:1,records:[
     {id:1,created_at:"2026-01-01T00:00:00Z",scores:{E:50,A:50,C:50,S:50,O:50}}
    ]})};
   };
  }});
 const w=dom.window,d=w.document;
 await tick();await tick();
 assert.equal(state.errors.length,0);
 assert.equal(d.querySelectorAll("#questionSet option").length,3);
 assert.equal(d.getElementById("questionSet").disabled,false);
 d.getElementById("saveUsername").value="alice";d.getElementById("savePassword").value="pw";
 d.getElementById("saveLogin").dispatchEvent(new w.Event("submit",{bubbles:true,cancelable:true}));
 await tick();await tick();
 assert.equal(d.getElementById("historyRefresh").disabled,false);
 assert.equal(d.getElementById("trendCharts").childElementCount,5);
 assert.equal(d.querySelectorAll("#historyTable tbody tr").length,1);
 assert.ok(state.calls.some(call=>call.options.headers?.Authorization==="Bearer issued-token"));
 d.getElementById("questionSet").value=sets[1].version;
 d.getElementById("questionSet").dispatchEvent(new w.Event("change",{bubbles:true}));await tick();
 assert.equal(d.getElementById("trendCharts").childElementCount,5);
 assert.ok(state.calls.some(call=>call.url.includes("version="+sets[1].version)));
 for(let i=0;i<20;i++)d.querySelector('input[name="q'+i+'"][value="3"]').click();
 d.getElementById("survey").dispatchEvent(new w.Event("submit",{bubbles:true,cancelable:true}));
 assert.equal(d.getElementById("saveDb").disabled,false);
 d.getElementById("copySaveToken").click();await tick();
 assert.deepEqual(state.copied,["issued-token"]);
 assert.equal(d.querySelectorAll("#survey input:checked").length,20);
 assert.equal(d.getElementById("results").hidden,false);
 state.failSets=true;d.getElementById("reloadSets").click();await tick();
 assert.equal(d.getElementById("questionSet").disabled,true);
 assert.equal(d.getElementById("historyRefresh").disabled,true);
 assert.equal(d.getElementById("saveDb").disabled,true);
 assert.equal(d.getElementById("copySaveToken").disabled,false);
 state.failSets=false;d.getElementById("reloadSets").click();await tick();await tick();
 assert.equal(d.getElementById("questionSet").disabled,false);
 assert.equal(d.getElementById("historyRefresh").disabled,false);
 assert.equal(d.getElementById("trendCharts").childElementCount,5);
 assert.equal(state.errors.length,0);
 dom.window.close();
 console.log("Integrated DOM regression passed: required HTML controls, three sets, authenticated history graph/table, switching, token copy, load failure/recovery, no JS errors.");
})().catch(error=>{console.error(error);process.exit(1);});
