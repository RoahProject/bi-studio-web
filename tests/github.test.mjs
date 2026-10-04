import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const g=require(process.env.BI_STUDIO_TEST_MODULE);
const records=new Map();
globalThis.indexedDB={open(){const request={result:{objectStoreNames:[],createObjectStore(){},close(){},transaction(){const tx={objectStore(){return {get(key){const r={};setTimeout(()=>{r.result=records.get(key);r.onsuccess?.();tx.oncomplete?.()},0);return r},put(v,k){records.set(k,structuredClone(v));setTimeout(()=>tx.oncomplete?.(),0)},delete(k){records.delete(k);setTimeout(()=>tx.oncomplete?.(),0)}}}};return tx}}};setTimeout(()=>request.onsuccess?.(),0);return request}};
let remote,sha,counter=0,offline=false,rejected=false,puts=0;
const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
globalThis.fetch=async(url,options)=>{
 assert.equal(options.headers.Authorization,'Bearer test-only-token');
 if(offline)throw Error('Network unavailable');
 if(rejected)return response({},401);
 const path=new URL(url).pathname;
 if(path.endsWith('/bi-studio'))return response({private:true,default_branch:'main'});
 if(path.includes('/commits/'))return response({sha:'commit-current'});
 if(options.method==='PUT'){
  puts++;const body=JSON.parse(options.body);
  if(body.sha!==sha)return response({message:'sha mismatch'},409);
  remote=JSON.parse(Buffer.from(body.content,'base64').toString('utf8'));sha=`sha-${++counter}`;
  return response({content:{sha}},201);
 }
 if(path.endsWith('workspace.json')){
  if(!remote)return response({},404);
  if(options.headers.Accept==='application/vnd.github.raw+json')return response(remote);
  const content=JSON.stringify(remote);return response({sha,encoding:content.length>1000000?'none':'base64',content:content.length>1000000?'':Buffer.from(content).toString('base64')});
 }
 throw Error('Unexpected API route');
};
const project=(id,name='Project')=>({id,name,description:'Requirements',owner:'Roah',due:'2026-12-01',stage:'Requirements',priority:'Medium',source:'Oracle',tasks:[],milestones:[],sample:false});
test('private JSON persistence, offline retry, conflict protection, requirements and sign-out',async()=>{
 await g.signIn('test-only-token');assert.deepEqual(g.projects(),[]);
 await g.saveProject(project('one','Sales 日本語'));assert.equal(remote.projects[0].name,'Sales 日本語');assert.equal(g.state().pending,false);
 assert.equal(JSON.stringify([...records.values()]).includes('test-only-token'),false);
 offline=true;await g.saveProject(project('one','Saved offline'));assert.equal(g.state().pending,true);assert.equal(remote.projects[0].name,'Sales 日本語');
 offline=false;await g.refresh();assert.equal(remote.projects[0].name,'Saved offline');assert.equal(g.state().pending,false);
 // Simulate a second device changing the same JSON between reads and a save.
 remote.projects[0].name='Other device';sha='different-sha';
 await assert.rejects(g.saveProject(project('one','Local conflict')),/newer version/);assert.equal(remote.projects[0].name,'Other device');assert.equal(g.projects()[0].name,'Local conflict');
 const oldPuts=puts;await g.refresh();assert.equal(puts,oldPuts);assert.match(g.state().message,/conflict/);
 await g.refresh(true);assert.equal(g.projects()[0].name,'Other device');assert.equal(g.state().pending,false);
 const file=new File(['scope text'],'requirements.txt',{type:'text/plain'});await g.uploadFile('one',file);assert.equal(remote.files.length,1);assert.equal(Buffer.from(remote.files[0].content,'base64').toString(),'scope text');
 await assert.rejects(g.uploadFile('one',new File(['no'],'file.exe')),/Choose a PDF/);
 // Test the raw-content path used when encoded document JSON exceeds 1 MB.
 await g.uploadFile('one',new File(['x'.repeat(1100000)],'large.txt'));await g.refresh();assert.equal(g.files('one').length,2);
 await g.deleteProject('one');assert.equal(remote.projects.length,0);assert.equal(remote.files.length,0);
 await g.signOut();assert.equal(records.size,0);await assert.rejects(g.refresh(),/sign in/i);
 rejected=true;await assert.rejects(g.signIn('test-only-token'),/expired or invalid/);rejected=false;
 assert.throws(()=>g.validate({format:'bi-studio',version:1,projects:[{id:'bad'}],files:[]}),/Invalid project/);
});
