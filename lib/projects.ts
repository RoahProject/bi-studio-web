export const stages = ['Requirements','Data preparation','Model & DAX','Report design','UAT','Deployed'];
export type Subtask = {id:string; title:string; done:boolean};
export type Task = Subtask & {subtasks:Subtask[]};
export type Milestone = {id:string; title:string; due:string; done:boolean};
export type Project = {id:string; name:string; description:string; department?:string; start?:string; owner:string; due:string; stage:string; priority:string; source:string; tasks:Task[]; milestones:Milestone[]; sample:boolean};
export const checklist = ['Confirm requirements and KPI definitions','Prepare and validate source data','Build relationships and DAX measures','Design report pages and interactions','Complete UAT and reconcile totals','Publish and configure refresh'];
export const defaultSubtasks = [
 ['Identify stakeholders and reporting goals','Define KPIs, calculation rules, and scope','Confirm requirements with stakeholders'],
 ['Connect to sources and set up extraction','Clean and transform data in Power Query or SQL','Validate data quality and reconcile source totals'],
 ['Build fact and dimension tables with relationships','Create DAX measures and date calculations','Validate calculations and optimize model performance'],
 ['Create report pages and visual layouts','Configure slicers, drill-through, and tooltips','Review formatting and usability with stakeholders'],
 ['Test report filters and business scenarios','Reconcile report totals and resolve defects','Obtain user acceptance and sign-off'],
 ['Publish to the Power BI workspace','Configure gateway, scheduled refresh, and access','Verify production refresh and document handover']
];
export const milestoneTitles = ['Requirements signed off','Source data validated','Semantic model ready','Report design approved','UAT signed off','Dashboard live'];
export function createDefaultTasks():Task[]{return checklist.map((title,i)=>({id:crypto.randomUUID(),title,done:false,subtasks:defaultSubtasks[i].map(title=>({id:crypto.randomUUID(),title,done:false}))}));}
export function createDefaultMilestones(due=''):Milestone[]{return milestoneTitles.map((title,i)=>({id:`milestone-${i}`,title,due:i===5?due:'',done:false}));}
export const taskDone=(t:Task)=>t.subtasks.length>0?t.subtasks.every(s=>s.done):t.done;
export function normalizeProject(p:Project):Project{
 return {...p,department:typeof p.department==='string'?p.department:'',start:typeof p.start==='string'?p.start:'',tasks:p.tasks.map(t=>{
 const i=checklist.indexOf(t.title);
 const subtasks=Array.isArray(t.subtasks)?t.subtasks:(i>=0?defaultSubtasks[i]:[]).map((title,j)=>({id:`${t.id}-sub-${j}`,title,done:t.done}));
 const task={...t,subtasks};return {...task,done:taskDone(task)};
 }),milestones:Array.isArray(p.milestones)?p.milestones:createDefaultMilestones(p.due)};
}
export function completion(p:Project){const units=p.tasks.flatMap(t=>t.subtasks.length?t.subtasks:[t]);return {total:units.length,done:units.filter(t=>t.done).length};}
export function projectStatus(p:Project):'Not Yet Started'|'In Progress'|'Completed'{
 if(p.stage==='Deployed')return 'Completed';
 return completion(p).done===0&&!p.milestones.some(m=>m.done)?'Not Yet Started':'In Progress';
}
export const progress=(p:Project)=>{const c=completion(p);return c.total?Math.round(c.done/c.total*100):0;};
export const samples:Project[] = [
 ['Sales performance','Revenue, targets, and growth across branches.','Model & DAX','High','2026-10-16','Oracle · Excel',3],
 ['Payment monitoring','Track collections and payment channel performance.','Report design','High','2026-10-09','MySQL',4],
 ['Service desk overview','Monitor ticket volumes, backlog, and SLA compliance.','UAT','Medium','2026-10-07','SharePoint',5],
 ['Operations productivity','A unified view of productivity and team performance.','Data preparation','Medium','2026-10-23','Excel · SQL Server',2],
 ['Customer experience','Explore satisfaction scores and customer feedback.','Requirements','Low','2026-11-06','Excel',1],
 ['Workforce overview','Headcount and staffing trends for operational planning.','Deployed','Medium','2026-09-30','SharePoint · Excel',6]
].map((p,i)=>({id:`sample-${i}`,name:String(p[0]),description:String(p[1]),stage:String(p[2]),priority:String(p[3]),due:String(p[4]),source:String(p[5]),owner:'Demo analyst',sample:true,milestones:createDefaultMilestones(String(p[4])),tasks:checklist.map((title,j)=>({id:`t${j}`,title,done:j<Number(p[6]),subtasks:defaultSubtasks[j].map((title,k)=>({id:`t${j}-sub-${k}`,title,done:j<Number(p[6])}))}))}));

export function localDate(d=new Date()):string{return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function isDate(value:string):boolean{return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
export function ragStatus(p:Project,today=localDate()):{color:'Red'|'Amber'|'Green';status:string;reason:string}{
 const status=projectStatus(p);
 if(status==='Completed')return {color:'Green',status,reason:'Dashboard deployed'};
 if(isDate(p.due)&&p.due<today)return {color:'Red',status:'Overdue',reason:'Finish date has passed and project is not completed'};
 if(status==='Not Yet Started')return {color:'Amber',status,reason:'No tasks, subtasks, or milestones have been completed'};
 if(!isDate(p.due))return {color:'Amber',status,reason:'Finish date not set'};
 const days=(Date.parse(p.due+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000;
 if(days<=7)return {color:'Amber',status,reason:'Finish date is within seven calendar days'};
 return {color:'Green',status,reason:'In progress with finish date more than seven days away'};
}
export function portfolioSummary(projects:Project[],today=localDate()){
 return [
  {label:'Total Projects',value:projects.length},
  {label:'Not Yet Started',value:projects.filter(p=>projectStatus(p)==='Not Yet Started').length},
  {label:'In Progress',value:projects.filter(p=>projectStatus(p)==='In Progress').length},
  {label:'Completed',value:projects.filter(p=>projectStatus(p)==='Completed').length},
  {label:'Overdue',value:projects.filter(p=>projectStatus(p)!=='Completed'&&isDate(p.due)&&p.due<today).length},
 ];
}
