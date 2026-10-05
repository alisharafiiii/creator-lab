import {copyFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
try {
 await copyFile(new URL('.env.example',root),new URL('.env',root),constants.COPYFILE_EXCL);
 console.log('فایل .env ساخته شد. آن را باز کنید و کلیدهای خودتان را وارد کنید.');
} catch(error) {
 if(error.code!=='EEXIST')throw error;
 console.log('فایل .env قبلی شما دست‌نخورده ماند.');
}
console.log(`مسیر تنظیمات: ${fileURLToPath(new URL('.env',root))}`);
console.log('TRANSCRIPTION_PROVIDER را groq (پلن رایگان دارد) یا fireworks بگذارید. فقط کلید همان سرویس لازم است.\nبعد npm run doctor و npm start را اجرا کنید. فایل .env را هرگز با کسی به اشتراک نگذارید.');
