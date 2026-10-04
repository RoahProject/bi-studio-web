import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const destination=mkdtempSync(join(tmpdir(),'bi-studio-tests-'));
try{
 const tsc=spawnSync(process.execPath,['node_modules/typescript/bin/tsc','lib/github.ts','lib/projects.ts','--outDir',destination,'--module','commonjs','--moduleResolution','node','--target','ES2022','--lib','DOM,ES2022','--skipLibCheck','--esModuleInterop'],{stdio:'inherit'});
 if(tsc.status!==0)process.exitCode=1;
 else {writeFileSync(join(destination,'package.json'),'{"type":"commonjs"}');const result=spawnSync(process.execPath,['--test','tests/github.test.mjs'],{stdio:'inherit',env:{...process.env,BI_STUDIO_TEST_MODULE:join(destination,'github.js')}});process.exitCode=result.status??1;}
}finally{rmSync(destination,{recursive:true,force:true})}
