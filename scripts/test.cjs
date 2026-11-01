const fs=require("node:fs"),{spawnSync}=require("node:child_process");
let failed=false;
for(const file of fs.readdirSync("tests").filter(x=>/^test_.*\.cjs$/.test(x)).sort()){
 console.log("\n"+file);
 const result=spawnSync(process.execPath,["tests/"+file],{stdio:"inherit"});
 if(result.error||result.status!==0)failed=true;
}
process.exitCode=failed?1:0;
