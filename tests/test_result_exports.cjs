// Run with: npm install --no-save jsdom && node tests/test_result_exports.cjs
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
for(const path of ['static/personality.html','static/personality-text.html']){
 const html=fs.readFileSync(path,'utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 new vm.Script(script);
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.test/llmjp'}),w=dom.window;
 for(const id of ['exportCsv','historyCsv','historyPdf'])assert.ok(w.document.getElementById(id));
 w.eval(script.slice(script.indexOf('function downloadCsv(')));
 let captured,revoked=false,clicked=false;
 w.Blob=class{constructor(parts,opts){captured={parts,opts};}};
 w.URL.createObjectURL=()=> 'blob:export';w.URL.revokeObjectURL=()=>{revoked=true;};
 w.setTimeout=fn=>fn();w.HTMLAnchorElement.prototype.click=function(){clicked=true;assert.equal(this.download,'result.csv');};
 w.downloadCsv('result.csv',['特性','引用'],[['E','引用,"日本語"\n次行'],['=1+1','  @SUM(A1)']]);
 const csv=captured.parts.join('');
 assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"引用,""日本語""\n次行"'));
 assert.ok(csv.includes("\"'=1+1\""));assert.ok(csv.includes("\"'  @SUM(A1)\""));
 assert.ok(clicked&&revoked);assert.equal(w.document.querySelectorAll('a[download]').length,0);
 const report=new JSDOM('<!doctype html><html><head></head><body></body></html>');let printed=false;
 w.open=()=>({document:report.window.document,focus(){},print(){printed=true;}});
 w.printReport('結果',['説明'],[['<img src=x onerror=alert(1)>']],['参考用']);
 assert.ok(printed);assert.equal(report.window.document.querySelector('img'),null);
 assert.ok(report.window.document.querySelector('td').textContent.includes('<img'));
 assert.equal(report.window.document.querySelectorAll('input,textarea').length,0);
 dom.window.close();report.window.close();
}
console.log('CSV escaping, formula handling, report isolation and script syntax passed');
