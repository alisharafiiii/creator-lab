// Persian display strings. Keys match the English identifiers used by the pipeline and Jev;
// only the dashboard labels are translated, never the classification prompts.
export const dimensionTitles={topic:'موضوع',opening:'شروع کلام',mechanism:'سازوکار هوک',structure:'ساختار اسکریپت',evidence:'شواهد ارائه‌شده',emotion:'جذبهٔ احساسی',specificity:'دقت توصیه',cta:'فراخوان گفتاری'};
export const labels={
 business:'کسب‌وکار',money:'پول و مالی',marketing:'بازاریابی',mindset:'ذهنیت',habits:'عادت‌ها',relationships:'روابط',health:'سلامت',technology:'فناوری',other:'سایر',unclear:'نامشخص',
 question:'پرسش',instruction:'دستور',claim:'ادعا',story:'داستان',dialogue:'گفت‌وگو',
 contradiction:'تناقض',curiosity:'کنجکاوی',result:'نتیجه',mistake:'اشتباه',recognition:'هم‌ذات‌پنداری',direct:'مستقیم',
 steps:'مرحله‌به‌مرحله',problem_solution:'مسئله و راه‌حل',explanation:'توضیح',comparison:'مقایسه',opinion:'نظر شخصی',qa:'پرسش و پاسخ',
 example:'مثال',personal:'تجربهٔ شخصی',numbers:'آمار و عدد',source:'منبع',reasoning:'استدلال',none:'هیچ',
 aspiration:'آرزو و جاه‌طلبی',concern:'نگرانی',relief:'آرامش',surprise:'شگفتی',amusement:'سرگرمی',neutral:'خنثی',
 principle:'اصل کلی',action:'اقدام',sequence:'توالی اقدام‌ها',
 follow:'دنبال کردن',engage:'تعامل',comment:'کامنت',visit:'بازدید',buy:'خرید',multiple:'چندگانه',
 hook:'هوک',setup:'مقدمه',problem:'مسئله',advice:'توصیه',payoff:'نتیجه‌گیری',cta:'فراخوان',
 no_audio:'بدون صدا',too_little_speech:'گفتار ناکافی',needs_retry:'نیاز به تلاش مجدد',unclassified:'دسته‌بندی‌نشده',
 views:'بازدید',plays:'پخش',
 groq:'گروک',fireworks:'فایرورکس',apify:'اپیفای',jev:'جِو',
 running:'در حال اجرا',scraping:'در حال جمع‌آوری',paused:'متوقف',completed:'تکمیل‌شده',complete:'کامل',done:'کامل',stopped:'متوقف',error:'خطا',failed:'ناموفق',queued:'در صف',idle:'آماده',created:'ایجادشده',partial:'نیمه‌کاره'
};
const nf=new Intl.NumberFormat('fa-IR');
export const num=n=>nf.format(n);
export const compact=n=>n===null||n===undefined?'نامشخص':new Intl.NumberFormat('fa-IR',{notation:'compact',maximumFractionDigits:1}).format(n);
export const fixed=(n,d=1)=>n===null||n===undefined?'نامشخص':n.toLocaleString('fa-IR',{minimumFractionDigits:d,maximumFractionDigits:d});
