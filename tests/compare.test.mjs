import test from 'node:test';
import assert from 'node:assert/strict';
import {reachOf,creatorStats,insights,defaultSelection,usablePosts} from '../public/compare-core.mjs';

const post=(id,hook,plays,likes,extra={})=>({id,plays,views:null,likes,comments:Math.round(likes/20),analysis:{labels:{mechanism:{value:hook,confidence:.9}}},...extra});
const run=(id,creator,posts)=>({id,creator,createdAt:'2026-10-01T00:00:00Z',posts});

test('reach prefers plays and falls back to views',()=>{
 assert.equal(reachOf({plays:500,views:100}),500);
 assert.equal(reachOf({plays:0,views:100}),100);
 assert.equal(reachOf({plays:null,views:null}),null);
});

test('excluded, duplicate and unclassified posts are left out',()=>{
 const r=run('a','x',[post('1','story',100,10),post('2','story',100,10,{excludedReason:'no audio'}),post('3','story',100,10,{duplicateOf:'1'}),{id:'4',plays:100,likes:1}]);
 assert.equal(usablePosts(r).length,1);
});

test('category shares and like index are relative to the creator',()=>{
 const s=creatorStats(run('a','x',[post('1','story',1000,100),post('2','story',1000,100),post('3','direct',1000,10),post('4','direct',1000,10)]),'mechanism');
 assert.equal(s.overall.n,4);
 assert.equal(s.categories.get('story').share,.5);
 assert.ok(s.categories.get('story').likeIndex>1);
 assert.ok(s.categories.get('direct').likeIndex<1);
});

test('a competitor pattern the target never uses becomes a gap',()=>{
 const you=run('you','me',[post('1','direct',1000,50),post('2','direct',1000,50),post('3','direct',1000,50),post('4','story',1000,50)]);
 const rival=run('rival','them',[post('5','curiosity',1000,200),post('6','curiosity',1000,200),post('7','curiosity',1000,200),post('8','direct',1000,20),post('9','direct',1000,20),post('10','direct',1000,20)]);
 const all=[you,rival].map(r=>creatorStats(r,'mechanism'));
 const found=insights(all,'you');
 assert.ok(found.some(i=>i.type==='gap'&&i.key==='curiosity'&&i.creator==='them'));
 assert.ok(!found.some(i=>i.type==='gap'&&i.key==='direct'),'patterns the target already uses are not gaps');
});

test('small samples never produce strengths or weaknesses',()=>{
 const s=[creatorStats(run('a','x',[post('1','story',1000,500),post('2','direct',1000,10),post('3','direct',1000,10)]),'mechanism')];
 assert.ok(!insights(s,'a').some(i=>i.key==='story'));
});

test('default selection keeps the newest run per creator',()=>{
 const runs=[{id:'old',creator:'g',completed:8,createdAt:'2026-10-01'},{id:'new',creator:'g',completed:8,createdAt:'2026-10-03'},{id:'n',creator:'n',completed:20,createdAt:'2026-10-02'},{id:'empty',creator:'z',completed:0,createdAt:'2026-10-04'}];
 assert.deepEqual(defaultSelection(runs),['new','n']);
});
