-- 雅思双人监督局 Supabase 数据库结构（兼容版）
-- 使用方法：Supabase 项目 → SQL Editor → New query → 粘贴本文件 → Run

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (player_name in ('纪沿如', '李姝娴')),
  title text not null,
  reward text default 'Custom +1',
  done boolean not null default false,
  proof_name text,
  proof_url text,
  task_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_task_date_idx on public.tasks(task_date);
create index if not exists tasks_player_name_idx on public.tasks(player_name);

alter table public.tasks enable row level security;

drop policy if exists "Anyone can read tasks" on public.tasks;
create policy "Anyone can read tasks"
on public.tasks for select
to anon, authenticated
using (true);

drop policy if exists "Anyone can insert tasks" on public.tasks;
create policy "Anyone can insert tasks"
on public.tasks for insert
to anon, authenticated
with check (true);

drop policy if exists "Anyone can update tasks" on public.tasks;
create policy "Anyone can update tasks"
on public.tasks for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Anyone can delete tasks" on public.tasks;
create policy "Anyone can delete tasks"
on public.tasks for delete
to anon, authenticated
using (true);

-- 创建照片证据存储桶：task-proofs
insert into storage.buckets (id, name, public)
values ('task-proofs', 'task-proofs', true)
on conflict (id) do update set public = true;

-- Storage 读写策略：Postgres 不支持 create policy if not exists，所以先 drop 再 create。
drop policy if exists "Anyone can read task proof files" on storage.objects;
create policy "Anyone can read task proof files"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'task-proofs');

drop policy if exists "Anyone can upload task proof files" on storage.objects;
create policy "Anyone can upload task proof files"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'task-proofs');

drop policy if exists "Anyone can update task proof files" on storage.objects;
create policy "Anyone can update task proof files"
on storage.objects for update
to anon, authenticated
using (bucket_id = 'task-proofs')
with check (bucket_id = 'task-proofs');

drop policy if exists "Anyone can delete task proof files" on storage.objects;
create policy "Anyone can delete task proof files"
on storage.objects for delete
to anon, authenticated
using (bucket_id = 'task-proofs');
