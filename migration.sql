-- نفّذ هذا الملف مرة واحدة في Supabase SQL Editor قبل رفع النسخة الجديدة.
-- يضيف حقول المجموعات دون حذف أو تعديل السجلات القديمة.
alter table public.parts add column if not exists compatibility_group_id text;
alter table public.parts add column if not exists group_name text;
create index if not exists parts_compatibility_group_id_idx on public.parts (compatibility_group_id);
-- أبقِ سياسات RLS الحالية: قراءة للمستخدم المسجل، وتعديل/إضافة/حذف للمدير فقط.
