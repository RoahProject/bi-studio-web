'use client';
import {useEffect,useState} from 'react';
import {Upload,FileText,X} from 'lucide-react';
import {AlertDialog,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogAction,AlertDialogCancel} from '@/components/ui/alert-dialog';
import {type Project} from '@/lib/projects';
import * as github from '@/lib/github';
import {type RequirementFile} from '@/lib/github';
export function RequirementsPanel({project,savedProject,onBusy}:{project:Project;savedProject?:Project;onBusy:(v:boolean)=>void}){
 const [files,setFiles]=useState<RequirementFile[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[remove,setRemove]=useState<RequirementFile|null>(null);
 useEffect(()=>{onBusy(!!busy);return ()=>onBusy(false)},[busy,onBusy]);
 async function load(){setLoading(true);setError('');setFiles(savedProject?github.files(project.id):[]);setLoading(false)}
 useEffect(()=>{load();return github.subscribe(()=>setFiles(github.files(project.id)))},[project.id]);
 async function upload(file:File){setError('');setNotice('');setBusy('Saving requirements…');try{await github.uploadFile(project.id,file);setFiles(github.files(project.id));setNotice(github.state().pending?'Saved in browser; waiting to sync.':'Requirements saved to private GitHub JSON.');}catch(e){setFiles(github.files(project.id));setError((e as Error).message)}finally{setBusy('')}}
 async function removeFile(file:RequirementFile){setBusy('Removing file…');setError('');try{await github.deleteFile(file.id);setFiles(github.files(project.id));setNotice('File removed.');}catch(e){setFiles(github.files(project.id));setError((e as Error).message)}finally{setBusy('')}}
 return <section className="requirements-panel"><div className="task-heading"><h3><FileText size={18}/>Requirements</h3></div><p className="plan-help">Upload the scope, required pages, KPIs, data sources, and acceptance criteria. Keep the project scope and supporting documents together.</p>
 {!savedProject?<p className="setup-note">Save this new project first, then reopen it to upload requirements.</p>:<><label className={'upload-area '+(busy?'upload-disabled':'')}><Upload size={22}/><span><b>Upload requirements</b><small>PDF, DOCX, TXT, or MD · Up to 5 MB each · 5 files per project · 20 MB total workspace JSON</small></span><input type="file" accept=".pdf,.docx,.txt,.md" disabled={!!busy||loading||files.length>=5} onChange={e=>{const file=e.target.files?.[0];if(file)upload(file);e.target.value='';}}/></label><div className="requirement-files">{files.map(file=><div className="requirement-file" key={file.id}><FileText size={16}/><button type="button" className="file-link" onClick={()=>github.downloadFile(file)}>{file.name}</button><span>{Math.ceil(file.size/1024)} KB</span><button type="button" disabled={!!busy} aria-label={'Remove '+file.name} onClick={()=>setRemove(file)}><X size={16}/></button></div>)}</div><p className="file-save-note">Documents are stored as encoded content inside private workspace JSON. Deleted files remain in Git history.</p></>}
 {busy&&<p role="status" className="file-save-note">{busy}</p>}
 {error&&<div className="forecast-error" role="alert">{error}{!busy&&<button type="button" className="secondary" onClick={load}>Reload</button>}</div>}{notice&&<p className="forecast-notice" role="status">{notice}</p>}
 <AlertDialog open={!!remove} onOpenChange={v=>{if(!v)setRemove(null)}}><AlertDialogContent><AlertDialogTitle>Remove requirements file?</AlertDialogTitle><AlertDialogDescription>{remove?.name} will be deleted.</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel>Keep file</AlertDialogCancel><AlertDialogAction onClick={()=>{if(remove)removeFile(remove)}}>Remove file</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </section>
}
