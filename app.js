const starterData = [
 {id:1,screen:"A125 / A12",brand:"Samsung",devices:["Samsung Galaxy A12","Samsung Galaxy A125","SM-A125F"],notes:"بيانات تجريبية للتوضيح فقط؛ طابق شكل الفلاتة ورقم القطعة قبل التركيب."},
 {id:2,screen:"A105 / A10",brand:"Samsung",devices:["Samsung Galaxy A10","Samsung Galaxy A105","SM-A105F"],notes:"تأكد من نسخة الشاشة والفريم."},
 {id:3,screen:"Redmi 9A",brand:"Xiaomi",devices:["Xiaomi Redmi 9A","Xiaomi Redmi 9AT"],notes:"تحقق من شكل الكونكتور قبل التركيب."},
 {id:4,screen:"iPhone 11",brand:"Apple",devices:["Apple iPhone 11","iPhone 11 A2221","iPhone 11 A2111"],notes:"توجد أنواع جودة مختلفة؛ التوافق هنا حسب الموديل."},
 {id:5,screen:"A205 / A20",brand:"Samsung",devices:["Samsung Galaxy A20","Samsung Galaxy A205","SM-A205F"],notes:"لا تعتمد على الاسم التجاري وحده."},
 {id:6,screen:"Poco X3 NFC",brand:"Xiaomi",devices:["Xiaomi Poco X3 NFC","Xiaomi Poco X3"],notes:"افحص رقم الإصدار وشكل الفلاتة."}
];
let catalog = loadData();
let activeFilter = "all";
const $ = s => document.querySelector(s);
function loadData(){try{const x=JSON.parse(localStorage.getItem("raqmiCatalog"));return Array.isArray(x)?x:starterData.slice()}catch{return starterData.slice()}}
function save(){localStorage.setItem("raqmiCatalog",JSON.stringify(catalog));renderStats()}
function norm(s){return String(s||"").toLowerCase().replace(/[أإآ]/g,"ا").replace(/[ىي]/g,"ي").replace(/[\s\-_./]/g,"")}
function renderStats(){const devices=new Set(catalog.flatMap(x=>x.devices.map(norm)));$("#deviceCount").textContent=devices.size;$("#screenCount").textContent=catalog.length;$("#compatCount").textContent=catalog.reduce((n,x)=>n+x.devices.length,0)}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function render(){
 const q=$("#searchInput").value.trim(), nq=norm(q);let matches=[];
 if(q){matches=catalog.map(item=>{const deviceHit=item.devices.some(d=>norm(d).includes(nq)||nq.includes(norm(d)));const screenHit=norm(item.screen).includes(nq)||nq.includes(norm(item.screen));const brandHit=norm(item.brand).includes(nq);let score=(deviceHit?3:0)+(screenHit?4:0)+(brandHit?1:0);return {...item,score,deviceHit,screenHit}}).filter(x=>x.score>0);
 if(activeFilter==="device")matches=matches.filter(x=>x.deviceHit);
 if(activeFilter==="screen")matches=matches.filter(x=>x.screenHit);
 matches.sort((a,b)=>b.score-a.score);
 }
 $("#resultsMeta").textContent=q?`تم العثور على ${matches.length} نتيجة مطابقة`:"ابدأ بكتابة اسم الجهاز أو رقم الشاشة";
 const root=$("#results");root.classList.toggle("empty-state",!q||!matches.length);
 if(!q){root.innerHTML='<div class="empty-icon">⌕</div><b>نتائج التوافق ستظهر هنا</b><span>جرّب البحث باسم موديل الهاتف أو كود الشاشة</span>';return}
 if(!matches.length){root.innerHTML='<div class="empty-icon">⌕</div><b>لا توجد نتيجة في الكتالوج</b><span>يمكنك إضافة الشاشة والأجهزة المتوافقة من قسم إدارة الكتالوج</span>';return}
 root.innerHTML=matches.map(x=>`<article class="result-card"><div class="result-top"><div><h3>${escapeHtml(x.screen)}</h3><span class="muted">${escapeHtml(x.brand||"شركة غير محددة")}</span></div><span class="tag">شاشة مطابقة</span></div><div class="compat-list">${x.devices.map(d=>`<span class="device-chip">${escapeHtml(d)}</span>`).join("")}</div>${x.notes?`<div class="notes">${escapeHtml(x.notes)}</div>`:""}<div style="display:flex;justify-content:flex-end;margin-top:9px"><button class="delete-btn" data-delete="${x.id}">حذف من الكتالوج</button></div></article>`).join("");
 root.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>{if(confirm("هل تريد حذف هذه الشاشة من الكتالوج؟")){catalog=catalog.filter(x=>x.id!==Number(b.dataset.delete));save();render();toast("تم حذف البيانات")}}));
}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
$("#searchInput").addEventListener("input",render);
$("#clearSearch").addEventListener("click",()=>{$("#searchInput").value="";render();$("#searchInput").focus()});
document.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeFilter=b.dataset.filter;render()}));
$("#toggleForm").addEventListener("click",()=>{$("#addForm").classList.toggle("hidden");$("#toggleForm").textContent=$("#addForm").classList.contains("hidden")?"＋ إضافة شاشة":"إخفاء النموذج"});
$("#cancelForm").addEventListener("click",()=>{$("#addForm").reset();$("#addForm").classList.add("hidden");$("#toggleForm").textContent="＋ إضافة شاشة"});
$("#addForm").addEventListener("submit",e=>{e.preventDefault();const fd=new FormData(e.target);const devices=String(fd.get("devices")).split(",").map(x=>x.trim()).filter(Boolean);if(!devices.length)return;catalog.unshift({id:Date.now(),screen:String(fd.get("screen")).trim(),brand:String(fd.get("brand")).trim(),devices,notes:String(fd.get("notes")).trim()});save();e.target.reset();e.target.classList.add("hidden");$("#toggleForm").textContent="＋ إضافة شاشة";render();toast("تمت إضافة الشاشة والتوافق بنجاح")});
$("#exportBtn").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(catalog,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="raqmi-screens-backup.json";a.click();URL.revokeObjectURL(a.href);toast("تم تصدير النسخة الاحتياطية")});
$("#importInput").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data)||!data.every(x=>x.screen&&Array.isArray(x.devices)))throw Error();catalog=data.map((x,i)=>({...x,id:Number(x.id)||Date.now()+i}));save();render();toast("تم استيراد قاعدة البيانات")}catch{alert("الملف غير صالح. اختر نسخة احتياطية صادرة من الموقع.")}e.target.value=""});
$("#resetBtn").addEventListener("click",()=>{if(confirm("سيتم استبدال بياناتك الحالية بالبيانات التجريبية. هل أنت متأكد؟")){catalog=starterData.map(x=>({...x}));save();render();toast("تمت إعادة البيانات التجريبية")}});
$("#year").textContent=new Date().getFullYear();renderStats();render();
