import {creatorStats,insights,defaultSelection,MIN_N} from './compare-core.mjs';
import {dimensionTitles,labels,num,compact,fixed} from './fa.js';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=k=>labels[k]||String(k??'نامشخص').replaceAll('_',' ');
const pct=x=>`${num(Math.round(x*100))}٪`;
const idx=x=>x===null||x===undefined?'—':`×${fixed(x)}`;
const safeLink=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:'';}catch{return '';}};
const opening=p=>{const t=p.analysis?.opening||p.transcript?.text||'';return t.length>140?t.slice(0,137)+'…':t;};
const date=s=>s?new Date(s).toLocaleDateString('fa-IR',{month:'short',day:'numeric'}):'';
const params=new URLSearchParams(location.search);

let boot,dimension=params.get('dim')||'mechanism',selected=[],target=null,showOld=false;const cache=new Map();
const loadRun=async id=>{if(!cache.has(id)){const r=await fetch(`/api/runs/${encodeURIComponent(id)}`);if(!r.ok)throw new Error('تحلیل باز نشد');cache.set(id,await r.json());}return cache.get(id);};

function renderPicker(){
 const all=boot.runs.filter(r=>r.completed>0).sort((a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0));
 const latest=new Set(defaultSelection(all,Infinity)),older=all.filter(r=>!latest.has(r.id));
 // Older analyses of the same page stay hidden unless asked for or already selected.
 const runs=all.filter(r=>showOld||latest.has(r.id)||selected.includes(r.id));
 $('#runs').innerHTML=runs.map(r=>{const on=selected.includes(r.id);return `<div class="run ${on?'on':''}"><label class="pick"><input type="checkbox" data-run="${esc(r.id)}" ${on?'checked':''} ${!on&&selected.length>=5?'disabled':''}><span><b dir="ltr">@${esc(r.creator)}</b><small>${num(r.completed)} ریلز تحلیل‌شده · ${date(r.createdAt)}</small></span></label><label class="me ${target===r.id?'is':''}" ${on?'':'hidden'}><input type="radio" name="target" data-target="${esc(r.id)}" ${target===r.id?'checked':''}> پیج من</label></div>`;}).join('')+(older.length?`<button type="button" class="older" id="toggle-old">${showOld?'پنهان کردن تحلیل‌های قدیمی‌تر':`نمایش تحلیل‌های قدیمی‌تر (${num(older.length)})`}</button>`:'')||'<p class="note">هنوز تحلیل کاملی نداری. اول از داشبورد یه پیج رو تحلیل کن.</p>';
 $('#toggle-old')?.addEventListener('click',()=>{showOld=!showOld;renderPicker();});
 $('#runs').querySelectorAll('[data-run]').forEach(b=>b.onchange=()=>{const id=b.dataset.run;selected=b.checked?[...selected,id]:selected.filter(x=>x!==id);if(!selected.includes(target))target=selected[0]||null;update();});
 $('#runs').querySelectorAll('[data-target]').forEach(b=>b.onchange=()=>{target=b.dataset.target;update();});
 const names=selected.map(id=>boot.runs.find(r=>r.id===id)?.creator);const dup=names.filter((n,i)=>names.indexOf(n)!==i);
 $('#picker-note').textContent=selected.length<2?'حداقل دوتا پیج انتخاب کن.':dup.length?`@${dup[0]} دو بار انتخاب شده؛ فقط تازه‌ترین تحلیلش رو نگه دار که مقایسه منصفانه باشه.`:'';
}

function cards(stats){
 return stats.map(s=>`<div class="card stat ${s.id===target?'mine':''}"><div class="who"><b dir="ltr">@${esc(s.creator)}</b>${s.id===target?'<span class="tag">پیج من</span>':''}</div><div class="nums"><div><strong>${num(s.overall.n)}</strong><span>ریلز قابل‌تحلیل</span></div><div><strong>${compact(s.overall.reach)}</strong><span>میانهٔ پخش</span></div><div><strong>${s.overall.likeRate===null?'—':fixed(s.overall.likeRate)}</strong><span>لایک در هر ۱هزار</span></div><div><strong>${s.overall.commentRate===null?'—':fixed(s.overall.commentRate,2)}</strong><span>کامنت در هر ۱هزار</span></div></div>${s.overall.n<10?'<small class="warn">ریلزها کمه؛ برای نتیجهٔ مطمئن‌تر تعداد بیشتری تحلیل کن.</small>':''}</div>`).join('');
}

function insightHTML(list,stats){
 const mine=stats.find(s=>s.id===target);
 if(!list.length)return `<div class="card none">با این داده الگوی واضحی درنیومد. معمولاً با ۳۰ ریلز یا بیشتر از هر پیج نتیجه‌ها روشن‌تر می‌شن.</div>`;
 const text=i=>{const k=`«${label(i.key)}»`;
  if(i.type==='gap')return {icon:'فرصت',title:`${k} رو امتحان کن`,body:`@${esc(i.creator)} در ${pct(i.share)} ریلزهاش از ${k} استفاده می‌کنه و لایکش ${idx(i.index)} حالت معمول خودشه. توی پیج تو ${mine?.categories.get(i.key)?`فقط ${pct(mine.categories.get(i.key).share)}`:'اصلاً'} دیده نمی‌شه.`};
  if(i.type==='strength')return {icon:'نقطهٔ قوت',title:`${k} برای تو جواب می‌ده`,body:`${num(i.n)} ریلز با ${k} لایکی ${idx(i.index)} حالت معمول پیجت گرفتن. الان ${pct(i.share)} ریلزهات این‌طوریه؛ بیشترش کن.`};
  return {icon:'هشدار',title:`${k} زیاده ولی خوب جواب نمی‌ده`,body:`${pct(i.share)} ریلزهات ${k} هستن، ولی لایکشون ${idx(i.index)} حالت معمول پیجته.`};};
 return list.slice(0,9).map(i=>{const t=text(i);return `<article class="card insight ${i.type}"><span class="kind">${t.icon}</span><h3>${t.title}</h3><p>${t.body}</p>${i.examples.length?`<details><summary>نمونه‌ها از @${esc(i.creator)}</summary>${i.examples.map(p=>`<div class="ex"><p>${esc(opening(p))||'<i>بدون متن</i>'}</p><small>${compact(p.reach)} پخش · ${compact(p.likes)} لایک ${safeLink(p.url)?`· <a href="${esc(safeLink(p.url))}" target="_blank" rel="noopener noreferrer">ریلز اصلی ↖</a>`:''}</small></div>`).join('')}</details>`:''}</article>`;}).join('');
}

function matrix(stats){
 const keys=[...new Set(stats.flatMap(s=>[...s.categories.keys()]))];
 const total=k=>stats.reduce((n,s)=>n+(s.categories.get(k)?.n||0),0);keys.sort((a,b)=>(a==='unclear')-(b==='unclear')||total(b)-total(a));
 const head=`<thead><tr><th>${esc(dimensionTitles[dimension]||dimension)}</th>${stats.map(s=>`<th dir="ltr" class="${s.id===target?'mine':''}">@${esc(s.creator)}</th>`).join('')}</tr></thead>`;
 const body=keys.map(k=>`<tr><td class="key">${esc(label(k))}</td>${stats.map(s=>{const c=s.categories.get(k);if(!c)return `<td class="${s.id===target?'mine':''}"><span class="zero">—</span></td>`;const tone=c.n<MIN_N||c.likeIndex===null?'faint':c.likeIndex>=1.1?'up':c.likeIndex<=0.9?'down':'';return `<td class="${tone} ${s.id===target?'mine':''}"><div class="bar"><i style="width:${Math.round(c.share*100)}%"></i></div><div class="cell"><b>${pct(c.share)}</b><small>${num(c.n)} ریلز</small><em>${idx(c.likeIndex)}</em></div></td>`;}).join('')}</tr>`).join('');
 return head+`<tbody>${body}</tbody>`;
}

async function update(){
 const url=new URL(location);url.searchParams.set('dim',dimension);url.searchParams.set('runs',selected.join(','));if(target)url.searchParams.set('me',target);history.replaceState(null,'',url);
 renderPicker();
 if(selected.length<2){$('#results').hidden=true;return;}
 try{
  const runs=await Promise.all(selected.map(loadRun));const stats=runs.map(r=>creatorStats(r,dimension));
  $('#cards').innerHTML=cards(stats);$('#insights').innerHTML=insightHTML(insights(stats,target),stats);
  $('#matrix-title').textContent=`${dimensionTitles[dimension]||dimension} در هر پیج`;$('#matrix').innerHTML=matrix(stats);$('#results').hidden=false;$('#empty').hidden=true;
 }catch(e){$('#empty').textContent=e.message;$('#empty').hidden=false;}
}

try{
 const r=await fetch('/api/bootstrap');if(!r.ok)throw new Error('سرور جواب نمی‌ده');boot=await r.json();
 $('#dimension').innerHTML=Object.keys(boot.dimensions).map(k=>`<option value="${k}">${esc(dimensionTitles[k]||boot.dimensions[k].title)}</option>`).join('');
 if(!boot.dimensions[dimension])dimension='mechanism';$('#dimension').value=dimension;$('#dimension').onchange=e=>{dimension=e.target.value;update();};
 const valid=new Set(boot.runs.filter(r=>r.completed>0).map(r=>r.id));
 selected=(params.get('runs')||'').split(',').filter(id=>valid.has(id)).slice(0,5);if(!selected.length)selected=defaultSelection(boot.runs);
 target=selected.includes(params.get('me'))?params.get('me'):selected[0]||null;
 await update();
}catch(e){$('#empty').textContent=e.message;$('#empty').hidden=false;}
