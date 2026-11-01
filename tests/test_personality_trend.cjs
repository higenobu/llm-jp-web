const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const html=fs.readFileSync("static/personality.html","utf8");
const script=html.split("<script>")[1].split("</script>")[0];
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.style={};this.textContent="";}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(){this.children=[];}
 setAttribute(k,v){this.attrs[k]=v;}
}
const elements=new Map();
const context=vm.createContext({displayedHistory:null,document:{
 createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag)
},getElement:id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);}});
vm.runInContext(script.split("const $=id=>")[0]+"\nconst $=getElement;\n"+script.slice(script.indexOf("function validateHistory("),script.indexOf("async function loadHistory(")),context);
function run(data){context.data=data;vm.runInContext("drawHistory(validateHistory(data))",context);}
const make=(n,time="2026-01-01T00:00:00Z")=>({questionnaire_version:"ktl-personality-20-v1",total:n,records:Array.from({length:n},(_,i)=>({id:i+1,created_at:time,scores:{E:0,A:25,C:50,S:75,O:100}}))});
run(make(0));assert.match(elements.get("historyStatus").textContent,/ありません/);
run(make(1));assert.equal(elements.get("trendCharts").children.length,5);assert.match(elements.get("historyStatus").textContent,/2件以上/);
run(make(2));assert.equal(elements.get("trendCharts").children.length,5);
const allNodes=node=>[node,...node.children.flatMap(allNodes)];
for(const node of allNodes(elements.get("trendCharts")))for(const v of Object.values(node.attrs))assert.ok(!/NaN|Infinity/.test(v));
assert.equal(elements.get("historyTable").children[0].children[2].children.length,2);
run({...make(100),total:125});assert.match(elements.get("historyStatus").textContent,/最新100件/);
assert.throws(()=>run({...make(1),questionnaire_version:"different"}));
const invalid=make(1);invalid.records[0].scores.E=101;assert.throws(()=>run(invalid));
const backwards=make(2);backwards.records[0].created_at="2026-01-02T00:00:00Z";assert.throws(()=>run(backwards));
console.log("Trend rendering checks passed: empty, single, repeated timestamps, five charts, numeric table, truncation, invalid data.");


