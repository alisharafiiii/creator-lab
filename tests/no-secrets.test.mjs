import test from 'node:test';
import assert from 'node:assert/strict';
import {findSecrets,patterns} from '../scripts/check-secrets.mjs';

test('no API keys in files that Git would publish',()=>{
 assert.deepEqual(findSecrets(),[]);
});

test('secret patterns catch each provider key shape',()=>{
 const samples=['apify_api_'+'A'.repeat(30),'gsk_'+'B'.repeat(40),'fw_'+'C'.repeat(20),'apikey_'+'a'.repeat(30)+'_'+'b'.repeat(30),'APIFY_TOKEN=abc'];
 for(const s of samples)assert.ok(patterns.some(([,re])=>re.test(s)),s);
 assert.ok(!patterns.some(([,re])=>re.test('APIFY_TOKEN=\nGROQ_API_KEY=\nAPIFY_TOKEN=your_apify_token')),'empty template lines are allowed');
});
