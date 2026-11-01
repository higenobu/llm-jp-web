// Optional DOM dependency: npm install --no-save jsdom
const fs=require("node:fs"),assert=require("node:assert/strict"),{JSDOM}=require("jsdom");
const html=fs.readFileSync("static/personality-text.html","utf8"),tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const dom=new JSDOM(html,{runScripts:"dangerously",url:"https://example.test/llmjp/personality/text",
  beforeParse(w){w.fetch=async()=>({ok:true,status:200,json:async()=>({records:[],total:0,analysis_version:"ktl-writing-observations-v1"})});}});
 const w=dom.window,d=w.document;await tick();
 const text='自分から話をしました。<img src=x onerror="alert(1)">';
 const observations=[
  {id:"E",tendency:"表現あり"}, {id:"A",tendency:"表現あり"},
  {id:"C",tendency:"判定困難"}, {id:"S",tendency:"反対方向の表現あり"},
  {id:"O",tendency:"混在"},
 ].map(item=>({...item,explanation:"この文章には行動が書かれています。",evidence:item.tendency==="判定困難"?[]:[text],uncertainty:"普段の性格は確認できません。"}));
 const data={analysis:{observations},model_name:"test-model",analysis_version:"ktl-writing-observations-v1"};
 w.display(data,text);
 const cards=[...d.querySelectorAll("#cards .observation-card")];
 assert.equal(cards.length,5);
 assert.deepEqual(cards.map(c=>[...c.querySelectorAll(".pair-letter")].map(x=>x.textContent).join("")),["AB","CD","HI","JK","LM"]);
 assert.deepEqual(cards.map(c=>c.querySelectorAll('[data-selected="true"]').length),[1,1,2,1,0]);
 const chosen=card=>[...card.querySelectorAll('[data-selected="true"] .pair-letter')].map(x=>x.textContent).join("");
 assert.deepEqual(cards.map(chosen),["A","C","HI","K",""]);
 assert.equal(d.querySelectorAll("#cards .quote-details").length,4);
 assert.equal(d.querySelector("#cards blockquote").textContent,text);
 assert.equal(d.querySelectorAll("#cards img").length,0);
 assert.match(d.getElementById("resultOverview").textContent,/5観点4引用付き1判定保留/);
 assert.ok(cards.every(c=>c.querySelector(".observation-limit").textContent.includes("確認できない点")));
 const negative={...data,analysis:{observations:observations.map(item=>({...item,tendency:"反対方向の表現あり",evidence:[text]}))}};
 w.display(negative,text);
 assert.deepEqual([...d.querySelectorAll("#cards .observation-card")].map(chosen),["B","C","I","J","M"]);
 negative.analysis.observations.find(item=>item.id==="S").tendency="表現あり";
 w.display(negative,text);
 assert.equal(chosen(d.querySelectorAll("#cards .observation-card")[1]),"D");
 w.clearAll();
 assert.equal(d.getElementById("result").hidden,true);
 assert.equal(d.getElementById("resultOverview").childElementCount,0);
 assert.equal(d.getElementById("cards").childElementCount,0);
 dom.window.close();
 console.log("Result card DOM checks passed: five letter pairs, exact direction mapping, mixed/unknown states, evidence disclosure, no HTML injection, overview and clear.");
})().catch(error=>{console.error(error);process.exit(1);});
