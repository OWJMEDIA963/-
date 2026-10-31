إعداد رقميات السحابي - GitHub Pages + Supabase

مهم: لا ترفع أبداً مفتاح service_role إلى GitHub أو إلى config.js.

الجزء الأول: إنشاء قاعدة البيانات
1. أنشئ مشروعاً جديداً في https://supabase.com
2. افتح SQL Editor ثم New query.
3. افتح الملف supabase/schema.sql وانسخ محتواه إلى SQL Editor ثم Run.
4. من Authentication > Users أنشئ حساب المدير الأول يدوياً ببريد إلكتروني وكلمة مرور.
5. انسخ UUID الخاص بحساب المدير.
6. في SQL Editor نفّذ أمر INSERT الموجود في نهاية schema.sql بعد وضع UUID الحقيقي بين علامتي الاقتباس. مثال:
   insert into public.profiles (id, display_name, role)
   values ('UUID-HERE', 'مدير رقميات', 'admin');

الجزء الثاني: إعداد الواجهة
1. من Supabase Project Settings > API انسخ Project URL و anon/public key.
2. افتح config.js وضع القيم مكان النصوص التوضيحية.
3. لا تضع service_role key في هذا الملف مطلقاً.

الجزء الثالث: نشر وظيفة إنشاء الموظفين الآمنة
تحتاج تثبيت Supabase CLI واستخدامه من جهازك:
1. سجّل الدخول: supabase login
2. اربط المشروع من مجلد المشروع: supabase link --project-ref YOUR_PROJECT_REF
3. انشر الوظيفة: supabase functions deploy admin-create-user
تستخدم الوظيفة متغيرات SUPABASE_URL وSUPABASE_ANON_KEY وSUPABASE_SERVICE_ROLE_KEY التي توفرها بيئة Supabase تلقائياً.
إذا طلب CLI ضبط الأسرار يدوياً:
supabase secrets set SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=...
احصل على service_role من إعدادات API، واستخدمه كسرّ في أوامر CLI فقط، ولا تشاركه أو تضعه في ملفات الواجهة.

الجزء الرابع: تعطيل التسجيل العام
من Supabase Dashboard > Authentication > Providers / Sign In settings:
عطّل Allow new users to sign up (التسجيل العام).
حسابات الموظفين تُنشأ حصراً عبر وظيفة المدير.

الجزء الخامس: GitHub Pages
ارفع محتويات هذا المجلد إلى جذر مستودع GitHub:
index.html, style.css, app.js, config.js, logo-raqmiat.png
(يمكنك أيضاً رفع مجلد supabase وملفات الشرح للاحتفاظ بها في المستودع)
ثم Settings > Pages > Deploy from a branch > main > /(root) > Save.

طريقة العمل:
- صفحة تسجيل الدخول موجودة عند فتح الموقع، ولا يوجد إنشاء حساب ذاتي.
- شعار رقميات مضاف في أعلى الموقع وصفحة الدخول.
- اسم الشاشة يظهر بوضوح بعبارة «الشاشة البديلة» في نتائج البحث ونموذج الإضافة.
- المدير الأول يسجل الدخول بالحساب الذي أنشأته يدوياً.
- المدير ينشئ الموظفين من قسم إدارة الحسابات.
- الموظف يسجل الدخول ويبحث فقط.
- بيانات القطع محفوظة في Supabase وتتزامن بين الأجهزة.

تنبيه أمني:
- لا تشارك service_role key مطلقاً.
- لا تمنح أي موظف دور admin.
- تأكد من إعداد كلمة مرور قوية للمدير والموظفين.

ملاحظة: تمت إضافة اشتراك التحديث الفوري لجدول parts. تأكد من تنفيذ جزء النشر supabase_realtime الموجود في schema.sql؛ وإذا كانت الجداول قد أُنشئت سابقاً، نفّذ مقطع التحديث الفوري وحده من أسفل الملف في محرر SQL.
