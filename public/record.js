import {labels as faLabels} from './fa.js';
const $=s=>document.querySelector(s),params=new URLSearchParams(location.search);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number.isFinite(n)?Intl.NumberFormat('fa-IR',{notation:'compact',maximumFractionDigits:1}).format(n):'—';
const label=s=>faLabels[s||'unclear']||String(s).replaceAll('_',' ');
const fa=n=>Number(n).toLocaleString('fa-IR');
const colors={curiosity:'#c7875d',recognition:'#a294bf',result:'#709ca9',story:'#73a79c',contradiction:'#819753',direct:'#b9af86',mistake:'#c37f84'};
const roleColors={hook:'#c2e77d',setup:'#9fbbb5',problem:'#d69885',example:'#91bed0',advice:'#c2e77d',payoff:'#bbaaee',cta:'#e4c589',other:'#b5bfb1'};
let job,posts=[],time=0,playing=false,last=0,variant=params.get('variant')||'scanner',lastPage=-1,lastHero=-1,pointNodes=[],cumulative=[],duration=20,metric='plays';
if(!['scanner','map','script'].includes(variant))variant='scanner';
$('#variant').value=variant;
const thumb=p=>job.id==='demo'?p.thumbnailUrl:`/media/${encodeURIComponent(job.id)}/${encodeURIComponent(p.id)}`;
const img=(p,cls='')=>`<img class="${cls}" src="${esc(thumb(p))}" alt="" loading="eager">`;
function safeImages(){document.querySelectorAll('img').forEach(el=>{el.onerror=()=>{el.onerror=null;el.src='/demo-art/0.svg';};});}
function resize(){const scale=Math.min(innerWidth/1080,(innerHeight-(document.body.classList.contains('clean')?0:140))/1000);const s=Math.max(.2,scale);$('#canvas').style.transform=`scale(${s})`;$('#holder').style.width=`${1080*s}px`;$('#holder').style.height=`${1000*s}px`;}
function source(){return job.id==='demo'?'نمایش آزمایشی مصنوعی':`@${job.creator} · تحلیل ذخیره‌شده`;}
function build(){
 $('#canvas').className=variant;$('#source').textContent=source();$('#headline').textContent={scanner:'درون محتوا.',map:'شکل گرفتن الگوها را ببینید.',script:'هر اسکریپت یک ساختار دارد.'}[variant];
 $('#detail-title').textContent=variant==='map'?'نقشهٔ عملکرد':'زیر قاب';
 lastPage=lastHero=-1;pointNodes=[];
 $('#footnote').textContent=job.id==='demo'?'دادهٔ مصنوعی · تحلیل واقعی نیست':'نتایج ذخیره‌شده · پخش مجدد';
 if(variant==='map'){
  const valid=posts.filter(p=>p[metric]>0&&Number.isFinite(p.likes)&&p.likes>=0);
  const xs=valid.map(p=>Math.log10(p[metric])),ys=valid.map(p=>p.likes/p[metric]*1000);
  const min=xs.length?Math.floor(Math.min(...xs)):3,max=xs.length?Math.max(min+1,Math.ceil(Math.max(...xs))):7,top=ys.length?Math.max(10,Math.ceil(Math.max(...ys)/10)*10):50;
  $('#detail').innerHTML=`<span class="axis">لایک / ۱هزار ${label(metric)} ↑</span><div class="plot">${[0,1,2,3,4].map(i=>`<div class="gridline" style="bottom:${i*25}%"><span>${fa(Math.round(top*i/4))}</span></div>`).join('')}${valid.map(p=>`<img class="point" data-id="${esc(p.id)}" src="${esc(thumb(p))}" alt="" style="--color:${colors[p.analysis.labels.mechanism?.value]||'#899779'};left:${(Math.log10(p[metric])-min)/(max-min)*100}%;bottom:${p.likes/p[metric]*1000/top*100}%;opacity:0">`).join('')}</div><div class="xlabels"><span>${fmt(10**min)}</span><span>${label(metric)} · مقیاس لگاریتمی ←</span><span>${fmt(10**max)}</span></div>`;
  pointNodes=[...document.querySelectorAll('.point')].map(el=>({el,index:posts.findIndex(p=>p.id===el.dataset.id)}));
 }else $('#detail').innerHTML='';
 render();safeImages();resize();
}
function hero(p){
 const a=p.analysis,opening=a.anatomy?.[0]?.text||a.opening||p.transcript?.text||'جملهٔ آغازین گفتاری ندارد';
 const fields=['mechanism','topic','structure'].map((k,i)=>`<div class="field"><small>${['هوک','موضوع','ساختار'][i]}</small><b>${esc(label(a.labels[k]?.value))}</b><i style="width:${[90,68,82][i]}%"></i></div>`).join('');
 if(variant==='scanner')$('#detail').innerHTML=`<div class="hero">${img(p)}<div class="fields">${fields}</div></div><p class="quote">${esc(opening)}</p><div class="metrics"><span><b>${fmt(p[metric])}</b> ${label(metric)}</span><span><b>${fmt(p.likes)}</b> لایک</span></div>`;
 if(variant==='map')$('#bottom').innerHTML=`<div class="map-card">${img(p)}<div><small>${esc(label(a.labels.mechanism?.value))} · ${esc(label(a.labels.topic?.value))}</small><p>${esc(opening)}</p></div><strong>${fmt(p[metric])}<small>${label(metric)}</small></strong></div>`;
 if(variant==='script'){
  const anatomy=a.anatomy||[];const picked=[];
  for(const role of ['hook','setup','advice','payoff','cta']){const s=anatomy.find(s=>s.value===role&&!picked.includes(s));if(s)picked.push(s);if(picked.length===3)break;}
  for(const s of anatomy)if(picked.length<3&&!picked.includes(s))picked.push(s);
  picked.sort((a,b)=>anatomy.indexOf(a)-anatomy.indexOf(b));
  $('#detail').innerHTML=`<div class="hero">${img(p)}<div><div class="field"><b>${esc(label(a.labels.mechanism?.value))} / ${esc(label(a.labels.structure?.value))}</b></div><p class="quote">${esc(opening)}</p><div class="metrics"><span><b>${fmt(p[metric])}</b> ${label(metric)}</span><span><b>${fmt(p.likes)}</b> لایک</span></div></div></div><div class="rows">${picked.map(s=>`<div class="row"><small style="--color:${roleColors[s.value]||'#b5bfb1'}">${esc(label(s.value))}${Number.isFinite(s.start)?`<br><br>${s.start.toLocaleString('fa-IR',{maximumFractionDigits:1})} ث`:''}</small><p>${esc(s.text)}</p></div>`).join('')}</div>`;
  $('#bottom').textContent='جملهٔ آغازین را پیدا کنید. ببینید ایده چطور پیش می‌رود.';
 }
 safeImages();
}
function render(){
 if(!job)return;
 const f=Math.max(0,Math.min(1,time/duration)),n=Math.min(posts.length,Math.floor(f*posts.length)),active=Math.max(0,n-1),pageSize=variant==='map'?24:30,page=Math.floor(active/pageSize);
 $('#count').textContent=fa(n);$('#labels').textContent=fa(cumulative[n]?.labels||0);$('#cost').textContent=cumulative[n]?.known?`$${cumulative[n].cost.toFixed(4)}`:'—';$('#progress').style.width=`${f*100}%`;$('#progress-text').textContent=`${fa(n)} / ${fa(posts.length)} اسکریپت`;$('#seek').value=Math.round(f*1000);
 if(!posts.length){$('#detail').textContent='هنوز اسکریپت دسته‌بندی‌شده‌ای نیست. ابتدا در داشبورد پژوهش یک تحلیل اجرا کنید.';$('#bottom').textContent='نتایج ذخیره‌شدهٔ شما اینجا نمایش داده می‌شود.';return;}
 if(page!==lastPage){lastPage=page;$('#wall').innerHTML=posts.slice(page*pageSize,(page+1)*pageSize).map((p,i)=>`<div class="tile" data-index="${page*pageSize+i}">${img(p)}</div>`).join('');$('#page-number').textContent=`${fa(page*pageSize+1)}–${fa(Math.min(posts.length,(page+1)*pageSize))}`;safeImages();}
 document.querySelectorAll('#wall .tile').forEach(el=>{const i=Number(el.dataset.index);el.classList.toggle('future',i>=n);el.classList.toggle('active',n>0&&i===active);});
 // Hold a readable example while the batch continues to fill. This is replay, not a live latency readout.
 const heroIndex=variant==='script'?Math.min(posts.length-1,Math.floor(time/3.8)*Math.max(1,Math.floor(posts.length/Math.ceil(duration/3.8)))):Math.min(posts.length-1,Math.floor(active/12)*12);
 if(lastHero!==heroIndex){lastHero=heroIndex;hero(posts[heroIndex]);}
 if(variant==='scanner'){
  const seen=posts.slice(0,n),groups={};for(const p of seen){const key=p.analysis.labels.mechanism?.value||'unclear';groups[key]=(groups[key]||0)+1;}
  const top=Object.entries(groups).sort((a,b)=>b[1]-a[1]).slice(0,3);
  $('#bottom').innerHTML=`<div class="paneltitle">هوک‌های این آرشیو</div><div class="bars">${top.map(([k,v])=>`<div><div class="barhead"><span>${esc(label(k))}</span><b>${fa(v)}</b></div><div class="track"><i style="--color:${colors[k]||'#899779'};width:${v/Math.max(1,n)*100}%"></i></div><small>${fa(Math.round(v/Math.max(1,n)*100))}٪ از اسکریپت‌های برچسب‌خورده</small></div>`).join('')}</div>`;
 }
 if(variant==='map')for(const {el,index}of pointNodes){const age=(f*posts.length-index-1)/posts.length*duration;el.style.opacity=age>=0?'1':'0';el.classList.toggle('selected',index===active&&n>0);const e=1-Math.pow(1-Math.min(1,Math.max(0,age)/.55),3);el.style.transform=`translate(${-(1-e)*350}px,${-(1-e)*80}px) scale(${.65+.35*e})`;}
}
function tick(now){if(playing){time+=(now-last)/1000;if(time>duration+2){if($('#loop').checked)time=0;else{time=duration;playing=false;$('#play').textContent='پخش';}}render();}last=now;requestAnimationFrame(tick);}
function syncURL(){params.set('variant',variant);params.set('run',$('#archive').value);history.replaceState(null,'',`/record?${params}`);}
async function load(id){playing=false;$('#play').textContent='پخش';$('#error').textContent='';const r=await fetch(id==='demo'?'/api/demo':`/api/runs/${encodeURIComponent(id)}`);if(!r.ok)throw Error('آرشیو بارگذاری نشد');job=await r.json();if(id==='demo')job.id='demo';posts=job.posts.filter(p=>p.analysis&&!p.excludedReason);metric=posts.some(p=>p.plays>0)?'plays':'views';cumulative=[{labels:0,cost:0,known:true}];for(const p of posts){const prev=cumulative.at(-1),cost=p.analysis.costUsd; cumulative.push({labels:prev.labels+Object.keys(p.analysis.labels||{}).length+(p.analysis.anatomy?.length||0),cost:prev.cost+(Number.isFinite(cost)?cost:0),known:prev.known&&Number.isFinite(cost)});}time=0;syncURL();build();}
$('#variant').onchange=()=>{variant=$('#variant').value;syncURL();build();};$('#archive').onchange=()=>load($('#archive').value).catch(e=>$('#error').textContent=e.message);
$('#play').onclick=()=>{playing=!playing;last=performance.now();$('#play').textContent=playing?'توقف':'پخش';};$('#restart').onclick=()=>{time=0;render();};$('#duration').onchange=()=>{time=time/duration*Number($('#duration').value);duration=Number($('#duration').value);render();};$('#seek').oninput=()=>{time=Number($('#seek').value)/1000*duration;render();};$('#clean').onclick=()=>{document.body.classList.toggle('clean');resize();};
window.addEventListener('resize',resize);window.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();$('#play').click();}if(e.key.toLowerCase()==='r')$('#restart').click();if(e.key.toLowerCase()==='c')$('#clean').click();});
// Explicit seek hook is useful for deterministic screenshots; it never runs inference.
window.recording={seek(seconds){time=seconds;render();},get state(){return {variant,time,classified:posts.length,playing};}};
try{const r=await fetch('/api/bootstrap');if(!r.ok)throw Error('سرور در دسترس نیست');const boot=await r.json();$('#archive').innerHTML='<option value="demo">نمایش آزمایشی</option>'+boot.runs.map(r=>`<option value="${esc(r.id)}">@${esc(r.creator)} · ${fa(r.completed)} اسکریپت</option>`).join('');const wanted=params.get('run')||boot.runs.find(r=>r.completed>0)?.id||'demo';$('#archive').value=[...$('#archive').options].some(o=>o.value===wanted)?wanted:'demo';await load($('#archive').value);if(params.get('clean')==='1')$('#clean').click();if(params.get('autoplay')==='1')$('#play').click();}catch(e){$('#error').textContent=e.message;}
requestAnimationFrame(tick);
