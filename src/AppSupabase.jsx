import React, { useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from './supabaseClient.js';

const PLAYERS = [
  { name: '纪沿如', avatar: '🦊', target: 'IELTS 7.0', color: 'from-sky-400 to-cyan-300' },
  { name: '李姝娴', avatar: '🐰', target: 'IELTS 7.0', color: 'from-pink-400 to-orange-300' },
];

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function emptyTaskLists() {
  return { '纪沿如': [], '李姝娴': [] };
}

function toTask(row) {
  return {
    id: row.id,
    title: row.title,
    reward: row.reward || 'Custom +1',
    done: Boolean(row.done),
    proofName: row.proof_name || '',
    proofUrl: row.proof_url || '',
  };
}

function tableStatus(rate) {
  if (rate >= 100) return { text: '今日超神', style: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' };
  if (rate >= 75) return { text: '差一点封神', style: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500' };
  if (rate >= 50) return { text: '还在挣扎', style: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' };
  return { text: '今天摸鱼了', style: 'bg-rose-100 text-rose-700', dot: 'bg-rose-400' };
}

function ProgressBar({ value }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full border border-white/70 bg-white/60">
      <div
        style={{ width: `${Math.min(value, 100)}%` }}
        className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-sky-300 transition-all duration-700"
      />
    </div>
  );
}

function SectionTitle({ icon, title, desc }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-900 text-2xl text-white shadow-lg">{icon}</div>
      <div>
        <h2 className="text-2xl font-black text-slate-900">{title}</h2>
        <p className="text-sm font-semibold text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

function PlayerCard({ stat }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white/75 p-5 shadow-xl shadow-sky-100/60">
      <div className={cn('absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-70 blur-2xl', stat.color)} />
      <div className="relative flex items-center gap-3">
        <div className="grid h-16 w-16 place-items-center rounded-3xl bg-white text-4xl shadow-inner">{stat.avatar}</div>
        <div>
          <h3 className="text-xl font-black text-slate-800">{stat.name}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">目标：{stat.target}</p>
        </div>
      </div>
      <div className="relative mt-5 rounded-3xl bg-orange-50 p-5 text-center">
        <p className="text-3xl">🔥</p>
        <p className="mt-2 text-3xl font-black text-slate-800">{stat.streak}天</p>
        <p className="text-sm font-bold text-slate-500">连续打卡 · 今日 {stat.percent}%</p>
      </div>
    </div>
  );
}

function CheckTable({ stat }) {
  const status = tableStatus(stat.percent);
  const dates = Array.from({ length: 7 }).map((_, index) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + index);
    return {
      id: index,
      dateText: `${d.getMonth() + 1}/${d.getDate()}`,
      weekday: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
      percent: index === 6 ? stat.percent : 0,
      isToday: index === 6,
    };
  });

  return (
    <div className="rounded-[2rem] border border-white bg-white/80 p-5 shadow-xl shadow-sky-100">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-3xl bg-slate-100 text-4xl">{stat.avatar}</div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">{stat.name} 的打卡状况</h3>
            <p className="text-sm font-bold text-slate-500">今天数据来自 Supabase 数据库</p>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-900 px-4 py-3 text-right text-white">
          <p className="text-xs font-bold text-white/60">今日完成</p>
          <p className="text-2xl font-black">{stat.percent}%</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
        <div className="grid grid-cols-[1fr_0.9fr_1.1fr] bg-slate-50 px-4 py-3 text-xs font-black text-slate-500">
          <span>日期</span><span>完成度</span><span>状态</span>
        </div>
        {dates.map((day) => {
          const rowStatus = tableStatus(day.percent);
          return (
            <div key={day.id} className="grid grid-cols-[1fr_0.9fr_1.1fr] items-center border-t border-slate-100 px-4 py-3 text-sm font-bold text-slate-700">
              <div>
                <p className="font-black text-slate-900">{day.dateText}</p>
                <p className="text-xs text-slate-400">周{day.weekday}{day.isToday ? ' · 今天' : ''}</p>
              </div>
              <div className="flex items-center gap-2"><span className={cn('h-2.5 w-2.5 rounded-full', rowStatus.dot)} /><span>{day.percent}%</span></div>
              <span className={cn('w-fit rounded-full px-3 py-1 text-xs font-black', day.isToday ? status.style : rowStatus.style)}>{day.isToday ? status.text : rowStatus.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskBoard({ player, tasks, draft, isEditing, selectedIds, onDraftChange, onAddTask, onToggleEdit, onEditTask, onUploadProof, onClearProof, onViewProof, onToggleSelectTask, onDeleteSelected }) {
  const doneCount = tasks.filter((task) => task.proofName).length;
  const percent = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white/80 p-5 shadow-xl shadow-sky-100/60">
      <div className={cn('absolute -right-12 -top-12 h-36 w-36 rounded-full bg-gradient-to-br opacity-60 blur-2xl', player.color)} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3"><div className="grid h-16 w-16 place-items-center rounded-3xl bg-white text-4xl shadow-inner">{player.avatar}</div><div><h3 className="text-2xl font-black text-slate-900">{player.name} 的今日任务</h3><p className="text-sm font-bold text-slate-500">已上传 {doneCount} / {tasks.length} 个证据</p></div></div>
        <div className="rounded-2xl bg-slate-900 px-4 py-3 text-right text-white"><p className="text-xs font-bold text-white/60">完成度</p><p className="text-2xl font-black">{percent}%</p></div>
      </div>
      <div className="relative mt-5"><ProgressBar value={percent} /></div>
      <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-slate-50 p-3">
        <div><p className="text-sm font-black text-slate-900">{isEditing ? '正在编辑任务' : '普通模式'}</p><p className="text-xs font-bold text-slate-500">{isEditing ? '可以新增、修改、选择后删除' : '点击相机上传照片，上传后才算完成'}</p></div>
        <div className="flex flex-wrap gap-2">
          {isEditing && <button onClick={() => onDeleteSelected(player.name)} disabled={!selectedIds.length} className="rounded-2xl bg-rose-100 px-4 py-3 text-sm font-black text-rose-600 disabled:opacity-40">删除已选 {selectedIds.length ? `(${selectedIds.length})` : ''}</button>}
          <button onClick={() => onToggleEdit(player.name)} className={cn('rounded-2xl px-5 py-3 text-sm font-black transition', isEditing ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white')}>{isEditing ? '完成' : '编辑'}</button>
        </div>
      </div>
      {isEditing && (
        <div className="relative mt-4 flex flex-col gap-3 sm:flex-row">
          <input value={draft} onChange={(e) => onDraftChange(player.name, e.target.value)} placeholder={`给${player.name}添加一个任务，比如：听写 20 个单词`} className="min-w-0 flex-1 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-sky-300" />
          <button onClick={() => onAddTask(player.name)} className="rounded-2xl bg-yellow-300 px-5 py-3 text-sm font-black text-slate-900">添加新任务</button>
        </div>
      )}
      <div className="relative mt-5 space-y-3">
        {tasks.map((task) => {
          const selected = selectedIds.includes(task.id);
          return (
            <div key={task.id} className={cn('rounded-[1.5rem] border p-4 transition', selected ? 'border-rose-200 bg-rose-50' : 'border-slate-100 bg-slate-50')}>
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <button onClick={() => onToggleSelectTask(player.name, task.id)} className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl font-black', selected ? 'bg-rose-500 text-white' : 'bg-white text-slate-400')}>{selected ? '−' : '○'}</button>
                ) : task.proofName ? (
                  <button onClick={() => onViewProof(player.name, task)} className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-emerald-100 text-xl font-black text-emerald-600">{task.proofUrl ? <img src={task.proofUrl} alt="学习证据" className="h-full w-full object-cover" /> : '✓'}</button>
                ) : (
                  <label className="grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-2xl bg-yellow-100 text-xl font-black text-amber-600">📷<input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onUploadProof(player.name, task.id, e.target.files && e.target.files[0])} /></label>
                )}
                <div className="min-w-0 flex-1">
                  <input value={task.title} readOnly={!isEditing} onChange={(e) => onEditTask(player.name, task.id, e.target.value)} className={cn('w-full rounded-xl px-3 py-2 text-base font-black text-slate-900 outline-none', isEditing ? 'bg-white focus:ring-2 focus:ring-sky-200' : 'bg-transparent cursor-default', task.done && !isEditing ? 'line-through decoration-2 opacity-60' : '')} />
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                    {task.proofName ? <button onClick={() => onViewProof(player.name, task)} className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">已上传：{task.proofName} · 点击查看</button> : <span className="rounded-full bg-yellow-100 px-2 py-1 text-yellow-700">未上传证据</span>}
                  </div>
                  {!isEditing && task.proofName && <button onClick={() => onClearProof(player.name, task.id)} className="mt-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">取消完成</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function IELTSBattleRoom() {
  const [tab, setTab] = useState('home');
  const [taskLists, setTaskLists] = useState(emptyTaskLists());
  const [taskDrafts, setTaskDrafts] = useState({ '纪沿如': '', '李姝娴': '' });
  const [editingTasks, setEditingTasks] = useState({ '纪沿如': false, '李姝娴': false });
  const [selectedTaskIds, setSelectedTaskIds] = useState({ '纪沿如': [], '李姝娴': [] });
  const [proofPreview, setProofPreview] = useState(null);
  const [statusMessage, setStatusMessage] = useState(isSupabaseConfigured ? '正在连接 Supabase...' : '尚未配置 Supabase，当前只能本地测试。');

  async function loadTasks() {
    if (!isSupabaseConfigured) return;
    setStatusMessage('正在从 Supabase 同步任务...');
    const { data, error } = await supabase.from('tasks').select('*').eq('task_date', todayKey()).order('created_at', { ascending: true });
    if (error) {
      setStatusMessage(`数据库读取失败：${error.message}`);
      return;
    }
    const next = emptyTaskLists();
    (data || []).forEach((row) => { next[row.player_name].push(toTask(row)); });
    setTaskLists(next);
    setStatusMessage('已连接 Supabase，数据会在两个人设备间同步。');
  }

  useEffect(() => {
    loadTasks();
    if (!isSupabaseConfigured) return;
    const channel = supabase.channel('tasks-live').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, loadTasks).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  function updateTaskDraft(playerName, value) {
    setTaskDrafts({ ...taskDrafts, [playerName]: value });
  }

  async function addTask(playerName) {
    const title = (taskDrafts[playerName] || '').trim();
    if (!title) return;
    if (!isSupabaseConfigured) {
      setTaskLists({ ...taskLists, [playerName]: [...taskLists[playerName], { id: Date.now(), title, reward: 'Custom +1', done: false, proofName: '', proofUrl: '' }] });
      setTaskDrafts({ ...taskDrafts, [playerName]: '' });
      return;
    }
    const { error } = await supabase.from('tasks').insert({ player_name: playerName, title, reward: 'Custom +1', task_date: todayKey() });
    if (error) setStatusMessage(`新增任务失败：${error.message}`);
    setTaskDrafts({ ...taskDrafts, [playerName]: '' });
    await loadTasks();
  }

  async function editTask(playerName, taskId, title) {
    setTaskLists({ ...taskLists, [playerName]: taskLists[playerName].map((task) => task.id === taskId ? { ...task, title } : task) });
    if (isSupabaseConfigured) await supabase.from('tasks').update({ title, updated_at: new Date().toISOString() }).eq('id', taskId);
  }

  async function uploadTaskProof(playerName, taskId, file) {
    if (!file) return;
    if (!isSupabaseConfigured) {
      const proofUrl = URL.createObjectURL(file);
      setTaskLists({ ...taskLists, [playerName]: taskLists[playerName].map((task) => task.id === taskId ? { ...task, done: true, proofName: file.name, proofUrl } : task) });
      setProofPreview({ playerName, taskTitle: taskLists[playerName].find((task) => task.id === taskId)?.title || '学习任务', proofName: file.name, proofUrl });
      return;
    }
    const path = `${todayKey()}/${playerName}/${taskId}-${Date.now()}-${file.name}`;
    const upload = await supabase.storage.from('task-proofs').upload(path, file, { upsert: true, contentType: file.type });
    if (upload.error) {
      setStatusMessage(`照片上传失败：${upload.error.message}`);
      return;
    }
    const { data: urlData } = supabase.storage.from('task-proofs').getPublicUrl(path);
    const proofUrl = urlData.publicUrl;
    const { error } = await supabase.from('tasks').update({ done: true, proof_name: file.name, proof_url: proofUrl, updated_at: new Date().toISOString() }).eq('id', taskId);
    if (error) setStatusMessage(`任务更新失败：${error.message}`);
    setProofPreview({ playerName, taskTitle: taskLists[playerName].find((task) => task.id === taskId)?.title || '学习任务', proofName: file.name, proofUrl });
    await loadTasks();
  }

  async function clearTaskProof(playerName, taskId) {
    if (isSupabaseConfigured) await supabase.from('tasks').update({ done: false, proof_name: null, proof_url: null, updated_at: new Date().toISOString() }).eq('id', taskId);
    setTaskLists({ ...taskLists, [playerName]: taskLists[playerName].map((task) => task.id === taskId ? { ...task, done: false, proofName: '', proofUrl: '' } : task) });
  }

  function viewTaskProof(playerName, task) {
    setProofPreview({ playerName, taskTitle: task.title, proofName: task.proofName, proofUrl: task.proofUrl || '' });
  }

  function toggleEditTasks(playerName) {
    setEditingTasks({ ...editingTasks, [playerName]: !editingTasks[playerName] });
    setSelectedTaskIds({ ...selectedTaskIds, [playerName]: [] });
  }

  function toggleSelectTask(playerName, taskId) {
    const current = selectedTaskIds[playerName] || [];
    setSelectedTaskIds({ ...selectedTaskIds, [playerName]: current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId] });
  }

  async function deleteSelected(playerName) {
    const ids = selectedTaskIds[playerName] || [];
    if (!ids.length) return;
    if (isSupabaseConfigured) await supabase.from('tasks').delete().in('id', ids);
    setTaskLists({ ...taskLists, [playerName]: taskLists[playerName].filter((task) => !ids.includes(task.id)) });
    setSelectedTaskIds({ ...selectedTaskIds, [playerName]: [] });
  }

  const taskStats = useMemo(() => PLAYERS.map((player) => {
    const tasks = taskLists[player.name] || [];
    const doneCount = tasks.filter((task) => task.proofName).length;
    const percent = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
    return { ...player, doneCount, taskCount: tasks.length, percent, streak: percent === 100 && tasks.length ? 1 : 0 };
  }), [taskLists]);

  const isTie = taskStats[0].percent === taskStats[1].percent;
  const leader = taskStats[0].percent >= taskStats[1].percent ? taskStats[0] : taskStats[1];
  const loser = isTie ? null : taskStats[0].percent < taskStats[1].percent ? taskStats[0] : taskStats[1];
  const currentBadges = taskStats[0].percent === 0 && taskStats[1].percent === 0 ? [
    { label: '今日任务王', owner: '待产生', icon: '👑' },
    { label: '请饭预警', owner: '待产生', icon: '🍽️' },
  ] : [
    { label: '今日任务王', owner: leader.name, icon: '👑' },
    { label: '请饭预警', owner: isTie ? '暂时没有' : loser.name, icon: '🍽️' },
  ];

  const liveWall = [
    ...taskStats.map((stat) => ({ name: stat.name, avatar: stat.avatar, text: `今天已上传 ${stat.doneCount} / ${stat.taskCount} 个学习证据，任务完成率 ${stat.percent}%。`, tag: stat.percent === 100 ? '今日超神' : stat.percent >= 50 ? '还可以再冲' : '请饭危险区' })),
    { name: '系统监督员', avatar: '🤖', tag: '实时监督', text: isTie ? '目前两个人任务完成度持平。' : `${leader.name} 目前领先，${loser.name} 暂时落后。今天结束时完成度低的人，明天请对方吃饭。` },
  ];

  const tabs = [
    { key: 'home', label: '首页', icon: '🏆' },
    { key: 'tasks', label: '任务房间', icon: '🎯' },
    { key: 'wall', label: '监督墙', icon: '💬' },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dff7ff,transparent_35%),radial-gradient(circle_at_top_right,#fff2b8,transparent_35%),linear-gradient(135deg,#f8fbff,#fff7fb)] p-4 text-slate-800 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="relative overflow-hidden rounded-[2.5rem] border border-white bg-white/70 p-6 shadow-2xl shadow-sky-100 backdrop-blur md:p-8">
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-lg">⚡ IELTS Duo Battle Room</div><h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-6xl">雅思双人监督局</h1><p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-slate-600 md:text-lg">两个人一起背单词、互相监督、完成每日任务。现在已接入 Supabase 数据库。</p></div>
            <div className="rounded-[2rem] bg-slate-900 p-5 text-white shadow-xl md:min-w-72"><p className="text-sm font-bold text-white/60">今日战况</p><div className="mt-2 flex items-center gap-3"><div className="text-4xl">{leader.avatar}</div><div><p className="text-2xl font-black">{isTie ? '目前持平' : `${leader.name} 今日领先`}</p><p className="text-sm font-semibold text-white/70">{isTie ? `双方任务完成度都是 ${leader.percent}%` : `任务完成度：${leader.percent}% · 落后者请吃饭：${loser.name}`}</p></div></div></div>
          </div>
        </header>
        <div className="mt-4 rounded-2xl bg-white/80 p-3 text-sm font-bold text-slate-600 shadow">{statusMessage}</div>
        <nav className="sticky top-3 z-10 mt-5 overflow-x-auto rounded-[2rem] border border-white bg-white/75 p-2 shadow-xl shadow-sky-100/50 backdrop-blur"><div className="flex min-w-max gap-2">{tabs.map((item) => <button key={item.key} onClick={() => setTab(item.key)} className={cn('flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition', tab === item.key ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900')}><span>{item.icon}</span>{item.label}</button>)}</div></nav>
        <main className="mt-6">
          {tab === 'home' && <div className="space-y-6"><div className="grid gap-5 md:grid-cols-2">{taskStats.map((stat) => <PlayerCard key={stat.name} stat={stat} />)}</div><div className="grid gap-5 lg:grid-cols-2">{taskStats.map((stat) => <CheckTable key={stat.name} stat={stat} />)}</div><div className="rounded-[2rem] border border-white bg-white/75 p-5 shadow-xl shadow-sky-100"><SectionTitle icon="👑" title="今日称号榜" desc="根据 Supabase 中的任务完成度实时更新" /><div className="grid gap-3 md:grid-cols-2">{currentBadges.map((badge) => <div key={badge.label} className="rounded-3xl border border-white bg-slate-50 p-4 text-center"><p className="text-3xl">{badge.icon}</p><p className="mt-2 text-sm font-black text-slate-500">{badge.label}</p><p className="text-xl font-black text-slate-900">{badge.owner}</p></div>)}</div></div></div>}
          {tab === 'tasks' && <div className="grid gap-5 lg:grid-cols-2">{PLAYERS.map((player) => <TaskBoard key={player.name} player={player} tasks={taskLists[player.name] || []} draft={taskDrafts[player.name] || ''} isEditing={editingTasks[player.name] || false} selectedIds={selectedTaskIds[player.name] || []} onToggleEdit={toggleEditTasks} onDraftChange={updateTaskDraft} onAddTask={addTask} onUploadProof={uploadTaskProof} onClearProof={clearTaskProof} onViewProof={viewTaskProof} onEditTask={editTask} onToggleSelectTask={toggleSelectTask} onDeleteSelected={deleteSelected} />)}</div>}
          {tab === 'wall' && <div className="rounded-[2rem] border border-white bg-white/75 p-5 shadow-xl shadow-sky-100"><SectionTitle icon="💬" title="双人监督墙" desc="自动读取数据库中的今日数据" /><div className="space-y-4">{liveWall.map((item, i) => <div key={i} className="rounded-[1.7rem] border border-slate-100 bg-white p-5 shadow-md"><div className="flex items-start gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-3xl">{item.avatar}</div><div><h3 className="text-lg font-black text-slate-900">{item.name}</h3><span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-600">{item.tag}</span><p className="mt-2 text-base font-semibold leading-7 text-slate-600">{item.text}</p></div></div></div>)}</div></div>}
        </main>
        {proofPreview && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4 backdrop-blur-sm"><div className="w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl"><div className="flex items-start justify-between gap-4 bg-slate-900 p-5 text-white"><div><p className="text-sm font-bold text-white/60">学习证据预览</p><h3 className="mt-1 text-2xl font-black">{proofPreview.playerName} · {proofPreview.taskTitle}</h3><p className="mt-1 text-sm font-semibold text-white/60">文件：{proofPreview.proofName}</p></div><button onClick={() => setProofPreview(null)} className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-black hover:bg-white/20">关闭</button></div><div className="p-5">{proofPreview.proofUrl ? <img src={proofPreview.proofUrl} alt="上传的学习证据" className="max-h-[70vh] w-full rounded-3xl object-contain bg-slate-100" /> : <div className="grid min-h-80 place-items-center rounded-3xl bg-slate-100 p-8 text-center">没有照片链接</div>}</div></div></div>}
      </div>
    </div>
  );
}
