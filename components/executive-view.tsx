import {useState} from 'react';
import {Download,Table2} from 'lucide-react';
import {toast} from 'sonner';
import {type Project,isDate} from '@/lib/projects';
import {executiveRows} from '@/lib/executive';
import {exportExecutiveExcel} from '@/lib/excel-export';
const displayDate=(value:string)=>isDate(value)?new Date(value+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';
export function ExecutiveView({projects,today,loading,error}:{projects:Project[];today:string;loading:boolean;error:string}){
 const [exporting,setExporting]=useState(false);
 const rows=executiveRows(projects,today);
 async function exportExcel(){setExporting(true);try{exportExecutiveExcel(projects,today);toast.success('Executive report exported to Excel')}catch(e){toast.error((e as Error).message)}finally{setExporting(false)}}
 return <section className="executive-panel" aria-label="Executive portfolio"><div className="executive-heading"><div><h2><Table2 size={19}/>Department portfolio</h2><p>Department summary · As of {displayDate(today)}</p></div><button className="primary" disabled={loading||!!error||exporting} onClick={exportExcel}><Download size={17}/>{exporting?'Exporting…':'Export Excel'}</button></div>
 <div className="rag-legend" aria-label="RAG rules"><span><i className="rag-dot red"/>Red: overdue department work</span><span><i className="rag-dot amber"/>Amber: not started, finish missing, or due within 7 days</span><span><i className="rag-dot green"/>Green: completed or unfinished work due beyond 7 days</span></div>
 {error?<p role="alert" className="forecast-error">{error}</p>:<div className="executive-table-scroll"><table className="executive-table"><caption className="sr-only">Department, scope, start date, finish date, and delivery status with RAG</caption><thead><tr><th>Department</th><th>Scope</th><th>Start</th><th>Finish</th><th>Status (RAG)</th></tr></thead><tbody>{loading?<tr><td colSpan={5}>Loading portfolio…</td></tr>:rows.length?rows.map(row=><tr key={row.department}><td><strong>{row.department}</strong></td><td className="executive-scope"><span>{row.scope}</span></td><td>{displayDate(row.start)}</td><td>{displayDate(row.finish)}</td><td><span className={'rag-badge '+row.color.toLowerCase()} title={row.reason}><i className={'rag-dot '+row.color.toLowerCase()}/>{row.status}<small>{row.color}</small></span></td></tr>):<tr><td colSpan={5}>No projects yet. Open Project Workspace to add your first project.</td></tr>}</tbody></table></div>}
 <p className="executive-note">One row per department. Scope shows up to two concise scope summaries. Start is the earliest project start; Finish is the latest planned finish. RAG reflects the most urgent unfinished project. The totals above count individual projects; Overdue overlaps unfinished statuses.</p></section>
}
