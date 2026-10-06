import test from 'node:test';
import assert from 'node:assert/strict';
import {transcriptCacheKey} from '../lib/pipeline.mjs';

test('transcript cache is separate per spoken language',()=>{
 assert.equal(transcriptCacheKey('abc',''),'transcript-abc','auto-detect keeps the original key');
 assert.equal(transcriptCacheKey('abc',undefined),'transcript-abc');
 assert.equal(transcriptCacheKey('abc','fa'),'transcript-abc-fa');
 assert.notEqual(transcriptCacheKey('abc','fa'),transcriptCacheKey('abc','en'));
});
