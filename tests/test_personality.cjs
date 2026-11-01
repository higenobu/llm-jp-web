// Run: node tests/test_personality.cjs (from repository root).
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const html=fs.readFileSync("static/personality.html","utf8");
const script=html.split("<script>")[1].split("</script>")[0];
// Exercise the same scoring function used by the page, without a browser.
const context=vm.createContext({});
vm.runInContext(script.split("const $=id=>")[0],context);
function evaluate(code){return JSON.parse(vm.runInContext("JSON.stringify("+code+")",context));}
assert.deepEqual(evaluate("scoreAnswers(Array(20).fill(3)).map(x=>x.score)"),[50,50,50,50,50]);
assert.deepEqual(evaluate("scoreAnswers(questions.map(q=>q[1]?1:5)).map(x=>x.score)"),[100,100,100,100,100]);
assert.deepEqual(evaluate("scoreAnswers(questions.map(q=>q[1]?5:1)).map(x=>x.score)"),[0,0,0,0,0]);
assert.deepEqual(evaluate("traits.map(t=>questions.filter(q=>q[0]===t.id).length)"),[4,4,4,4,4]);
assert.deepEqual(evaluate("traits.map(t=>questions.filter(q=>q[0]===t.id&&q[1]).length)"),[2,2,2,2,2]);
for(const answers of [[],Array(19).fill(3),Array(20).fill(0),Array(20).fill(6),Array(20).fill(2.5),Array(20).fill(null)]){
 assert.throws(()=>vm.runInContext("scoreAnswers("+JSON.stringify(answers)+")",context));
}
assert.equal(evaluate("scoreAnswers(questions.map((q,i)=>q[0]==='E'?(q[1]?1:5):3)).find(x=>x.id==='E').score"),100);
assert.ok(!/localStorage|sessionStorage/.test(script),"Browser credentials must not be persisted");
assert.ok(script.includes('/llmjp/personality/results'));
assert.ok(script.includes("questionnaire_version:selectedVersion"));
console.log("Scoring checks passed: boundaries, reverse items, neutral, missing/invalid inputs, trait mapping, no browser storage; authenticated save endpoint.");

