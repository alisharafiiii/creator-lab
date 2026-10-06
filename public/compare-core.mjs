// Cross-creator comparison. Pure functions shared by the /compare page and tests.
// Rates are compared to each creator's own median so accounts of different sizes stay comparable.
import {median,rate} from './research.mjs';

const known=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
// Instagram exposes plays for most Reels and views for some; use whichever the post has.
export const reachOf=p=>known(p.plays)&&p.plays>0?p.plays:known(p.views)&&p.views>0?p.views:null;
const withReach=p=>({...p,reach:reachOf(p)});

export function usablePosts(run){
 return (run.posts||[]).filter(p=>p.analysis&&!p.excludedReason&&!p.duplicateOf).map(withReach);
}

function measure(posts){
 const reach=median(posts.map(p=>p.reach));
 const likeRate=median(posts.map(p=>rate(p,'likes','reach')));
 const commentRate=median(posts.map(p=>rate(p,'comments','reach')));
 return {n:posts.length,reach,likeRate,commentRate};
}

export function creatorStats(run,dimension){
 const posts=usablePosts(run);
 const overall=measure(posts);
 const buckets=new Map();
 for(const p of posts){const key=p.analysis.labels[dimension]?.value||'unclear';if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(p);}
 const categories=new Map([...buckets].map(([key,list])=>{
  const m=measure(list);
  return [key,{key,...m,share:posts.length?list.length/posts.length:0,
   likeIndex:m.likeRate!==null&&overall.likeRate>0?m.likeRate/overall.likeRate:null,
   reachIndex:m.reach!==null&&overall.reach>0?m.reach/overall.reach:null,
   examples:list.slice().sort((a,b)=>(b.reach??-1)-(a.reach??-1)).slice(0,3)}];
 }));
 return {id:run.id,creator:run.creator,createdAt:run.createdAt,overall,categories};
}

export const MIN_N=3;

// Plain rules, so every insight can be traced back to the table.
export function insights(stats,targetId){
 const target=stats.find(s=>s.id===targetId);if(!target)return [];
 const others=stats.filter(s=>s!==target);const out=[];
 const keys=new Set(stats.flatMap(s=>[...s.categories.keys()]));keys.delete('unclear');
 for(const key of keys){
  const mine=target.categories.get(key);
  // Gap: a competitor uses it often and it beats that competitor's own median; the target barely uses it.
  for(const o of others){
   const theirs=o.categories.get(key);
   if(theirs&&theirs.n>=MIN_N&&theirs.share>=0.15&&(theirs.likeIndex??0)>=1.1&&(!mine||mine.share<0.05))
    out.push({type:'gap',key,creator:o.creator,runId:o.id,share:theirs.share,index:theirs.likeIndex,n:theirs.n,examples:theirs.examples,score:theirs.share*theirs.likeIndex});
  }
  if(!mine||mine.n<MIN_N||mine.likeIndex===null)continue;
  if(mine.likeIndex>=1.2)out.push({type:'strength',key,creator:target.creator,runId:target.id,share:mine.share,index:mine.likeIndex,n:mine.n,examples:mine.examples,score:mine.likeIndex});
  else if(mine.likeIndex<=0.8&&mine.share>=0.2)out.push({type:'weak',key,creator:target.creator,runId:target.id,share:mine.share,index:mine.likeIndex,n:mine.n,examples:mine.examples,score:mine.share*(1/mine.likeIndex)});
 }
 const order={gap:0,strength:1,weak:2};
 return out.sort((a,b)=>order[a.type]-order[b.type]||b.score-a.score);
}

// Newest usable run per creator, so repeated analyses of one page are not double-counted by default.
export function defaultSelection(runs,limit=3){
 const seen=new Set();
 return runs.filter(r=>r.completed>0).sort((a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0))
  .filter(r=>!seen.has(r.creator)&&seen.add(r.creator)).slice(0,limit).map(r=>r.id);
}
