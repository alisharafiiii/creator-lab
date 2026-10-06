// Stops a Creator Lab server from this folder that is still holding the port (macOS/Linux).
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url)).replace(/\/$/,'');
const port=process.env.PORT||'5190';
let pids=[];try{pids=execFileSync('lsof',['-ti',`tcp:${port}`,'-sTCP:LISTEN']).toString().split('\n').filter(Boolean);}catch{}
let stopped=0;
for(const pid of pids){
 let cwd='';try{cwd=execFileSync('lsof',['-a','-p',pid,'-d','cwd','-Fn']).toString().split('\n').find(l=>l.startsWith('n'))?.slice(1)||'';}catch{}
 if(cwd!==root){console.log(`پورت ${port} دست برنامهٔ دیگه‌ای‌ه (${cwd||'نامعلوم'})؛ کاری باهاش ندارم.`);continue;}
 process.kill(Number(pid));stopped++;
}
console.log(stopped?'سرور قبلی خاموش شد. حالا npm start بزن.':'سرور روشنی پیدا نشد؛ مستقیم npm start بزن.');
