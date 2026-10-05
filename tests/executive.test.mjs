import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
const require=createRequire(import.meta.url);
const dir=dirname(process.env.BI_STUDIO_TEST_MODULE);
const {executiveRows}=require(join(dir,'executive.js'));
const {normalizeProject,portfolioSummary}=require(join(dir,'projects.js'));
const {buildExecutiveWorkbook}=require(join(dir,'excel-export.js'));
const project=(id,department,start,due,stage='Requirements',started=false)=>({id,name:`Initiative ${id}`,description:'Scope',department,start,owner:'Roah',due,stage,priority:'Medium',source:'Oracle',sample:false,tasks:[{id:'task',title:'Prepare data',done:started,subtasks:[]}],milestones:[]});
const data=[project('1','Sales','2026-10-01','2026-10-04','Requirements',true),project('2','sales','2026-09-01','2026-12-30','Requirements',true),project('3','Finance','2026-10-01','2026-10-10','Requirements',true),project('4','HR','','2026-10-01','Deployed',true),project('5','Operations','','2026-12-01')];
test('Executive department grouping, date ranges, counts and RAG',()=>{
 const rows=executiveRows(data,'2026-10-05');assert.equal(rows.length,4);
 const sales=rows.find(r=>r.department==='Sales');assert.equal(sales.projectCount,2);assert.equal(sales.start,'2026-09-01');assert.equal(sales.finish,'2026-12-30');assert.equal(sales.color,'Red');assert.equal(sales.status,'Overdue');
 assert.equal(rows.find(r=>r.department==='Finance').color,'Amber');assert.equal(rows.find(r=>r.department==='HR').color,'Green');assert.equal(rows.find(r=>r.department==='Operations').status,'Not Yet Started');
 assert.deepEqual(portfolioSummary(data,'2026-10-05').map(t=>t.value),[5,1,3,1,1]);
 assert.equal(executiveRows([project('6','IT','','2026-12-10','Requirements',true)],'2026-10-05')[0].color,'Green');
 assert.equal(executiveRows([project('7','IT','','','Requirements',true)],'2026-10-05')[0].color,'Amber');
 const old=project('8',undefined,undefined,'2026-12-01');const normalized=normalizeProject(old);assert.equal(normalized.department,'');assert.equal(normalized.start,'');
 const many=executiveRows([1,2,3,4].map(i=>project(String(i),'Sales','','2026-12-01')),'2026-10-05')[0];assert.match(many.scope,/\(\+2 more\)/);assert.equal(many.scope.includes('Initiative 3'),false);
});
test('Excel package contains department summary only and safe text',()=>{
 const special=project('9','<Sales & Ops>','','2026-12-01');special.description='=HYPERLINK("https://example.com")';
 const bytes=buildExecutiveWorkbook([special],'2026-10-05'),view=new DataView(bytes.buffer);
 const files=new Map();let at=0;
 while(view.getUint32(at,true)===0x04034b50){const size=view.getUint32(at+18,true),len=view.getUint16(at+26,true),extra=view.getUint16(at+28,true);const name=new TextDecoder().decode(bytes.subarray(at+30,at+30+len)),begin=at+30+len+extra;files.set(name,new TextDecoder().decode(bytes.subarray(begin,begin+size)));at=begin+size;}
 assert.equal(files.size,7);const portfolio=files.get('xl/worksheets/sheet2.xml');assert.match(portfolio,/Status \(RAG\)/);assert.match(portfolio,/&lt;Sales &amp; Ops&gt;/);assert.equal(portfolio.includes('<f>'),false);assert.match(portfolio,/ySplit="3"/);assert.match(files.get('xl/workbook.xml'),/Department Portfolio/);
});
