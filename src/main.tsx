import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BarChart3,LockKeyhole} from 'lucide-react';
import Home from '../app/page';
import * as github from '../lib/github';
import '../app/globals.css';
function App(){const [signedIn,setSignedIn]=useState(false),[token,setToken]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const prevent=(e:BeforeUnloadEvent)=>{if(github.state().pending){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',prevent);return()=>window.removeEventListener('beforeunload',prevent)},[]);
 async function signIn(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{await github.signIn(token);setToken('');setSignedIn(true)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function logout(){if(github.state().pending&&!window.confirm('Unsynced edits will be removed from this browser. Cancel and export a backup first if you want to keep them.'))return;try{await github.signOut();setSignedIn(false)}catch(e){setError((e as Error).message)}}
 return signedIn?<Home onLogout={logout}/>:<div className="signin-wrap"><form className="signin-card" onSubmit={signIn}><div className="brand"><span className="brand-icon"><BarChart3/></span>BI Studio</div><h1>Your project workspace.</h1><p>Plan Power BI projects with tasks, subtasks, milestones, and requirements.</p><div className="signin-repo"><LockKeyhole size={17}/>Private workspace: RoahProject / bi-studio</div><label>GitHub access token<input type="password" autoComplete="off" required spellCheck={false} value={token} onChange={e=>setToken(e.target.value)} placeholder="github_pat_…"/></label><p className="file-save-note">Use a fine-grained token for bi-studio with Contents: Read and write. Your token stays in this page's memory. Enter it again after reopening or refreshing the page.</p>{error&&<p role="alert" className="forecast-error">{error}</p>}<button className="primary" disabled={busy}>{busy?'Opening workspace…':'Open private workspace'}</button><p className="file-save-note">Project details and documents are stored in private GitHub JSON. Signing out clears this browser's copy.</p></form></div>
}
createRoot(document.getElementById('root')!).render(<App/>);
