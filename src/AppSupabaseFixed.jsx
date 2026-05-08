import React, { useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from './supabaseClient.js';

const PLAYERS = [
  { name: '纪沿如', slug: 'jiyanru', avatar: '🦊', target: 'IELTS 7.0', color: 'from-sky-400 to-cyan-300' },
  { name: '李姝娴', slug: 'lishuxian', avatar: '🐰', target: 'IELTS 7.0', color: 'from-pink-400 to-orange-300' },
];

const emptyLists = () => ({ '纪沿如': [], '李姝娴': [] });
const todayKey = () => new Date().toISOString().slice(0, 10);
const cn = (...items) => items.filter(Boolean).join(' ');
const playerSlug = (name) => PLAYERS.find((p) => p.name === name)?.slug || 'unknown';

function isoDaysBack(count) {
  return Array.from({ length: count }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - 1 - index));
    return date.toISOString().slice(0, 10);
  });
}

function prettyDate(iso) {
  const date = new Date(`${iso}T00:00:00`);
  return {
    key: iso,
    date: `${date.getMonth() + 1}/${date.getDate()}`,
    week: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()],
    today: iso === todayKey(),
  };
}

function parseList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch {
    return [String(value)];
  }
}

function proofLabel(names) {
  if (!names.length) return '';
  return names.length === 1 ? names[0] : `${names.length} 张照片`;
}

function rowToTask(row) {
  const proofNames = parseList(row.proof_name);
  const proofUrls = parseList(row.proof_url);
  return {
    id: row.id,
    title: row.title,
    taskDate: row.task_date,
    done: Boolean(row.done),
    proofNames,
    proofUrls,
    proofName: proofLabel(proofNames),
    proofUrl: proofUrls[0] || '',
  };
}

function statusFor(percent) {
  if (percent >= 100) return { text: '今日超神', cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' };
  if (percent >= 75) return { text: '差一点封神', cls: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500' };
  if (percent >= 50) return { text: '还在挣扎', cls: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' };
  return { text: '今天摸鱼了', cls: 'bg-rose-100 text-rose-700', dot: 'bg-rose-400' };
}

function safeFileName(name) {
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : 'jpg';
  return `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext.replace(/[^a-z0-9]/g, '') || 'jpg'}`;
}

function groupTasksByPlayer(rows) {
  const next = emptyLists();
  (rows || []).forEach((row) => next[row.player_name]?.push(rowToTask(row)));
  return next;
}

function buildHistory(rows) {
  const days = isoDaysBack(28);
  const result = {};
  PLAYERS.forEach((player) => {
    result[player.name] = days.map((day) => {
      const dayTasks = (rows || []).filter((row) => row.player_name === player.name && row.task_date === day);
      const done = dayTasks.filter((row) => row.proof_name || row.done).length;
      const percent = dayTasks.length ? Math.round((done / dayTasks.length) * 100) : 0;
      return { ...prettyDate(day), taskCount: dayTasks.length, doneCount: done, percent };
    });
  });
  return result;
}

function calcStreak(historyRows) {
  let streak = 0;
  for (let i = historyRows.length - 1; i >= 0; i -= 1) {
    const row = historyRows[i];
    if (row.taskCount > 0 && row.percent === 100) streak += 1;
    else break;
  }
  return streak;
}

function SectionTitle({ icon, title, desc }) {
  return <div className="mb-5 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-900 text-2xl text-white shadow-lg">{icon}</div><div><h2 className="text-2xl font-black text-slate-900">{title}</h2><p className="text-sm font-semibold text-slate-500">{desc}</p></div></div>;
}

function Progress({ value }) {
  return <div className="h-3 overflow-hidden rounded-full bg-white/70"><div className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-sky-300 transition-all duration-700" style={{ width: `${Math.min(value, 100)}%` }} /></div>;
}

function PlayerCard({ stat }) {
  return <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white/75 p-5 shadow-xl shadow-sky-100"><div className={cn('absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-70 blur-2xl', stat.color)} /><div className="relative flex items-center gap-3"><div className="grid h-16 w-16 place-items-center rounded-3xl bg-white text-4xl shadow-inner">{stat.avatar}</div><div><h3 className="text-xl font-black text-slate-800">{stat.name}</h3><p className="text-sm font-semibold text-slate-500">目标：{stat.target}</p></div></div><div className="relative mt-5 rounded-3xl bg-orange-50 p-5 text-center"><p className="text-3xl">🔥</p><p className="mt-2 text-3xl font-black text-slate-800">{stat.streak}天</p><p className="text-sm font-bold text-slate-500">连续打卡 · 今日 {stat.percent}%</p></div></div>;
}

function CheckTable({ stat, rows }) {
  const recentRows = rows.slice(-7);
  const fullDays = rows.filter((row) => row.taskCount > 0 && row.percent === 100).length;
  const activeDays = rows.filter((row) => row.taskCount > 0);
  const average = activeDays.length ? Math.round(activeDays.reduce((sum, row) => sum + row.percent, 0) / activeDays.length) : 0;
  return <div className="rounded-[2rem] border border-white bg-white/80 p-5 shadow-xl shadow-sky-100"><div className="mb-5 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-14 w-14 place-items-center rounded-3xl bg-slate-100 text-4xl">{stat.avatar}</div><div><h3 className="text-2xl font-black text-slate-900">{stat.name} 的打卡状况</h3><p className="text-sm font-bold text-slate-500">最近 7 天真实记录</p></div></div><div className="rounded-2xl bg-slate-900 px-4 py-3 text-right text-white"><p className="text-xs font-bold text-white/60">平均完成</p><p className="text-2xl font-black">{average}%</p></div></div><div className="mb-4 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-emerald-50 p-3"><p className="text-xs font-black text-emerald-600">近 28 天全勤</p><p className="text-2xl font-black text-slate-900">{fullDays} 天</p></div><div className="rounded-2xl bg-orange-50 p-3"><p className="text-xs font-black text-orange-600">连续打卡</p><p className="text-2xl font-black text-slate-900">{stat.streak} 天</p></div></div><div className="overflow-hidden rounded-3xl border border-slate-100 bg-white"><div className="grid grid-cols-[1fr_0.9fr_1.1fr] bg-slate-50 px-4 py-3 text-xs font-black text-slate-500"><span>日期</span><span>完成度</span><span>状态</span></div>{recentRows.map((r) => { const s = statusFor(r.percent); return <div key={r.key} className="grid grid-cols-[1fr_0.9fr_1.1fr] items-center border-t border-slate-100 px-4 py-3 text-sm font-bold text-slate-700"><div><p className="font-black text-slate-900">{r.date}</p><p className="text-xs text-slate-400">周{r.week}{r.today ? ' · 今天' : ''}</p></div><div className="flex items-center gap-2"><span className={cn('h-2.5 w-2.5 rounded-full', s.dot)} /><span>{r.percent}%</span></div><span className={cn('w-fit rounded-full px-3 py-1 text-xs font-black', s.cls)}>{r.taskCount ? s.text : '暂无任务'}</span></div>; })}</div></div>;
}

function TaskBoard({ player, tasks, draft, editing, selectedIds, setDraft, addTask, toggleEdit, editTask, uploadProof, clearProof, viewProof, toggleSelect, deleteSelected }) {
  const doneCount = tasks.filter((task) => task.proofName).length;
  const percent = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  return <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white/80 p-5 shadow-xl shadow-sky-100"><div className={cn('absolute -right-12 -top-12 h-36 w-36 rounded-full bg-gradient-to-br opacity-60 blur-2xl', player.color)} /><div className="relative flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-16 w-16 place-items-center rounded-3xl bg-white text-4xl shadow-inner">{player.avatar}</div><div><h3 className="text-2xl font-black text-slate-900">{player.name} 的今日任务</h3><p className="text-sm font-bold text-slate-500">已上传 {doneCount} / {tasks.length} 个证据</p></div></div><div className="rounded-2xl bg-slate-900 px-4 py-3 text-right text-white"><p className="text-xs font-bold text-white/60">完成度</p><p className="text-2xl font-black">{percent}%</p></div></div><div className="relative mt-5"><Progress value={percent} /></div><div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-slate-50 p-3"><div><p className="text-sm font-black text-slate-900">{editing ? '正在编辑任务' : '普通模式'}</p><p className="text-xs font-bold text-slate-500">{editing ? '可以新增、修改、选择后删除' : '点击相机，可一次选择多张照片；上传后自动保存云端'}</p></div><div className="flex flex-wrap gap-2">{editing && <button onClick={() => deleteSelected(player.name)} disabled={!selectedIds.length} className="rounded-2xl bg-rose-100 px-4 py-3 text-sm font-black text-rose-600 disabled:opacity-40">删除已选 {selectedIds.length ? `(${selectedIds.length})` : ''}</button>}<button onClick={() => toggleEdit(player.name)} className={cn('rounded-2xl px-5 py-3 text-sm font-black', editing ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white')}>{editing ? '完成' : '编辑'}</button></div></div>{editing && <div className="relative mt-4 flex flex-col gap-3 sm:flex-row"><input value={draft} onChange={(e) => setDraft(player.name, e.target.value)} placeholder={`给${player.name}添加一个任务，比如：听写 20 个单词`} className="min-w-0 flex-1 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-300" /><button onClick={() => addTask(player.name)} className="rounded-2xl bg-yellow-300 px-5 py-3 text-sm font-black text-slate-900">添加新任务</button></div>}<div className="relative mt-5 space-y-3">{tasks.length === 0 && <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white/70 p-6 text-center"><p className="text-3xl">📅</p><p className="mt-2 text-lg font-black text-slate-900">今天还没有任务</p><p className="mt-1 text-sm font-bold text-slate-500">点“编辑”添加今天任务，或者用上方按钮复制昨天任务。</p></div>}{tasks.map((task) => { const selected = selectedIds.includes(task.id); return <div key={task.id} className={cn('rounded-[1.5rem] border p-4 transition', selected ? 'border-rose-200 bg-rose-50' : 'border-slate-100 bg-slate-50')}><div className="flex items-center gap-3">{editing ? <button onClick={() => toggleSelect(player.name, task.id)} className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl font-black', selected ? 'bg-rose-500 text-white' : 'bg-white text-slate-400')}>{selected ? '−' : '○'}</button> : task.proofName ? <button onClick={() => viewProof(player.name, task)} className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-emerald-100 text-xl font-black text-emerald-600">{task.proofUrl ? <img src={task.proofUrl} alt="学习证据" className="h-full w-full object-cover" /> : '✓'}</button> : <label className="grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-2xl bg-yellow-100 text-xl font-black text-amber-600">📷<input type="file" accept="image/*" multiple className="hidden" onChange={(event) => { uploadProof(player.name, task.id, Array.from(event.target.files || [])); event.target.value = ''; }} /></label>}<div className="min-w-0 flex-1"><input value={task.title} readOnly={!editing} onChange={(e) => editTask(player.name, task.id, e.target.value)} className={cn('w-full rounded-xl px-3 py-2 text-base font-black text-slate-900 outline-none', editing ? 'bg-white focus:ring-2 focus:ring-sky-200' : 'bg-transparent cursor-default', task.done && !editing ? 'line-through decoration-2 opacity-60' : '')} /><div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">{task.proofName ? <button onClick={() => viewProof(player.name, task)} className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">已上传：{task.proofName} · 点击查看</button> : <span className="rounded-full bg-yellow-100 px-2 py-1 text-yellow-700">未上传证据</span>}</div>{!editing && task.proofName && <button onClick={() => clearProof(player.name, task.id)} className="mt-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">取消完成</button>}</div></div></div>; })}</div></div>;
}

export default function IELTSBattleRoom() {
  const [tab, setTab] = useState('home');
  const [taskLists, setTaskLists] = useState(emptyLists());
  const [historyRows, setHistoryRows] = useState([]);
  const [taskDrafts, setTaskDrafts] = useState({ '纪沿如': '', '李姝娴': '' });
  const [editingTasks, setEditingTasks] = useState({ '纪沿如': false, '李姝娴': false });
  const [selectedTaskIds, setSelectedTaskIds] = useState({ '纪沿如': [], '李姝娴': [] });
  const [proofPreview, setProofPreview] = useState(null);
  const [statusMessage, setStatusMessage] = useState(isSupabaseConfigured ? '正在连接 Supabase...' : '尚未配置 Supabase，当前只能本地测试。');

  async function loadData() {
    if (!isSupabaseConfigured) return;
    const start = isoDaysBack(28)[0];
    const { data, error } = await supabase.from('tasks').select('*').gte('task_date', start).lte('task_date', todayKey()).order('task_date', { ascending: true }).order('created_at', { ascending: true });
    if (error) { setStatusMessage(`数据库读取失败：${error.message}`); return; }
    setHistoryRows(data || []);
    setTaskLists(groupTasksByPlayer((data || []).filter((row) => row.task_date === todayKey())));
    setStatusMessage('已连接 Supabase。今天是新的任务房间，历史打卡会保留。');
  }

  useEffect(() => {
    loadData();
    if (!isSupabaseConfigured) return;
    const channel = supabase.channel('tasks-live').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, loadData).subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  function updateLocalTask(playerName, taskId, updater) {
    setTaskLists((current) => ({ ...current, [playerName]: (current[playerName] || []).map((task) => task.id === taskId ? updater(task) : task) }));
  }

  async function addTask(playerName, titleArg) {
    const title = (titleArg || taskDrafts[playerName]).trim();
    if (!title) return;
    setTaskDrafts((cur) => ({ ...cur, [playerName]: titleArg ? cur[playerName] : '' }));
    if (!isSupabaseConfigured) return;
    setStatusMessage('正在保存今天的新任务...');
    const { error } = await supabase.from('tasks').insert({ player_name: playerName, title, reward: 'Custom +1', task_date: todayKey() });
    if (error) { setStatusMessage(`新增任务失败：${error.message}`); return; }
    await loadData();
    setStatusMessage('今天的新任务已保存。');
  }

  async function copyYesterdayTasks() {
    if (!isSupabaseConfigured) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = yesterday.toISOString().slice(0, 10);
    const { data, error } = await supabase.from('tasks').select('player_name,title').eq('task_date', yKey).order('created_at', { ascending: true });
    if (error) { setStatusMessage(`复制失败：${error.message}`); return; }
    if (!data?.length) { setStatusMessage('昨天没有任务可以复制。'); return; }
    const inserts = data.map((row) => ({ player_name: row.player_name, title: row.title, reward: 'Custom +1', task_date: todayKey(), done: false, proof_name: null, proof_url: null }));
    const inserted = await supabase.from('tasks').insert(inserts);
    if (inserted.error) { setStatusMessage(`复制失败：${inserted.error.message}`); return; }
    await loadData();
    setStatusMessage('已把昨天任务复制到今天，可以开始新一天打卡。');
  }

  async function uploadProof(playerName, taskId, files) {
    if (!files.length) return;
    if (!isSupabaseConfigured) { setStatusMessage('尚未配置 Supabase，无法永久保存照片。'); return; }
    const taskTitle = (taskLists[playerName] || []).find((task) => task.id === taskId)?.title || '学习任务';
    const names = files.map((f) => f.name);
    const localUrls = files.map((f) => URL.createObjectURL(f));
    const label = proofLabel(names);
    updateLocalTask(playerName, taskId, (task) => ({ ...task, done: true, proofName: label, proofNames: names, proofUrl: localUrls[0], proofUrls: localUrls }));
    setProofPreview({ playerName, taskTitle, proofName: label, proofNames: names, proofUrl: localUrls[0], proofUrls: localUrls });
    setStatusMessage(`正在保存 ${files.length} 张照片，请不要立刻刷新...`);
    const urls = [];
    for (const file of files) {
      const path = `${todayKey()}/${playerSlug(playerName)}/${taskId}/${safeFileName(file.name)}`;
      const uploaded = await supabase.storage.from('task-proofs').upload(path, file, { upsert: false, contentType: file.type || 'image/jpeg' });
      if (uploaded.error) { setStatusMessage(`照片上传失败：${uploaded.error.message}`); updateLocalTask(playerName, taskId, (task) => ({ ...task, done: false, proofName: '', proofNames: [], proofUrl: '', proofUrls: [] })); return; }
      const { data } = supabase.storage.from('task-proofs').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    const { error } = await supabase.from('tasks').update({ done: true, proof_name: JSON.stringify(names), proof_url: JSON.stringify(urls), updated_at: new Date().toISOString() }).eq('id', taskId);
    if (error) { setStatusMessage(`照片已上传，但数据库保存失败：${error.message}`); return; }
    await loadData();
    setStatusMessage(`${files.length} 张照片已保存到云端，今天打卡进度已更新。`);
  }

  async function clearProof(playerName, taskId) {
    updateLocalTask(playerName, taskId, (task) => ({ ...task, done: false, proofName: '', proofNames: [], proofUrl: '', proofUrls: [] }));
    if (isSupabaseConfigured) { await supabase.from('tasks').update({ done: false, proof_name: null, proof_url: null, updated_at: new Date().toISOString() }).eq('id', taskId); await loadData(); }
  }

  async function editTask(playerName, taskId, title) {
    updateLocalTask(playerName, taskId, (task) => ({ ...task, title }));
    if (isSupabaseConfigured) await supabase.from('tasks').update({ title, updated_at: new Date().toISOString() }).eq('id', taskId);
  }

  function toggleEdit(name) { setEditingTasks((cur) => ({ ...cur, [name]: !cur[name] })); setSelectedTaskIds((cur) => ({ ...cur, [name]: [] })); }
  function toggleSelect(name, id) { setSelectedTaskIds((cur) => { const ids = cur[name] || []; return { ...cur, [name]: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] }; }); }
  async function deleteSelected(name) { const ids = selectedTaskIds[name] || []; if (!ids.length) return; setTaskLists((cur) => ({ ...cur, [name]: cur[name].filter((t) => !ids.includes(t.id)) })); setSelectedTaskIds((cur) => ({ ...cur, [name]: [] })); if (isSupabaseConfigured) { await supabase.from('tasks').delete().in('id', ids); await loadData(); } }
  function viewProof(playerName, task) { setProofPreview({ playerName, taskTitle: task.title, proofName: task.proofName, proofNames: task.proofNames || [], proofUrl: task.proofUrl || '', proofUrls: task.proofUrls || [] }); }

  const history = useMemo(() => buildHistory(historyRows), [historyRows]);
  const stats = useMemo(() => PLAYERS.map((p) => { const tasks = taskLists[p.name] || []; const done = tasks.filter((t) => t.proofName).length; const percent = tasks.length ? Math.round(done / tasks.length * 100) : 0; return { ...p, doneCount: done, taskCount: tasks.length, percent, streak: calcStreak(history[p.name] || []) }; }), [taskLists, history]);
  const isTie = stats[0].percent === stats[1].percent;
  const leader = stats[0].percent >= stats[1].percent ? stats[0] : stats[1];
  const loser = isTie ? null : stats[0].percent < stats[1].percent ? stats[0] : stats[1];
  const bothNoTasks = stats.every((s) => s.taskCount === 0);
  const badges = bothNoTasks ? [{ label: '今日任务王', owner: '待产生', icon: '👑' }, { label: '连续打卡王', owner: '待产生', icon: '🔥' }, { label: '请饭预警', owner: '待产生', icon: '🍽️' }] : [{ label: '今日任务王', owner: leader.name, icon: '👑' }, { label: '连续打卡王', owner: stats[0].streak >= stats[1].streak ? stats[0].name : stats[1].name, icon: '🔥' }, { label: '请饭预警', owner: isTie ? '暂时没有' : loser.name, icon: '🍽️' }];
  const wall = bothNoTasks ? [{ name: '系统监督员', avatar: '🤖', tag: '新的一天', text: '今天还没有任务。可以手动添加，也可以复制昨天任务后重新打卡。' }] : [...stats.map((s) => ({ name: s.name, avatar: s.avatar, text: `今天已上传 ${s.doneCount} / ${s.taskCount} 个学习证据，任务完成率 ${s.percent}%。`, tag: s.percent === 100 ? '今日超神' : s.percent >= 50 ? '还可以再冲' : '请饭危险区' })), { name: '系统监督员', avatar: '🤖', tag: '实时监督', text: isTie ? '目前两个人任务完成度持平。' : `${leader.name} 目前领先，${loser.name} 暂时落后。今天结束时完成度低的人，明天请对方吃饭。` }];
  const tabs = [{ key: 'home', label: '首页', icon: '🏆' }, { key: 'tasks', label: '任务房间', icon: '🎯' }, { key: 'wall', label: '监督墙', icon: '💬' }];

  return <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dff7ff,transparent_35%),radial-gradient(circle_at_top_right,#fff2b8,transparent_35%),linear-gradient(135deg,#f8fbff,#fff7fb)] p-4 text-slate-800 md:p-8"><div className="mx-auto max-w-7xl"><header className="rounded-[2.5rem] border border-white bg-white/70 p-6 shadow-2xl shadow-sky-100 md:p-8"><div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white">⚡ IELTS Duo Battle Room</div><h1 className="text-4xl font-black text-slate-900 md:text-6xl">雅思双人监督局</h1><p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-slate-600 md:text-lg">每天都是新的任务房间；历史打卡保留，连续打卡自动计算。</p></div><div className="rounded-[2rem] bg-slate-900 p-5 text-white md:min-w-72"><p className="text-sm font-bold text-white/60">今日战况</p><div className="mt-2 flex items-center gap-3"><div className="text-4xl">{leader.avatar}</div><div><p className="text-2xl font-black">{bothNoTasks ? '等待开局' : isTie ? '目前持平' : `${leader.name} 今日领先`}</p><p className="text-sm font-semibold text-white/70">{bothNoTasks ? '添加今天任务后开始计算' : isTie ? `双方任务完成度都是 ${leader.percent}%` : `任务完成度：${leader.percent}% · 落后者请吃饭：${loser.name}`}</p></div></div></div></div></header><div className="mt-4 rounded-2xl bg-white/80 p-3 text-sm font-bold text-slate-600 shadow">{statusMessage}</div><nav className="sticky top-3 z-10 mt-5 overflow-x-auto rounded-[2rem] border border-white bg-white/75 p-2 shadow-xl"><div className="flex min-w-max gap-2">{tabs.map((t) => <button key={t.key} onClick={() => setTab(t.key)} className={cn('flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black', tab === t.key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100')}><span>{t.icon}</span>{t.label}</button>)}</div></nav><main className="mt-6">{tab === 'home' && <div className="space-y-6"><div className="grid gap-5 md:grid-cols-2">{stats.map((s) => <PlayerCard key={s.name} stat={s} />)}</div><div className="rounded-[2rem] border border-white bg-white/75 p-5 shadow-xl"><SectionTitle icon="📅" title="每日任务系统" desc="第二天自动进入新的打卡日" /><div className="grid gap-3 md:grid-cols-3"><div className="rounded-3xl bg-slate-900 p-5 text-white"><p className="text-sm font-bold text-white/60">今天日期</p><p className="mt-1 text-2xl font-black">{todayKey()}</p></div><button onClick={copyYesterdayTasks} className="rounded-3xl bg-yellow-300 p-5 text-left text-slate-900 hover:bg-yellow-200"><p className="text-sm font-black opacity-60">快捷操作</p><p className="mt-1 text-2xl font-black">复制昨天任务到今天</p></button><div className="rounded-3xl bg-sky-50 p-5"><p className="text-sm font-black text-sky-600">规则</p><p className="mt-1 text-lg font-black text-slate-900">今天上传只算今天，明天重新打卡。</p></div></div></div><div className="grid gap-5 lg:grid-cols-2">{stats.map((s) => <CheckTable key={s.name} stat={s} rows={history[s.name] || isoDaysBack(28).map((d) => ({ ...prettyDate(d), taskCount: 0, doneCount: 0, percent: 0 }))} />)}</div><div className="rounded-[2rem] border border-white bg-white/75 p-5 shadow-xl"><SectionTitle icon="👑" title="今日称号榜" desc="上传证据后自动更新" /><div className="grid gap-3 md:grid-cols-3">{badges.map((b) => <div key={b.label} className="rounded-3xl bg-slate-50 p-4 text-center"><p className="text-3xl">{b.icon}</p><p className="mt-2 text-sm font-black text-slate-500">{b.label}</p><p className="text-xl font-black text-slate-900">{b.owner}</p></div>)}</div></div></div>}{tab === 'tasks' && <div className="space-y-5"><div className="rounded-[2rem] border border-white bg-white/75 p-5 shadow-xl"><SectionTitle icon="🎯" title="今天的任务房间" desc="今天没有任务就新增，或者复制昨天任务" /><button onClick={copyYesterdayTasks} className="rounded-2xl bg-yellow-300 px-5 py-3 text-sm font-black text-slate-900 hover:bg-yellow-200">复制昨天任务到今天</button></div><div className="grid gap-5 lg:grid-cols-2">{PLAYERS.map((p) => <TaskBoard key={p.name} player={p} tasks={taskLists[p.name] || []} draft={taskDrafts[p.name] || ''} editing={editingTasks[p.name] || false} selectedIds={selectedTaskIds[p.name] || []} setDraft={(name, value) => setTaskDrafts((cur) => ({ ...cur, [name]: value }))} addTask={addTask} toggleEdit={toggleEdit} editTask={editTask} uploadProof={uploadProof} clearProof={clearProof} viewProof={viewProof} toggleSelect={toggleSelect} deleteSelected={deleteSelected} />)}</div></div>}{tab === 'wall' && <div className="rounded-[2rem] border border-white bg-white/75 p-5 shadow-xl"><SectionTitle icon="💬" title="双人监督墙" desc="自动读取今日任务完成度" /><div className="space-y-4">{wall.map((item, i) => <div key={i} className="rounded-[1.7rem] bg-white p-5 shadow"><div className="flex gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-3xl">{item.avatar}</div><div><h3 className="text-lg font-black text-slate-900">{item.name}</h3><span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-600">{item.tag}</span><p className="mt-2 font-semibold leading-7 text-slate-600">{item.text}</p></div></div></div>)}</div></div>}</main>{proofPreview && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4 backdrop-blur-sm"><div className="w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl"><div className="flex items-start justify-between gap-4 bg-slate-900 p-5 text-white"><div><p className="text-sm font-bold text-white/60">学习证据预览</p><h3 className="mt-1 text-2xl font-black">{proofPreview.playerName} · {proofPreview.taskTitle}</h3><p className="mt-1 text-sm font-semibold text-white/60">{proofPreview.proofName}</p></div><button onClick={() => setProofPreview(null)} className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-black">关闭</button></div><div className="max-h-[78vh] overflow-y-auto p-5">{(proofPreview.proofUrls || []).length ? <div className="grid gap-4 md:grid-cols-2">{proofPreview.proofUrls.map((url, i) => <div key={i} className="rounded-3xl bg-slate-100 p-2"><img src={url} alt={`学习证据 ${i + 1}`} className="max-h-[60vh] w-full rounded-2xl object-contain" /><p className="mt-2 text-center text-xs font-bold text-slate-500">第 {i + 1} 张</p></div>)}</div> : <div className="grid min-h-80 place-items-center rounded-3xl bg-slate-100 p-8 text-center">没有照片链接</div>}</div></div></div>}</div></div>;
}
