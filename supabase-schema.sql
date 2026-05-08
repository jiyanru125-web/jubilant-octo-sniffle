-- 雅思双人监督局 Supabase 数据库结构
-- 使用方法：打开 Supabase 项目 → SQL Editor → New query → 粘贴本文件 → Run

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

-- 让前端 anon key 可以读写任务表。
-- 这个网站目前只给你们两个人使用，先用开放策略简化上线。
-- 之后如果要加登录，再把策略改成按用户限制。
alter table public.tasks enable row level security;

drop policy if exists "Anyone can read tasks" on public.tasks;
create policy "Anyone can read tasks"
on public.tasks for select
using (true);

drop policy if exists "Anyone can insert tasks" on public.tasks;
create policy "Anyone can insert tasks"
on public.tasks for insert
with check (true);

drop policy if exists "Anyone can update tasks" on public.tasks;
create policy "Anyone can update tasks"
on public.tasks for update
using (true)
with check (true);

drop policy if exists "Anyone can delete tasks" on public.tasks;
create policy "Anyone can delete tasks"
on public.tasks for delete
using (true);

-- 照片证据存储桶：task-proofs
-- 注意：Storage bucket 需要在 Supabase Dashboard 里手动创建：
-- Storage → New bucket → Name: task-proofs → Public bucket: ON

-- 如果你想用 SQL 创建 public bucket，也可以运行下面这句：
insert into storage.buckets (id, name, public)
values ('task-proofs', 'task-proofs', true)
on conflict (id) do update set public = true;

-- Storage 读写策略
create policy if not exists "Anyone can read task proof files"
on storage.objects for select
using (bucket_id = 'task-proofs');

create policy if not exists "Anyone can upload task proof files"
on storage.objects for insert
with check (bucket_id = 'task-proofs');

create policy if not exists "Anyone can update task proof files"
on storage.objects for update
using (bucket_id = 'task-proofs')
with check (bucket_id = 'task-proofs');

create policy if not exists "Anyone can delete task proof files"
on storage.objects for delete
using (bucket_id = 'task-proofs');
