const fs=require("node:fs"),crypto=require("node:crypto");
function sorted(x){if(Array.isArray(x))return x.map(sorted);if(x&&typeof x==="object")return Object.fromEntries(Object.keys(x).sort().map(k=>[k,sorted(x[k])]));return x;}
module.exports=JSON.parse(fs.readFileSync("tests/fixtures/questionnaires.json","utf8")).map(s=>({...s,digest:crypto.createHash("sha256").update(JSON.stringify(sorted(s))).digest("hex")}));

