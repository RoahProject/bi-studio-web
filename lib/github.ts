import {type Project, normalizeProject} from './projects';
export const repository = {owner:'RoahProject',name:'bi-studio',branch:'main',path:'data/workspace.json'};
export type RequirementFile={id:string;projectId:string;name:string;size:number;mime:string;uploadedAt:string;content:string};
export type Workspace={format:'bi-studio';version:1;projects:Project[];files:RequirementFile[]};
type Snapshot={workspace:Workspace;sha?:string;pending:boolean};
const empty=():Workspace=>({format:'bi-studio',version:1,projects:[],files:[]});
let token='',snapshot:Snapshot={workspace:empty(),pending:false};
let tail:Promise<unknown>=Promise.resolve();
let generation=0;
export type SyncState={message:string;pending:boolean;busy:boolean};
let syncState:SyncState={message:'Sign in to open your workspace',pending:false,busy:false};
const listeners=new Set<()=>void>();
export function subscribe(fn:()=>void){listeners.add(fn);return ()=>{listeners.delete(fn)}}
export function state(){return syncState}
function status(message:string,busy=false){syncState={message,pending:snapshot.pending,busy};listeners.forEach(fn=>fn())}
function serial<T>(fn:()=>Promise<T>):Promise<T>{const task=tail.then(fn,fn);tail=task.catch(()=>{});return task}
export class GitHubError extends Error{constructor(public code:number,message:string){super(message)}}
const apiBase=`https://api.github.com/repos/${repository.owner}/${repository.name}`;
async function request(path:string,options:RequestInit={},accept='application/vnd.github+json'){
 if(!token)throw new GitHubError(401,'Please sign in again.');
 const session=generation;
 let response:Response;
 try{response=await fetch(`${apiBase}${path}`,{...options,cache:'no-store',redirect:'error',headers:{Accept:accept,Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28',...options.headers},signal:AbortSignal.timeout(45000)});}catch{throw new GitHubError(0,'Cannot reach GitHub. Your local copy is available; retry when connected.');}
 if(session!==generation)throw new GitHubError(401,'Session changed. Please sign in again.');
 if(!response.ok){const text=await response.json().catch(()=>({}));const code=response.status;
 const message=code===401?'Token expired or invalid. Sign out and enter a new token.':code===404?'Private repository or file not accessible. Check the token and repository access.':code===409||code===422?'GitHub has a newer version, or rejected this update. Export your local backup, then reload the GitHub copy.':code===403?'GitHub denied access or its API limit was reached. Check Contents permission and try again later.':`GitHub request failed (${code}): ${text.message||'Please retry.'}`;
 throw new GitHubError(code,message);}
 return response;
}
const key='RoahProject/bi-studio';
function db():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const req=indexedDB.open('bi-studio-private-cache',1);req.onupgradeneeded=()=>req.result.createObjectStore('workspace');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(Error('Browser storage is unavailable. Enable storage for this site.'));})}
async function cached():Promise<Snapshot|undefined>{const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('workspace','readonly');const r=tx.objectStore('workspace').get(key);r.onsuccess=()=>resolve(r.result);tx.onerror=()=>reject(Error('Cannot read browser copy'));tx.oncomplete=()=>d.close()})}
async function cache(){const d=await db();return new Promise<void>((resolve,reject)=>{const tx=d.transaction('workspace','readwrite');tx.objectStore('workspace').put(structuredClone(snapshot),key);tx.oncomplete=()=>{d.close();resolve()};tx.onerror=()=>{d.close();reject(Error('Browser storage is full or disabled. Export a backup before closing this page.'))}})}
export function encode(text:string){const bytes=new TextEncoder().encode(text);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary)}
function decode(text:string){return new TextDecoder().decode(Uint8Array.from(atob(text.replace(/\s/g,'')),c=>c.charCodeAt(0)))}
export function validate(value:unknown):Workspace{
 const w=value as Workspace;
 if(!w||w.format!=='bi-studio'||w.version!==1||!Array.isArray(w.projects)||!Array.isArray(w.files))throw Error('This is not a BI Studio workspace backup.');
 const ids=new Set<string>();
 for(const p of w.projects){if(!p||typeof p.id!=='string'||!p.id||ids.has(p.id)||typeof p.name!=='string'||typeof p.description!=='string'||typeof p.owner!=='string'||typeof p.due!=='string'||typeof p.stage!=='string'||typeof p.priority!=='string'||typeof p.source!=='string'||!Array.isArray(p.tasks)||!Array.isArray(p.milestones))throw Error('Invalid project in JSON.');ids.add(p.id);
 if((p.department!==undefined&&typeof p.department!=='string')||(p.start!==undefined&&typeof p.start!=='string'))throw Error('Invalid department or start date in JSON.');
 for(const t of p.tasks){if(typeof t.id!=='string'||typeof t.title!=='string'||typeof t.done!=='boolean'||!Array.isArray(t.subtasks)||t.subtasks.some(s=>!s||typeof s.id!=='string'||typeof s.title!=='string'||typeof s.done!=='boolean'))throw Error('Invalid task in JSON.');}
 for(const m of p.milestones){if(typeof m.id!=='string'||typeof m.title!=='string'||typeof m.due!=='string'||typeof m.done!=='boolean')throw Error('Invalid milestone in JSON.');}}
 for(const f of w.files){if(!f||!ids.has(f.projectId)||typeof f.id!=='string'||typeof f.name!=='string'||typeof f.mime!=='string'||typeof f.uploadedAt!=='string'||typeof f.content!=='string'||!Number.isFinite(f.size)||f.size<0||f.size>5*1024*1024||!/^[A-Za-z0-9+/]*={0,2}$/.test(f.content))throw Error('Invalid requirements file in JSON.');}
 if(new TextEncoder().encode(JSON.stringify(w)).length>20*1024*1024)throw Error('Workspace exceeds the 20 MB limit. Remove older documents and try again.');
 return {...w,projects:w.projects.map(normalizeProject)};
}
async function remote():Promise<Snapshot>{
 // Pin both metadata and raw contents to the same commit to avoid races.
 const branch=await (await request(`/commits/${encodeURIComponent(repository.branch)}`)).json();
 const path=`/contents/${repository.path}?ref=${encodeURIComponent(branch.sha)}`;
 let r:Response;
 try{r=await request(path,{},'application/vnd.github.object+json')}catch(e){if(e instanceof GitHubError&&e.code===404)return {workspace:empty(),pending:false};throw e}
 const meta=await r.json();
 const text=meta.encoding==='base64'?decode(meta.content):await (await request(path,{},'application/vnd.github.raw+json')).text();
 return {workspace:validate(JSON.parse(text)),sha:meta.sha,pending:false};
}
async function commit(){
 if(!snapshot.pending)return;
 status('Saving to private GitHub JSON…',true);
 const local=structuredClone(snapshot);
 const body={message:'Update BI Studio workspace',branch:repository.branch,content:encode(JSON.stringify(local.workspace,null,2)+'\n'),...(local.sha?{sha:local.sha}:{})};
 try{const result=await (await request(`/contents/${repository.path}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).json();
 snapshot={workspace:local.workspace,sha:result.content.sha,pending:false};await cache();status('Saved to GitHub · Browser copy updated');
 }catch(e){status((e as Error).message);throw e}
}
export async function signIn(secret:string){return serial(async()=>{token=secret.trim();generation++;
 try{const repo=await (await request('')).json();if(!repo.private)throw Error('The data repository must be private. Make RoahProject/bi-studio private before continuing.');
 const local=await cached();snapshot=local?{...local,workspace:validate(local.workspace)}:{workspace:empty(),pending:false};
 await refreshInternal();
 }catch(e){token='';status((e as Error).message);throw e}
})}
export async function signOut(){return serial(async()=>{token='';generation++;snapshot={workspace:empty(),pending:false};const d=await db();await new Promise<void>((resolve,reject)=>{const tx=d.transaction('workspace','readwrite');tx.objectStore('workspace').delete(key);tx.oncomplete=()=>{d.close();resolve()};tx.onerror=()=>reject(Error('Could not clear browser copy'))});status('Signed out')})}
async function refreshInternal(discard=false){status('Checking GitHub…',true);
 try{const r=await remote();
 if(snapshot.pending&&!discard){if(snapshot.sha!==r.sha){status('Changes on another device conflict with your local edits. Export backup, then reload GitHub.');return;}await commit();return;}
 snapshot=r;await cache();status('Saved to GitHub · Browser copy updated');
 }catch(e){status((e as Error).message);if(snapshot.workspace.projects.length===0&&!snapshot.pending)throw e}
}
export function refresh(discard=false){return serial(()=>refreshInternal(discard))}
export function projects(){return structuredClone(snapshot.workspace.projects)}
export function files(projectId:string){return structuredClone(snapshot.workspace.files.filter(f=>f.projectId===projectId))}
async function mutate(fn:(w:Workspace)=>Workspace){
 const previous=snapshot;const next=validate(fn(structuredClone(previous.workspace)));
 snapshot={workspace:next,sha:previous.sha,pending:true};
 try{await cache()}catch(e){snapshot=previous;throw e}
 status('Saved in browser · Waiting to sync');
 try{await commit()}catch(e){if(e instanceof GitHubError&&e.code===0)return;throw e}
}
export function saveProject(project:Project){return serial(()=>mutate(w=>({...w,projects:w.projects.some(p=>p.id===project.id)?w.projects.map(p=>p.id===project.id?normalizeProject(project):p):[...w.projects,normalizeProject(project)]})))}
export function deleteProject(id:string){return serial(()=>mutate(w=>({...w,projects:w.projects.filter(p=>p.id!==id),files:w.files.filter(f=>f.projectId!==id)})))}
export function uploadFile(projectId:string,file:File){return serial(async()=>{
 const mime:Record<string,string>={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',txt:'text/plain',md:'text/markdown'};
 const ext=file.name.split('.').pop()?.toLowerCase()||'';
 if(!mime[ext])throw Error('Choose a PDF, DOCX, TXT, or MD file.');
 if(file.size>5*1024*1024||file.size===0)throw Error('Choose a file between 1 byte and 5 MB.');
 if(!snapshot.workspace.projects.some(p=>p.id===projectId))throw Error('Save the project before adding requirements.');
 if(files(projectId).length>=5)throw Error('Maximum five files per project.');
 const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
 const f:RequirementFile={id:crypto.randomUUID(),projectId,name:file.name,size:file.size,mime:mime[ext],uploadedAt:new Date().toISOString(),content:btoa(binary)};
 await mutate(w=>({...w,files:[...w.files,f]}));return f;
})}
export function deleteFile(id:string){return serial(()=>mutate(w=>({...w,files:w.files.filter(f=>f.id!==id)})))}
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export function downloadFile(file:RequirementFile){const bytes=Uint8Array.from(atob(file.content),c=>c.charCodeAt(0));download(new Blob([bytes],{type:file.mime}),file.name)}
export function exportBackup(){download(new Blob([JSON.stringify(snapshot.workspace,null,2)],{type:'application/json'}),'BI-Studio-Backup.json')}
export function importBackup(file:File){return serial(async()=>{if(file.size>20*1024*1024)throw Error('Choose a workspace JSON up to 20 MB.');const incoming=validate(JSON.parse(await file.text()));await mutate(()=>incoming)})}
