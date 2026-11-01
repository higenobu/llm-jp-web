const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const script=fs.readFileSync("static/personality-text.html","utf8").split("<script>")[1].split("</script>")[0];
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.style={};this.dataset={};this.events={};this.value="";this.textContent="";this.hidden=false;}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;this.textContent="";}
 setAttribute(k,v){this.attrs[k]=v;}
 addEventListener(event,fn){this.events[event]=fn;}
}
const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
const observations=["E","A","C","S","O"].map(id=>({id,tendency:"表現あり",evidence:["友人と相談"],explanation:"相談した経験が書かれています。",uncertainty:"普段の行動は不明。"}));
let saved=0,failHistory=false,failAnalyze=false,calls=[];
const empty={records:[],total:0,analysis_version:"ktl-writing-observations-v1"};
let history=empty;
const context=vm.createContext({
 document:{getElementById:get,createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag)},
 window:{addEventListener(){},print(){}},AbortController,console,
 fetch:async(url,opts)=>{
  calls.push({url,opts});let data,status=200;
  if(url.endsWith("/auth/login"))data={access_token:"test-token"};
  else if(url.endsWith("/analyze")){
   if(failAnalyze){status=422;data={detail:{message:"最終回答なし",diagnostics:{code:"empty_final",output_tokens:4096,max_tokens:4096,final_answer:"",preview_truncated:false}}};}
   else data={analysis:{observations},analysis_version:"ktl-writing-observations-v1",save_token:"proof",model_name:"test-model"};
  }
  else if(opts.method==="POST"){saved++;data={id:1,created_at:"2026-01-01T00:00:00Z"};}
  else if(/\/results\/\d+$/.test(url))data={id:1,created_at:"2026-01-01T00:00:00Z",text:"保存した自分の本文",analysis:{observations},model_name:"test-model"};
  else {data=history;if(failHistory){status=503;data={detail:"unavailable"};}}
  return {ok:status===200,status,json:async()=>data};
 }
});
vm.runInContext(script,context);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const fire=async(id,event)=>{await get(id).events[event]({preventDefault(){}});await tick();};
(async()=>{
 get("historyDays").value="90";
 get("username").value="alice";get("password").value="pw";
 await fire("loginForm","submit");
 assert.equal(get("password").value,"");assert.match(get("authStatus").textContent,/ログイン済み/);
 get("text").value="友人と相談した経験について書きます。".repeat(12);get("maxTokens").value="4096";
 await fire("analyze","click");
 assert.equal(get("cards").children.length,5);
 assert.equal(get("save").disabled,false);assert.equal(saved,0);
 await fire("save","click");assert.equal(saved,1);assert.match(get("saveStatus").textContent,/保存しました/);
 const row={id:1,created_at:"2026-01-01T00:00:00Z",analysis:{observations},model_name:"test-model"};
 history={...empty,records:[row,{...row,id:2}],total:2};
 await fire("historySearch","submit");assert.equal(get("timeline").children.length,1);
 const nodes=node=>[node,...node.children.flatMap(nodes)];
 assert.equal(nodes(get("timeline")).filter(n=>n.tag==="circle").length,11); // blue circle legend + 2x5 blue observations
 for(const node of nodes(get("timeline")))for(const value of Object.values(node.attrs))assert.ok(!/NaN|Infinity/.test(value));
 assert.ok(calls.some(call=>call.url.includes("?days=90")));
 assert.equal(get("history").children[0].children[1].children.length,2);
 assert.equal(get("categoryKey").children.length,4);
 assert.equal(nodes(get("timeline")).filter(n=>n.tag==="rect").length,1);
 assert.equal(nodes(get("timeline")).filter(n=>n.tag==="polygon").length,2);
 get("historyQuery").value="計画 %_";
 await fire("historySearch","submit");
 assert.ok(calls.some(call=>call.url.includes("&q="+encodeURIComponent("計画 %_"))));
 const detailButton=get("history").children[0].children[1].children[0].children[6].children[0];
 await detailButton.events.click();await tick();
 assert.equal(get("detail").hidden,false);
 assert.equal(get("detailText").textContent,"保存した自分の本文");
 assert.equal(get("detailAnalysis").children.length,5);
 await fire("closeDetail","click");
 assert.equal(get("detail").hidden,true);
 assert.equal(get("detailText").textContent,"");
 history={...empty,records:[row],total:1};
 await fire("historySearch","submit");assert.match(get("historyStatus").textContent,/2件以上/);
 failHistory=true;await fire("historySearch","submit");assert.equal(get("timeline").children.length,0);
 await fire("text","input");assert.equal(get("result").hidden,true);assert.equal(get("save").disabled,true);
 await fire("logout","click");assert.equal(get("text").value,"");assert.equal(get("history").children.length,0);
 assert.ok(!/localStorage|sessionStorage|innerHTML/.test(script));
 failHistory=false;await fire("loginForm","submit");
 get("text").value="友人と相談した経験について書きます。".repeat(12);
 failAnalyze=true;await fire("analyze","click");
 assert.equal(get("analysisDebug").hidden,false);
 assert.match(get("analysisDebugText").textContent,/empty_final/);
 assert.match(get("analysisDebugText").textContent,/4096/);
 assert.equal(get("save").disabled,true);
 await fire("clear","click");
 assert.equal(get("analysisDebug").hidden,true);
 assert.equal(get("analysisDebugText").textContent,"");
 console.log("UI flow passed: login, analysis, explicit save, timeline, same timestamps, history failure, edit invalidation, logout, no persistent browser storage/HTML injection.");
})().catch(error=>{console.error(error);process.exit(1);});



