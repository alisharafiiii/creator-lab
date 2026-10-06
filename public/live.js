// Live view of one run: reels appear in publish order, then each one flies to its spot on the performance map.
// Landing follows the wall order even when processing finishes out of order, so the story reads left to right.
import {labels,num,compact,fixed} from './fa.js';
import {reachOf} from './compare-core.mjs';
import {median} from './research.mjs';

const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const HOOK_COLORS={curiosity:'#e8a33d',contradiction:'#8b5cf6',result:'#16a34a',mistake:'#ef4444',recognition:'#3b82f6',story:'#ec4899',direct:'#111111',unclear:'#a8a8a3'};
const SKIP_COLOR='#d4d4cf';
const LIVE=new Set(['ready','scraping','running']);
const runId=new URLSearchParams(location.search).get('run')||'demo';

let job,byId=new Map(),order=[],domain=null,cursor=0,pumping=false,replayToken=0;
const tiles=new Map(),landed=new Set();

const hookOf=p=>p.analysis?.labels?.mechanism?.value||'unclear';
const skipped=p=>Boolean(p.excludedReason)||p.status==='failed';
const settled=p=>Boolean(p.analysis)||skipped(p);
const likeRate=p=>p.reach>0&&Number.isFinite(p.likes)?p.likes/p.reach*1000:null;
const label=k=>labels[k]||String(k).replaceAll('_',' ');
const imageURL=p=>job.id==='demo'?p.thumbnailUrl:`/media/${encodeURIComponent(job.id)}/${encodeURIComponent(p.id)}`;
const opening=p=>{const t=p.analysis?.opening||p.transcript?.text||'';const s=t.match(/^.*?[.!?؟](\s|$)/s)?.[0]||t;return s.length>160?s.slice(0,157)+'…':s.trim();};

async function fetchJob(){
 const r=await fetch(runId==='demo'?'/api/demo':`/api/runs/${encodeURIComponent(runId)}`);
 if(!r.ok)throw new Error('این تحلیل پیدا نشد. از داشبورد دوباره انتخابش کن.');
 const j=await r.json();if(runId==='demo')j.id='demo';
 for(const p of j.posts)p.reach=reachOf(p);
 return j;
}

// ---------- wall ----------
function statusText(p){
 if(p.analysis)return label(hookOf(p));
 if(p.status==='failed')return 'خطا';
 if(p.excludedReason)return 'بدون گفتار';
 return {transcribing:'رونویسی…',transcribed:'در صف هوک',classifying:'تشخیص هوک…'}[p.status]||'در صف';
}
function tileState(p){
 if(landed.has(p.id))return skipped(p)?'skip placed':'done placed';
 if(p.status==='failed')return 'failed';
 if(p.excludedReason)return 'skip';
 if(p.analysis)return 'ready';
 if(['transcribing','classifying'].includes(p.status))return 'working';
 return 'queued';
}
function renderWall(){
 const wall=$('#wall');
 if(!order.length){
  const n=Math.min(job.limit||20,30);
  wall.innerHTML=Array.from({length:n},(_,i)=>`<div class="tile skeleton" style="--i:${i}"></div>`).join('');
  $('#wall-count').textContent='';return;
 }
 if(wall.querySelector('.skeleton'))wall.innerHTML='';
 order.forEach((id,i)=>{
  const p=byId.get(id);let t=tiles.get(id);
  if(!t){
   t=document.createElement('div');t.className='tile enter';t.style.setProperty('--i',i);
   t.innerHTML=`<img src="${esc(imageURL(p))}" alt="" loading="lazy"><span class="num">${num(i+1)}</span><span class="state"></span><i class="bar"></i>`;
   t.querySelector('img').onerror=e=>{e.target.remove();t.classList.add('noimg');};
   wall.append(t);tiles.set(id,t);
  }
  t.className=`tile ${tileState(p)}${t.classList.contains('enter')?' enter':''}`;
  t.style.setProperty('--hook',p.analysis?HOOK_COLORS[hookOf(p)]||HOOK_COLORS.unclear:SKIP_COLOR);
  t.querySelector('.state').textContent=statusText(p);
  t.title=opening(p)||'';
 });
 $('#wall-count').textContent=`${num(order.length)} ریل`;
}

// ---------- chart ----------
function computeDomain(){
 const pts=job.posts.filter(p=>p.reach>0&&likeRate(p)!==null);if(!pts.length)return null;
 const xs=pts.map(p=>Math.log10(p.reach)),ys=pts.map(likeRate);
 const lo=Math.floor(Math.min(...xs)),hi=Math.max(lo+1,Math.ceil(Math.max(...xs)));
 const ymax=Math.max(10,Math.ceil(Math.max(...ys)*1.08/10)*10);
 return {lo,hi,ymax};
}
function renderAxes(){
 const plot=$('#plot');plot.querySelectorAll('.grid,.xtick').forEach(n=>n.remove());$('#x-axis').innerHTML='';
 if(!domain)return;
 for(let i=0;i<=4;i++){const g=document.createElement('div');g.className='grid';g.style.bottom=`${i*25}%`;g.innerHTML=`<span>${num(Math.round(domain.ymax*i/4))}</span>`;plot.append(g);}
 // Higher reach sits to the left, matching right-to-left reading.
 for(let e=domain.lo;e<=domain.hi;e++){const s=document.createElement('span');s.style.right=`${(e-domain.lo)/(domain.hi-domain.lo)*100}%`;s.textContent=compact(10**e);$('#x-axis').append(s);}
}
function position(p){
 if(!domain||!(p.reach>0)||likeRate(p)===null)return null;
 const x=(Math.log10(p.reach)-domain.lo)/(domain.hi-domain.lo),y=Math.min(1,likeRate(p)/domain.ymax);
 return {right:`${Math.max(0,Math.min(1,x))*100}%`,bottom:`${y*100}%`};
}

// ---------- landing ----------
async function land(p,token){
 const tile=tiles.get(p.id),pos=position(p);
 showTicker(p);
 if(!pos){landed.add(p.id);renderWall();return;}
 const dot=document.createElement('div');dot.className=`pt${skipped(p)?' skip':''}`;dot.dataset.id=p.id;
 dot.style.right=pos.right;dot.style.bottom=pos.bottom;dot.style.setProperty('--hook',skipped(p)?SKIP_COLOR:HOOK_COLORS[hookOf(p)]||HOOK_COLORS.unclear);
 dot.innerHTML=`<img src="${esc(imageURL(p))}" alt="">`;dot.title=`#${num(order.indexOf(p.id)+1)} · ${statusText(p)}`;
 dot.onclick=()=>showTicker(p);
 $('#plot').append(dot);
 if(!reduceMotion&&tile){
  const from=tile.getBoundingClientRect(),to=dot.getBoundingClientRect();
  if(from.width&&to.width){
   const fly=document.createElement('div');fly.className='fly';
   fly.style.cssText=`left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px;--hook:${dot.style.getPropertyValue('--hook')}`;
   fly.innerHTML=`<img src="${esc(imageURL(p))}" alt="">`;document.body.append(fly);
   tile.classList.add('lifting');fly.getBoundingClientRect();
   fly.style.transform=`translate(${to.left-from.left}px,${to.top-from.top}px) scale(${to.width/from.width},${to.height/from.height})`;fly.classList.add('go');
   await Promise.race([new Promise(r=>fly.addEventListener('transitionend',r,{once:true})),sleep(1100)]);
   fly.remove();tile.classList.remove('lifting');
  }
 }
 if(token!==replayToken){dot.remove();return;}
 dot.classList.add('in');landed.add(p.id);renderWall();renderLegend();renderSteps();
}
async function pump(){
 if(pumping)return;pumping=true;const token=replayToken;
 try{
  while(cursor<order.length&&token===replayToken){
   const p=byId.get(order[cursor]);if(!settled(p))break;
   if(!landed.has(p.id)){await land(p,token);await sleep(reduceMotion?0:skipped(p)?120:380);}
   cursor++;
  }
 }finally{pumping=false;}
 if(token!==replayToken)return pump();
 if(order.length&&cursor>=order.length&&!LIVE.has(job.status))showFinish();
}

// ---------- side panels ----------
function showTicker(p){
 $('#ticker').hidden=false;$('#t-img').src=imageURL(p);
 $('#t-num').textContent=`#${num(order.indexOf(p.id)+1)} از ${num(order.length)}`;
 const chip=$('#t-hook');chip.textContent=statusText(p);chip.style.setProperty('--hook',p.analysis?HOOK_COLORS[hookOf(p)]||HOOK_COLORS.unclear:SKIP_COLOR);
 $('#t-text').textContent=opening(p)||(p.excludedReason?'این ریل حرفی نداشت (فقط موسیقی یا متن روی صفحه).':'متنی نداره.');
 $('#t-reach').textContent=compact(p.reach);$('#t-likes').textContent=compact(p.likes);
 const r=likeRate(p);$('#t-rate').textContent=r===null?'—':fixed(r);
}
function renderLegend(){
 const counts=new Map();for(const id of landed){const p=byId.get(id);if(!p||skipped(p))continue;const k=hookOf(p);counts.set(k,(counts.get(k)||0)+1);}
 const skips=[...landed].filter(id=>skipped(byId.get(id))).length;
 $('#legend').innerHTML=[...counts].sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<span><i style="--hook:${HOOK_COLORS[k]||HOOK_COLORS.unclear}"></i>${esc(label(k))} <b>${num(n)}</b></span>`).join('')+(skips?`<span class="muted"><i style="--hook:${SKIP_COLOR}"></i>بدون گفتار <b>${num(skips)}</b></span>`:'');
}
function renderSteps(){
 const ps=job.posts,n=ps.length;
 const transcribed=ps.filter(p=>p.transcript||p.excludedReason).length,classified=ps.filter(settled).length;
 const set=(step,state,text,frac)=>{const li=$(`[data-step="${step}"]`);li.dataset.state=state;$(`#s-${step}`).textContent=text;li.querySelector('.mini i').style.width=`${Math.round((frac||0)*100)}%`;};
 const live=LIVE.has(job.status);
 if(!n)set('collect',job.status==='scraping'?'active':'wait',job.status==='scraping'?'داره از اینستاگرام میاره…':'در انتظار…',job.status==='scraping'?.35:0);
 else set('collect','done',`${num(n)} ریل جمع شد`,1);
 set('transcribe',!n?'wait':transcribed>=n?'done':live?'active':'wait',n?`${num(transcribed)} از ${num(n)}`:'—',n?transcribed/n:0);
 set('classify',!n?'wait':classified>=n?'done':live?'active':'wait',n?`${num(classified)} از ${num(n)}`:'—',n?classified/n:0);
 set('place',!n?'wait':landed.size>=n?'done':landed.size?'active':'wait',n?`${num(landed.size)} از ${num(n)}`:'—',n?landed.size/n:0);
}
function renderHeader(){
 $('#title').innerHTML=`<span dir="ltr">@${esc(job.creator)}</span> ${LIVE.has(job.status)?'داره <mark>تحلیل</mark> می‌شه':'<mark>تحلیل</mark> شد'}`;
 const pill={ready:'آماده',scraping:'در حال جمع کردن ریل‌ها',running:'در حال پردازش',complete:'تموم شد',partial:'نیمه‌کاره',paused:'متوقف',failed:'ناموفق',interrupted:'قطع شد'}[job.status]||job.status;
 $('#status-pill').innerHTML=`<i class="pulse ${LIVE.has(job.status)?'on':''}"></i>${esc(pill)}`;
 $('#subtitle').textContent=LIVE.has(job.status)?'ریل‌ها به ترتیب انتشار چیده می‌شن و هر کدوم که تحلیلش تموم بشه، می‌ره سر جاش روی نقشه.':'این پخش دوبارهٔ همون تحلیله؛ هر ریل به ترتیب می‌ره سر جاش روی نقشه.';
 $('#to-dashboard').href=job.id==='demo'?'/?run=demo':`/?run=${encodeURIComponent(job.id)}`;
 const failed=job.posts.filter(p=>p.status==='failed').length;
 const err=job.error||(failed&&!LIVE.has(job.status)?`${num(failed)} ریل با خطا تموم شد. از داشبورد «شروع / ادامه» رو بزن تا دوباره امتحان بشه.`:'');
 $('#error').hidden=!err;$('#error').textContent=err;
}
function showFinish(){
 const done=[...landed].map(id=>byId.get(id)).filter(p=>p&&!skipped(p));
 const groups=new Map();for(const p of done){const k=hookOf(p);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p);}
 const rows=[...groups].map(([k,list])=>({k,n:list.length,rate:median(list.map(likeRate))})).sort((a,b)=>b.n-a.n);
 const best=rows.filter(r=>r.n>=2&&r.rate!==null&&r.k!=='unclear').sort((a,b)=>b.rate-a.rate)[0];
 const skips=job.posts.length-done.length;
 $('#finish').hidden=false;
 $('#finish').innerHTML=`<div class="f-head"><span class="eyebrow">نتیجه</span><h2>تموم شد! از ${num(job.posts.length)} ریل، ${num(done.length)} تاش حرف داشت.</h2>${best?`<p>بهترین هوک این پیج <b style="--hook:${HOOK_COLORS[best.k]}" class="chip">${esc(label(best.k))}</b> بوده: میانهٔ ${fixed(best.rate)} لایک در هر ۱هزار پخش، توی ${num(best.n)} ریل.</p>`:'<p>برای اینکه بهترین هوک معلوم بشه، ریل‌های بیشتری لازمه.</p>'}${skips?`<small>${num(skips)} ریل فقط موسیقی یا متن روی صفحه بود و تحلیل نشد.</small>`:''}</div>
 <div class="f-rows">${rows.map(r=>`<div><span><i style="--hook:${HOOK_COLORS[r.k]||HOOK_COLORS.unclear}"></i>${esc(label(r.k))}</span><b>${num(r.n)} ریل</b><small>${r.rate===null?'—':fixed(r.rate)} لایک/۱هزار</small></div>`).join('')}</div>
 <div class="f-actions"><a class="cta" href="${job.id==='demo'?'/?run=demo':`/?run=${encodeURIComponent(job.id)}`}">جزئیات توی داشبورد ↖</a>${job.id==='demo'?'':`<a class="ghost" href="/compare?runs=${encodeURIComponent(job.id)}&me=${encodeURIComponent(job.id)}">مقایسه با یه پیج دیگه ↖</a>`}<button class="ghost" id="finish-replay">↻ دوباره پخش کن</button></div>`;
 $('#finish-replay').onclick=replay;$('#replay').hidden=false;
}

// ---------- sync ----------
function sync(){
 byId=new Map(job.posts.map(p=>[p.id,p]));
 if(!order.length&&job.posts.length){
  order=job.posts.slice().sort((a,b)=>(Date.parse(b.publishedAt||0)||0)-(Date.parse(a.publishedAt||0)||0)||a.id.localeCompare(b.id)).map(p=>p.id);
  domain=computeDomain();renderAxes();
 }
 renderHeader();renderWall();renderSteps();renderLegend();
 // Let the entrance stagger play once, then drop the class so status changes don't replay it.
 setTimeout(()=>tiles.forEach(t=>t.classList.remove('enter')),1200);
 pump();
}
function replay(){
 replayToken++;cursor=0;landed.clear();$('#plot').querySelectorAll('.pt').forEach(n=>n.remove());
 $('#finish').hidden=true;$('#ticker').hidden=true;renderWall();renderLegend();renderSteps();
 $('#stage-top')?.scrollIntoView({behavior:'smooth'});window.scrollTo({top:0,behavior:'smooth'});
 setTimeout(pump,400);
}
$('#replay').onclick=replay;

let refreshTimer;
async function refresh(){try{job=await fetchJob();sync();}catch(e){$('#error').hidden=false;$('#error').textContent=e.message;}}
function scheduleRefresh(){if(refreshTimer)return;refreshTimer=setTimeout(async()=>{refreshTimer=null;await refresh();},250);}

try{
 job=await fetchJob();
 // A finished run replays from the start; a live one starts landing as soon as reels are ready.
 sync();
 if(job.id!=='demo'){
  const events=new EventSource('/api/events');events.onmessage=e=>{try{if(JSON.parse(e.data).id===job.id)scheduleRefresh();}catch{}};
  setInterval(()=>{if(LIVE.has(job.status))scheduleRefresh();},4000);
 }
}catch(e){$('#error').hidden=false;$('#error').textContent=e.message;}
