# رقميات — النسخة السحابية

هذه النسخة تربط أجهزة المحل بقاعدة بيانات Supabase. أي إضافة أو تعديل أو حذف من المدير تتم على السحابة، وتظهر على الأجهزة الأخرى المفتوحة عبر التحديثات الفورية.

## مهم قبل الاستخدام
الملف ليس متصلاً بالسحابة تلقائياً بعد. يلزم إنشاء مشروع Supabase مجاني وإدخال عنوان المشروع ومفتاح anon/public في `index.html`. لا تضع أبداً `service_role` key داخل الموقع.

## خطوات الإعداد

1. أنشئ مشروعاً في https://supabase.com وسجّل الدخول.
2. من مشروعك افتح **SQL Editor** ثم **New query**.
3. انسخ كامل محتوى `schema.sql` والصقه ثم اضغط **Run**.
4. افتح **Project Settings → API** (أو Data API حسب الواجهة) وانسخ:
   - Project URL
   - anon / publishable public key
5. افتح `index.html` بمحرر نصوص وابحث عن:
   - `PASTE_SUPABASE_PROJECT_URL` واستبدله بعنوان المشروع.
   - `PASTE_SUPABASE_ANON_KEY` واستبدله بالمفتاح العام anon/publishable.
6. أنشئ حساب المدير من **Authentication → Users → Add user** باستخدام البريد وكلمة المرور. فعّل خيار تأكيد البريد إذا ظهر.
7. بعد إنشاء المدير، افتح **SQL Editor** ونفّذ هذا الاستعلام، مع استبدال البريد ببريد المدير الحقيقي:

```sql
update public.profiles
set role = 'admin', display_name = 'مدير رقميات'
where id = (
  select id from auth.users where email = 'admin@example.com'
);
```

8. أنشئ حسابي الموظفين من **Authentication → Users → Add user**. الحساب الجديد يأخذ صلاحية `employee` تلقائياً. أدخل اسميهما في جدول profiles إن رغبت:

```sql
update public.profiles
set display_name = 'الموظف الأول'
where id = (select id from auth.users where email = 'employee1@example.com');

update public.profiles
set display_name = 'الموظف الثاني'
where id = (select id from auth.users where email = 'employee2@example.com');
```

9. انشر `index.html` على استضافة HTTPS ثابتة مثل Netlify أو Vercel أو استضافة موقعك الحالية. افتح رابط الموقع نفسه على كل اللابتوبات.

## كيف يعمل
- الموظفون: تسجيل دخول وبحث وقراءة فقط.
- المدير: إضافة وتعديل وحذف.
- البيانات تحفظ في PostgreSQL على Supabase، وليس في ذاكرة اللابتوب.
- التغييرات على جدول البدائل تصل للأجهزة المفتوحة بشكل فوري تقريباً.
- افتح الموقع من أي لابتوب عبر رابط الاستضافة وسجّل الدخول بالحساب المخصص له.

## ملاحظات أمان وتشغيل
- استخدم كلمات مرور مختلفة وقوية للحسابات، ولا تشارك حساب المدير.
- لا تنشر مفتاح `service_role` أبداً في ملف HTML أو المتصفح.
- احتفظ بنسخة احتياطية دورية من قاعدة البيانات من لوحة Supabase.
- الخطة المجانية مناسبة للتجربة والبداية، لكن راجع حدودها وسياسة الإيقاف/النسخ الاحتياطي الحالية لدى Supabase قبل الاعتماد التجاري الكامل.
- يتطلب الوصول للبيانات اتصال إنترنت. البيانات تبقى على السحابة عند إغلاق أو تبديل اللابتوب، لكن الموقع لا يعمل دون اتصال.
