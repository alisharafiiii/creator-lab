// Fails if any file that Git would publish contains something shaped like a real API key.
// Runs in `npm test`, in CI, and as a pre-commit hook (.githooks/pre-commit).
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

export const patterns=[
 ['Apify token',/apify_api_[A-Za-z0-9]{20,}/],
 ['Groq key',/gsk_[A-Za-z0-9]{30,}/],
 ['Fireworks key',/fw_[A-Za-z0-9]{16,}/],
 ['TypeSafe/Jev key',/apikey_[a-f0-9]{20,}_[a-f0-9]{20,}/],
 ['OpenAI key',/sk-(?:proj-)?[A-Za-z0-9_-]{30,}/],
 ['Anthropic key',/sk-ant-[A-Za-z0-9_-]{30,}/],
 ['Private key',/-----BEGIN [A-Z ]*PRIVATE KEY-----/],
 ['Filled key in env file',/^(?:APIFY_TOKEN|TYPESAFE_API_KEY|GROQ_API_KEY|FIREWORKS_API_KEY|JEV_API_KEY|APIFY_API_TOKEN)=(?!your_|<|\.\.\.|xxx)\S+/m]
];

export function publishedFiles(root=process.cwd()){
 // Tracked files plus untracked files that are not ignored — everything `git add -A` would include.
 const out=execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{cwd:root});
 return out.toString('utf8').split('\0').filter(Boolean);
}

export function findSecrets(root=process.cwd()){
 const hits=[];
 for(const file of publishedFiles(root)){
  if(/\.(gif|mp4|png|jpe?g|webp|ico|woff2?)$/i.test(file))continue;
  let text;try{text=readFileSync(new URL(file,`file://${root}/`),'utf8');}catch{continue;}
  for(const [name,re] of patterns){const m=text.match(re);if(m){const line=text.slice(0,m.index).split('\n').length;hits.push({file,line,name});}}
 }
 return hits;
}

if(import.meta.url===`file://${process.argv[1]}`){
 const hits=findSecrets();
 if(hits.length){
  console.error('✗ کلید API در فایل‌هایی پیدا شد که منتشر می‌شوند / Possible secrets in publishable files:');
  for(const h of hits)console.error(`  ${h.file}:${h.line}  ${h.name}`);
  console.error('کلیدها فقط باید در .env باشند. Keys belong in .env only.');
  process.exitCode=1;
 }else console.log('✓ هیچ کلیدی در فایل‌های قابل‌انتشار پیدا نشد / No secrets found.');
}
