let csrfToken=null, currentUser=null;
const $=s=>document.querySelector(s);
async function api(url,opts={}) {
  const headers={"Content-Type":"application/json",...(opts.headers||{})};
  if(csrfToken && !["GET","HEAD"].includes((opts.method||"GET").toUpperCase())) headers["x-csrf-token"]=csrfToken;
  const r=await fetch(url,{credentials:"same-origin",...opts,headers});
  const data=await r.json().catch(()=>({error:"استجابة غير مفهومة"}));
  if(!r.ok) throw new Error(data.error||"حدث خطأ");
  return data;
}
function msg(form,text,ok=false){const el=form.querySelector(".message");if(el){el.textContent=text;el.style.color=ok?"#36e68b":"#ff9292";}}
function showApp(user,token){
  currentUser=user;csrfToken=token;
  $("#login").classList.add("hidden");$("#app").classList.remove("hidden");$("#userbar").classList.remove("hidden");
  $("#who").textContent=`${user.username} — ${user.role==="admin"?"المدير":"موظف"}`;
  $("#admin").classList.toggle("hidden",user.role!=="admin");
  loadProducts();if(user.role==="admin"){loadUsers();}
}
async function boot(){
  try{const d=await api("/api/me");if(d.user)showApp(d.user,d.csrfToken);}catch{}
}
$("#loginForm").addEventListener("submit",async e=>{
 e.preventDefault();const f=new FormData(e.currentTarget);
 try{const d=await api("/api/login",{method:"POST",body:JSON.stringify({username:f.get("username"),password:f.get("password")})});showApp(d.user,d.csrfToken);}
 catch(err){$("#loginMessage").textContent=err.message;}
});
$("#logout").addEventListener("click",async()=>{
 try{await api("/api/logout",{method:"POST",body:"{}"});}catch{}
 currentUser=null;csrfToken=null;$("#app").classList.add("hidden");$("#login").classList.remove("hidden");$("#userbar").classList.add("hidden");$("#loginForm").reset();
});
$("#search").addEventListener("click",loadProducts);
$("#q").addEventListener("keydown",e=>{if(e.key==="Enter")loadProducts();});
$("#category").addEventListener("change",loadProducts);
async function loadProducts(){
 if(!currentUser)return;
 const params=new URLSearchParams({q:$("#q").value.trim(),category:$("#category").value});
 try{const d=await api("/api/products?"+params.toString());renderProducts(d.products);}
 catch(e){$("#products").innerHTML=`<div class="panel">${esc(e.message)}</div>`;}
}
function renderProducts(items){
 $("#count").textContent=`${items.length} قطعة`;
 $("#resultTitle").textContent=$("#q").value.trim()?`نتائج: ${$("#q").value.trim()}`:$("#category").value==="الكل"?"القطع المسجلة":$("#category").value;
 $("#empty").classList.toggle("hidden",items.length>0);
 $("#products").innerHTML=items.map(p=>`<article class="product"><header><div class="part">▣</div><span class="status ${p.compatibility_status}">${statusText(p.compatibility_status)}</span></header><div class="product-body"><h3>${esc(p.name)}</h3><div class="sub">${esc([p.brand,p.model].filter(Boolean).join(" · "))}</div><div class="note">${esc(p.compatibility_note||"التوافق غير متحقق منه")}</div><div class="meta"><span>${esc(p.quality||"الجودة غير محددة")}</span></div><div class="sub">رقم القطعة: ${esc(p.part_number||"غير مسجل")}</div><div class="sub">المورد: ${esc(p.supplier||"غير مسجل")}</div>${p.source_url?`<div class="sub"><a target="_blank" rel="noopener noreferrer" href="${esc(p.source_url)}">مصدر المورد ↗</a></div>`:""}${p.compatibility_status==="verified"?`<div class="sub">تم التحقق بواسطة: ${esc(p.verified_by||"غير مسجل")} · ${esc(p.verified_at||"")}</div>`:""}</div></article>`).join("");
}
function statusText(s){return s==="verified"?"تم التحقق":s==="incompatible"?"غير متوافق":"غير متحقق منه";}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
$("#userForm").addEventListener("submit",async e=>{
 e.preventDefault();const form=e.currentTarget, f=new FormData(form);
 try{await api("/api/users",{method:"POST",body:JSON.stringify(Object.fromEntries(f))});msg(form,"تم إنشاء الحساب بنجاح.",true);form.reset();loadUsers();}
 catch(err){msg(form,err.message);}
});
$("#productForm").addEventListener("submit",async e=>{
 e.preventDefault();const form=e.currentTarget,f=new FormData(form),data=Object.fromEntries(f);
 try{await api("/api/products",{method:"POST",body:JSON.stringify(data)});msg(form,"تم حفظ القطعة.",true);form.reset();form.querySelector('[name="compatibility_note"]').value="التوافق غير متحقق منه";loadProducts();}
 catch(err){msg(form,err.message);}
});
async function loadUsers(){
 try{const d=await api("/api/users");$("#usersList").innerHTML=d.users.map(u=>`<div class="user-row"><span>${esc(u.username)} · ${u.role==="admin"?"مدير":"موظف"} · ${u.active?"فعال":"موقوف"}</span>${u.id!==currentUser.id?`<button data-id="${u.id}" data-active="${u.active?0:1}">${u.active?"إيقاف":"تفعيل"}</button>`:"<span>حسابك الحالي</span>"}</div>`).join("")||"لا توجد حسابات";$("#usersList").querySelectorAll("button").forEach(b=>b.addEventListener("click",async()=>{try{await api(`/api/users/${b.dataset.id}`,{method:"PATCH",body:JSON.stringify({active:b.dataset.active==="1"})});loadUsers();}catch(e){$("#adminMessage").textContent=e.message;}}));}
 catch(e){$("#adminMessage").textContent=e.message;}
}
boot();
