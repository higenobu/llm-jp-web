// Optional DOM dependency: npm install --no-save jsdom
const fs=require("node:fs"),assert=require("node:assert/strict"),{JSDOM}=require("jsdom");
const sets=require("./questionnaire-fixtures.cjs"),html=fs.readFileSync("static/personality.html","utf8");
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const calls=[];
 const dom=new JSDOM(html,{runScripts:"dangerously",url:"https://example.test/llmjp/personality",
  beforeParse(w){
   w.HTMLElement.prototype.scrollIntoView=function(){};
   w.fetch=async(url,options)=>{
    calls.push({url,options});
    if(url.endsWith("/questionnaires"))return {ok:true,json:async()=>({sets})};
    if(url.endsWith("/auth/login"))return {ok:true,json:async()=>({access_token:"token"})};
    const version=new URL(url,w.location.origin).searchParams.get("version");
    return {ok:true,status:200,json:async()=>({questionnaire_version:version,total:2,records:[
     {id:1,created_at:"2026-01-01T00:00:00Z",scores:{E:0,A:25,C:50,S:75,O:100}},
     {id:2,created_at:"2026-01-02T00:00:00Z",scores:{E:10,A:35,C:60,S:85,O:90}}
    ]})};
   };
  }});
 const w=dom.window,d=w.document;await tick();await tick();
 assert.equal(d.querySelectorAll('#markerControls input[type="color"]').length,5);
 assert.equal(d.querySelectorAll("#markerControls select").length,5);
 assert.equal(d.getElementById("markerLegend").childElementCount,5);
 d.getElementById("saveUsername").value="alice";d.getElementById("savePassword").value="pw";
 d.getElementById("saveLogin").dispatchEvent(new w.Event("submit",{bubbles:true,cancelable:true}));await tick();await tick();
 const chart=i=>d.querySelectorAll("#trendCharts article")[i].querySelector("svg");
 assert.equal(chart(0).querySelectorAll("circle").length,2);
 assert.equal(chart(1).querySelectorAll("rect").length,2);
 assert.equal(chart(2).querySelector("polygon").getAttribute("points").split(" ").length,3);
 assert.equal(chart(3).querySelector("polygon").getAttribute("points").split(" ").length,4);
 assert.equal(chart(4).querySelector("polygon").getAttribute("points").split(" ").length,12);
 const table=d.getElementById("historyTable").textContent,requests=calls.length;
 const shape=d.getElementById("markerShape-E"),color=d.getElementById("markerColor-E");
 shape.value="diamond";shape.dispatchEvent(new w.Event("change",{bubbles:true}));
 color.value="#e60000";color.dispatchEvent(new w.Event("input",{bubbles:true}));
 assert.equal(chart(0).querySelectorAll("circle").length,0);
 assert.equal(chart(0).querySelectorAll("polygon").length,2);
 assert.equal(chart(0).querySelector("polygon").getAttribute("fill"),"#e60000");
 assert.equal(chart(0).querySelector("polyline").getAttribute("stroke"),"#e60000");
 assert.match(d.getElementById("markerLegend").textContent,/外向性（ひし形）/);
 assert.equal(d.getElementById("historyTable").textContent,table);
 assert.equal(calls.length,requests);
 d.getElementById("markerDefaults").click();
 assert.equal(chart(0).querySelectorAll("circle").length,2);
 assert.equal(chart(0).querySelector("polyline").getAttribute("stroke"),"#0057b8");
 d.getElementById("clear").click();
 shape.value="square";shape.dispatchEvent(new w.Event("change",{bubbles:true}));
 assert.equal(d.getElementById("trendCharts").childElementCount,0);
 assert.equal(d.getElementById("historyTable").childElementCount,0);
 assert.equal(w.localStorage.length,0);
 dom.window.close();
 console.log("Marker DOM checks passed: five distinct defaults, live shape/color, legend, unchanged scores/no requests, defaults restore, no cleared-history revival.");
})().catch(error=>{console.error(error);process.exit(1);});
