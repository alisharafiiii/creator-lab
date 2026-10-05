import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {spawnSync} from 'node:child_process';
let config={};try{config=parseEnv(await readFile(new URL('../.env',import.meta.url),'utf8'));}catch{}
const value=name=>config[name]||process.env[name];
let failures=0;
function check(name,ok,hint){console.log(`${ok?'✓ OK':'✗ کم است'} ${name}${ok?'':` — ${hint}`}`);if(!ok)failures++;}
const [major,minor]=process.versions.node.split('.').map(Number);
check('Node.js',major>22||major===22&&minor>=9,'Node نسخهٔ ۲۴ LTS یا ۲۲.۹ به بالا نصب کنید.');
for(const cmd of ['ffmpeg','ffprobe'])check(cmd,spawnSync(cmd,['-version'],{stdio:'ignore'}).status===0,'FFmpeg را نصب کنید (brew install ffmpeg) و ترمینال را دوباره باز کنید.');
const provider=value('TRANSCRIPTION_PROVIDER')||'groq';
check('سرویس رونویسی',['fireworks','groq'].includes(provider),'مقدار TRANSCRIPTION_PROVIDER را groq یا fireworks بگذارید.');
check('کلید Apify',Boolean(value('APIFY_TOKEN')||value('APIFY_API_TOKEN')),'APIFY_TOKEN را در فایل .env وارد کنید.');
check('کلید Jev',Boolean(value('TYPESAFE_API_KEY')||value('JEV_API_KEY')),'TYPESAFE_API_KEY را در فایل .env وارد کنید.');
if(['fireworks','groq'].includes(provider))check(`کلید ${provider}`,Boolean(value(provider==='groq'?'GROQ_API_KEY':'FIREWORKS_API_KEY')),`کلید ${provider} را در فایل .env وارد کنید.`);
console.log('فقط وجود کلیدها بررسی می‌شود. مقدار هیچ کلیدی چاپ نمی‌شود و هیچ درخواست پولی ارسال نمی‌شود.');
console.log(failures?'برای تحلیل واقعی موارد بالا را درست کنید. نسخهٔ نمایشی بدون کلید هم کار می‌کند (npm start).':'آماده است. برنامه را با npm start اجرا کنید و بخش «اتصال‌ها» را بررسی کنید.');
process.exitCode=failures?1:0;
