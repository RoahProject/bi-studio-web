import {type Project,isDate,projectStatus,ragStatus,localDate} from './projects';
export type ExecutiveRow={department:string;scope:string;start:string;finish:string;status:string;color:'Red'|'Amber'|'Green';reason:string;projectCount:number};
export function executiveRows(projects:Project[],today=localDate()):ExecutiveRow[]{
 const groups=new Map<string,{department:string;projects:Project[]}>();
 for(const p of projects){const department=p.department?.trim()||'Unassigned';const key=department.toLocaleLowerCase();const group=groups.get(key)||{department,projects:[]};group.projects.push(p);groups.set(key,group);}
 return [...groups.values()].sort((a,b)=>a.department.localeCompare(b.department)).map(group=>{
  const ps=group.projects;const unfinished=ps.filter(p=>projectStatus(p)!=='Completed');
  const rags=unfinished.map(p=>ragStatus(p,today));
  const late=rags.filter(r=>r.color==='Red').length;
  const amber=rags.filter(r=>r.color==='Amber').length;
  const color=late?'Red':amber?'Amber':'Green';
  const status=!unfinished.length?'Completed':late?'Overdue':ps.every(p=>projectStatus(p)==='Not Yet Started')?'Not Yet Started':'In Progress';
  const starts=ps.map(p=>p.start||'').filter(isDate).sort();const finishes=ps.map(p=>p.due).filter(isDate).sort();
  const scopes=ps.slice(0,2).map(p=>{const scope=p.description.trim()||p.name;return scope.length>90?scope.slice(0,87)+'…':scope}).join('; ');
  const scope=`${ps.length} dashboard initiative${ps.length===1?'':'s'} · ${scopes}${ps.length>2?` (+${ps.length-2} more)`:''}`;
  const reason=late?`${late} unfinished project${late===1?' is':'s are'} overdue`:amber?`${amber} unfinished project${amber===1?' needs':'s need'} attention (not started, finish missing, or due within seven days)`:unfinished.length?'Unfinished projects have finish dates more than seven days away':'All projects in this department are completed';
  return {department:group.department,scope,start:starts[0]||'',finish:finishes.at(-1)||'',status,color,reason,projectCount:ps.length};
 });
}
