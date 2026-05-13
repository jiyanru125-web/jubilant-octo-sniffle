import React, { useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from './supabaseClient.js';

const PLAYERS = [
  { name: '纪沿如', slug: 'jiyanru', avatar: '🦊', target: 'IELTS 7.0', color: 'from-sky-400 to-cyan-300' },
  { name: '李姝娴', slug: 'lishuxian', avatar: '🐰', target: 'IELTS 7.0', color: 'from-pink-400 to-orange-300' },
];

const emptyLists = () => ({ '纪沿如': [], '李姝娴': [] });
const cn = (...xs) => xs.filter(Boolean).join(' ');
const playerSlug = (name) => PLAYERS.find((p) => p.name === name)?.slug || 'unknown';

function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function daysBack(count, endKey = todayKey()) {
  const end = new Date(`${endKey}T00:00:00`);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(end);
    date.setDate(end.getDate() - (count - 1 - index));
    return todayKey(date);
  });
}
function pretty(iso) {
  const date = new Date(`${iso}T00:00:00`);
  return { key: iso, date: `${date.getMonth() + 1}/${date.getDate()}`, week: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()], today: iso === todayKey(), dow: date.getDay() };
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
function safeName(name) {
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') : 'jpg';
  return `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext || 'jpg'}`;
}
function isRealImageUrl(url) {
  return url && !['uploading', 'upload_failed'].includes(url);
}
function toTask(row) {
  const proofNames = parseList(row.proof_name);
  const proofUrls = parseList(row.proof_url);
  const firstRealUrl = proofUrls.find(isRealImageUrl) || '';
  return { id: row.id, title: row.title, done: Boolean(row.done), proofNames, proofUrls, proofName: proofLabel(proofNames), proofUrl: firstRealUrl, uploadState: proofUrls.includes('uploading') ? 'uploading' : proofUrls.includes('upload_failed') ? 'failed' : 'done' };
}
function statusText(percent, hasTask) {
  if (!hasTask) return '今天还没开局，任务在等你召唤。';
  if (percent === 100) return '全部完成，今日学习火花 +1！';
  if (percent >= 75) return '差一点封神，再补一个证据就很帅。';
  if (percent >= 50) return '已经过半，属于边挣扎边前进。';
  if (percent > 0) return '刚刚启动，还不能算摸鱼成功。';
  return '今天还没动，系统已经开始盯你了。';
}
function pill(percent, hasTask) {
  if (!hasTask) return 'bg-slate-100 text-slate-500';
  if (percent === 100) return 'bg-emerald-100 text-emerald-700';
  if (percent >= 75) return 'bg-sky-100 text-sky-700';
  if (percent >= 50) return 'bg-yellow-100 text-yellow-700';
  return 'bg-rose-100 text-rose-700';
}

async function compressImage(file, maxSide = 1280, quality = 0.68) {
  if (!file.type?.startsWith('image/')) return file;
  const bitmapUrl = URL.createObjectURL(file);
  const img = new Image();
  img.src = bitmapUrl;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(bitmapUrl);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
}

function makeHistory(rows, currentDate) {
  const dates = daysBack(30, currentDate);
  const result = {};
  PLAYERS.forEach((player) => {
    result[player.name] = dates.map((day) => {
      const tasks = rows.filter((row) => row.player_name === player.name && row.task_date === day);
      const done = tasks.filter((row) => row.done || row.proof_name).length;
      const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
      return { ...pretty(day), taskCount: tasks.length, doneCount: done, percent };
    });
  });
  return result;
}
function flameCount(rows) {
  return rows.filter((row) => row.taskCount > 0 && row.percent === 100).length;
}
function currentStreak(rows) {
  let count = 0;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i].taskCount > 0 && rows[i].percent === 100) count += 1;
    else break;
  }
  return count;
}
function weekReports(history) {
  const base = history[PLAYERS[0].name] || [];
  return base.map((day, index) => ({ day, index })).filter(({ day, index }) => day.dow === 0 || index === base.length - 1).slice(-5).map(({ index }) => {
    const start = Math.max(0, index - 6);
    const label = `${base[start]?.date} - ${base[index]?.date}`;
    const players = PLAYERS.map((player) => {
      const rows = (history[player.name] || []).slice(start, index + 1).filter((row) => row.taskCount > 0);
      const avg = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.percent, 0) / rows.length) : 0;
      return { ...player, avg, activeDays: rows.length, fullDays: rows.filter((row) => row.percent === 100).length };
    });
    const winner = players[0].avg === players[1].avg ? null : players[0].avg > players[1].avg ? players[0] : players[1];
    return { label, players, winner };
  });
}

function SectionTitle({ icon, title, desc }) {
  return <div className="mb-5 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-900 text-2xl text-white">{icon}</div><div><h2 className="text-2xl font-black text-slate-900">{title}</h2><p className="text-sm font-semibold text-slate-500">{desc}</p></div></div>;
}
function Progress({ value }) {
  return <div className="h-3 overflow-hidden rounded-full bg-white/70"><div className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-sky-300 transition-all" style={{ width: `${Math.min(value, 100)}%` }} /></div>;
}
function PlayerCard({ stat }) {
  return <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white/75 p-5 shadow-xl shadow-sky-100"><div className={cn('absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-70 blur-2xl', stat.color)} /><div className="relative flex items-center gap-3"><div className="grid h-16 w-16 place-items-center rounded-3xl bg-white text-4xl">{stat.avatar}</div><div><h3 className="text-xl font-black text-slate-800">{stat.name}</h3><p className="text-sm font-semibold text-slate-500">目标：{stat.target}</p></div></div><div className="relative mt-5 grid grid-cols-2 gap-3"><div className="rounded-3xl bg-orange-50 p-5 text-center"><p className="text-3xl">🔥</p><p className="mt-2 text-3xl font-black text-slate-800">{stat.flames}</p><p className="text-sm font-bold text-slate-500">累计火花</p></div><div className="rounded-3xl bg-sky-50 p-5 text-center"><p className="text-3xl">⚡</p><p className="mt-2 text-3xl font-black text-slate-800">{stat.percent}%</p><p className="text-sm font-bold text-slate-500">今日完成</p></div></div></div>;
}
function HistoryBar({ row }) {
  const hasTask = row.taskCount > 0;
  return <div className="rounded-3xl bg-white p-3 shadow-sm"><div className="mb-2 flex items-center justify-between gap-3"><div className="shrink-0"><p className="font-black text-slate-900">{row.date}{row.today ? ' · 今天' : ''}</p><p className="text-xs font-bold text-slate-400">周{row.week} · {row.doneCount}/{row.taskCount || 0} 个任务</p></div><span className={cn('rounded-full px-3 py-1 text-xs font-black', pill(row.percent, hasTask))}>{hasTask ? `${row.percent}%` : '未开始'}</span></div><div className="flex items-center gap-3"><div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-yellow-300 via-sky-300 to-emerald-300" style={{ width: `${row.percent}%` }} /></div><p className="w-40 text-xs font-bold text-slate-500 md:w-56">{statusText(row.percent, hasTask)}</p></div></div>;
}
function MonthlyBars({ stat, rows }) {
  const [open, setOpen] = useState(false);
  const active = rows.filter((row) => row.taskCount > 0);
  const avg = active.length ? Math.round(active.reduce((sum, row) => sum + row.percent, 0) / active.length) : 0;
  const visible = open ? rows : rows.slice(-7);
  return <div className="rounded-[2rem] border border-white bg-white/80 p-5 shadow-xl shadow-sky-100"><div className="mb-5 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-14 w-14 place-items-center rounded-3xl bg-slate-100 text-4xl">{stat.avatar}</div><div><h3 className="text-2xl font-black text-slate-900">{stat.name} 的打卡条</h3><p className="text-sm font-bold text-slate-500">默认最近 7 天，展开看最近 30 天</p></div></div><div className="rounded-2xl bg-slate-900 px-4 py-3 text-right text-white"><p className="text-xs font-bold text-white/60">平均完成</p><p className="text-2xl font-black">{avg}%</p></div></div><div className="mb-4 grid grid-cols-3 gap-3"><div className="rounded-2xl bg-orange-50 p-3"><p className="text-xs font-black text-orange-600">累计火花</p><p className="text-2xl font-black text-slate-900">{stat.flames}</p></div><div className="rounded-2xl bg-emerald-50 p-3"><p className="text-xs font-black text-emerald-600">学习日</p><p className="text-2xl font-black text-slate-900">{active.length}</p></div><div className="rounded-2xl bg-sky-50 p-3"><p className="text-xs font-black text-sky-600">当前连击</p><p className="text-2xl font-black text-slate-900">{stat.streak}</p></div></div><div className="space-y-3">{visible.map((row) => <HistoryBar key={row.key} row={row} />)}</div><button onClick={() => setOpen(!open)} className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white hover:bg-slate-700">{open ? '收起，只看最近 7 天' : '展开查看最近 30 天'}</button></div>;
}
function Weekly({ reports }) {
  return <div className="rounded-[2rem] border border-white bg-white/75 p-5 shadow-xl shadow-sky-100"><SectionTitle icon="📊" title="周日总结对比" desc="每周天自动总结一次两个人的打卡情况" /><div className="space-y-3">{reports.map((report) => <div key={report.label} className="rounded-3xl bg-slate-50 p-4"><div className="mb-3 flex items-center justify-between"><p className="text-lg font-black text-slate-900">{report.label}</p><span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-amber-700">{report.winner ? `${report.winner.name} 本周领先` : '本周平局'}</span></div><div className="grid gap-3 md:grid-cols-2">{report.players.map((player) => <div key={player.name} className="rounded-2xl bg-white p-4"><div className="flex items-center gap-2"><span className="text-3xl">{player.avatar}</span><div><p className="font-black text-slate-900">{player.name}</p><p className="text-xs font-bold text-slate-500">学习 {player.activeDays} 天 · 火花 {player.fullDays} 个</p></div></div><p className="mt-3 text-3xl font-black text-slate-900">{player.avg}%</p><p className="text-xs font-bold text-slate-500">本周平均完成度</p></div>)}</div><p className="mt-3 text-sm font-bold text-slate-600">{report.winner ? `本周 ${report.winner.name} 更稳一点，另一个人下周小心请饭。` : '本周两个人势均力敌，继续卷。'}</p></div>)}</div></div>;
}
function TaskBoard({ player, tasks, draft, editing, selectedIds, setDraft, addTask, toggleEdit, editTask, uploadProof, clearProof, viewProof, toggleSelect, deleteSelected }) {
  const done = tasks.filter((task) => task.proofName).length;
  const percent = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  return <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white/80 p-5 shadow-xl shadow-sky-100"><div className={cn('absolute -right-12 -top-12 h-36 w-36 rounded-full bg-gradient-to-br opacity-60 blur-2xl', player.color)} /><div className="relative flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-16 w-16 place-items-center rounded-3xl bg-white text-4xl">{player.avatar}</div><div><h3 className="text-2xl font-black text-slate-900">{player.name} 的今日任务</h3><p className="text-sm font-bold text-slate-500">已完成 {done} / {tasks.length} 个任务</p></div></div><div className="rounded-2xl bg-slate-900 px-4 py-3 text-right text-white"><p className="text-xs font-bold text-white/60">完成度</p><p className="text-2xl font-black">{percent}%</p></div></div><div className="relative mt-5"><Progress value={percent} /></div><div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-slate-50 p-3"><div><p className="text-sm font-black text-slate-900">{editing ? '正在编辑任务' : '快速打卡模式'}</p><p className="text-xs font-bold text-slate-500">{editing ? '修改任务后，之后每天会沿用新版任务' : '选照片后先记完成，再压缩上传；不会因为照片慢导致计划失败'}</p></div><div className="flex flex-wrap gap-2">{editing && <button onClick={() => deleteSelected(player.name)} disabled={!selectedIds.length} className="rounded-2xl bg-rose-100 px-4 py-3 text-sm font-black text-rose-600 disabled:opacity-40">删除已选 {selectedIds.length ? `(${selectedIds.length})` : ''}</button>}<button onClick={() => toggleEdit(player.name)} className={cn('rounded-2xl px-5 py-3 text-sm font-black', editing ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white')}>{editing ? '完成' : '编辑'}</button></div></div>{editing && <div className="relative mt-4 flex flex-col gap-3 sm:flex-row"><input value={draft} onChange={(e) => setDraft(player.name, e.target.value)} placeholder={`给${player.name}添加一个任务`} className="min-w-0 flex-1 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-300" /><button onClick={() => addTask(player.name)} className="rounded-2xl bg-yellow-300 px-5 py-3 text-sm font-black text-slate-900">添加新任务</button></div>}<div className="relative mt-5 space-y-3">{tasks.length === 0 && <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white/70 p-6 text-center"><p className="text-3xl">📅</p><p className="mt-2 text-lg font-black text-slate-900">还没有固定任务</p><p className="mt-1 text-sm font-bold text-slate-500">点“编辑”添加任务，以后每天会自动沿用。</p></div>}{tasks.map((task) => { const selected = selectedIds.includes(task.id); const uploadTip = task.uploadState === 'uploading' ? '照片上传中，不影响完成度' : task.uploadState === 'failed' ? '照片待补传，任务已完成' : task.proofName ? '已完成' : '未上传证据'; return <div key={task.id} className={cn('rounded-[1.5rem] border p-4 transition', selected ? 'border-rose-200 bg-rose-50' : 'border-slate-100 bg-slate-50')}><div className="flex items-center gap-3">{editing ? <button onClick={() => toggleSelect(player.name, task.id)} className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl font-black', selected ? 'bg-rose-500 text-white' : 'bg-white text-slate-400')}>{selected ? '−' : '○'}</button> : task.proofName ? <button onClick={() => viewProof(player.name, task)} className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-emerald-100 text-xl font-black text-emerald-600">{task.proofUrl ? <img src={task.proofUrl} alt="学习证据" className="h-full w-full object-cover" /> : '✓'}</button> : <label className="grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-2xl bg-yellow-100 text-xl font-black text-amber-600">📷<input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { uploadProof(player.name, task.id, Array.from(e.target.files || [])); e.target.value = ''; }} /></label>}<div className="min-w-0 flex-1"><input value={task.title} readOnly={!editing} onChange={(e) => editTask(player.name, task.id, e.target.value)} className={cn('w-full rounded-xl px-3 py-2 text-base font-black text-slate-900 outline-none', editing ? 'bg-white focus:ring-2 focus:ring-sky-200' : 'bg-transparent cursor-default', task.done && !editing ? 'line-through decoration-2 opacity-60' : '')} /><div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">{task.proofName ? <button onClick={() => viewProof(player.name, task)} className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">{uploadTip}：{task.proofName} · 点击查看</button> : <span className="rounded-full bg-yellow-100 px-2 py-1 text-yellow-700">未上传证据</span>}</div>{!editing && task.proofName && <button onClick={() => clearProof(player.name, task.id)} className="mt-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">取消完成 / 重新上传</button>}</div></div></div>; })}</div></div>;
}

export default function IELTSBattleRoom() {
  const [tab, setTab] = useState('home');
  const [currentDate, setCurrentDate] = useState(todayKey());
  const [taskLists, setTaskLists] = useState(emptyLists());
  const [historyRows, setHistoryRows] = useState([]);
  const [taskDrafts, setTaskDrafts] = useState({ '纪沿如': '', '李姝娴': '' });
  const [editingTasks, setEditingTasks] = useState({ '纪沿如': false, '李姝娴': false });
  const [selectedTaskIds, setSelectedTaskIds] = useState({ '纪沿如': [], '李姝娴': [] });
  const [proofPreview, setProofPreview] = useState(null);
  const [statusMessage, setStatusMessage] = useState(isSupabaseConfigured ? '正在连接 Supabase...' : '尚未配置 Supabase，当前只能本地测试。');

  async function ensureToday(rows, today) {
    if (!isSupabaseConfigured || rows.some((row) => row.task_date === today)) return rows;
    const older = rows.filter((row) => row.task_date < today).sort((a, b) => b.task_date.localeCompare(a.task_date));
    const lastDay = older[0]?.task_date;
    if (!lastDay) return rows;
    const templates = older.filter((row) => row.task_date === lastDay);
    setStatusMessage(`已进入 ${pretty(today).date}，正在自动沿用 ${pretty(lastDay).date} 的任务...`);
    const inserts = templates.map((row) => ({ player_name: row.player_name, title: row.title, reward: 'Custom +1', task_date: today, done: false, proof_name: null, proof_url: null }));
    const { data, error } = await supabase.from('tasks').insert(inserts).select('*');
    if (error) { setStatusMessage(`自动沿用任务失败：${error.message}`); return rows; }
    return [...rows, ...(data || [])];
  }
  async function loadData() {
    if (!isSupabaseConfigured) return;
    const today = todayKey();
    setCurrentDate(today);
    const start = daysBack(45, today)[0];
    const { data, error } = await supabase.from('tasks').select('*').gte('task_date', start).lte('task_date', today).order('task_date', { ascending: true }).order('created_at', { ascending: true });
    if (error) { setStatusMessage(`数据库读取失败：${error.message}`); return; }
    const rows = await ensureToday(data || [], today);
    setHistoryRows(rows);
    const grouped = emptyLists();
    rows.filter((row) => row.task_date === today).forEach((row) => grouped[row.player_name]?.push(toTask(row)));
    setTaskLists(grouped);
    setStatusMessage(`已同步日期：今天是 ${pretty(today).date}。快速打卡模式已开启。`);
  }
  useEffect(() => {
    loadData();
    if (!isSupabaseConfigured) return;
    const channel = supabase.channel('tasks-live').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, loadData).subscribe();
    const timer = setInterval(() => { if (todayKey() !== currentDate) loadData(); }, 60000);
    return () => { supabase.removeChannel(channel); clearInterval(timer); };
  }, [currentDate]);

  function updateLocal(player, id, updater) {
    setTaskLists((current) => ({ ...current, [player]: (current[player] || []).map((task) => task.id === id ? updater(task) : task) }));
  }
  async function addTask(player) {
    const title = taskDrafts[player].trim();
    if (!title) return;
    setTaskDrafts((current) => ({ ...current, [player]: '' }));
    const { error } = await supabase.from('tasks').insert({ player_name: player, title, reward: 'Custom +1', task_date: todayKey() });
    if (error) { setStatusMessage(`新增任务失败：${error.message}`); return; }
    await loadData();
    setStatusMessage('任务已修改，以后每天会沿用新版任务。');
  }
  async function uploadProof(player, id, files) {
    if (!files.length) return;
    const today = todayKey();
    const taskTitle = (taskLists[player] || []).find((task) => task.id === id)?.title || '学习任务';
    const names = files.map((file) => file.name);
    const localUrls = files.map((file) => URL.createObjectURL(file));
    const proofName = proofLabel(names);

    updateLocal(player, id, (task) => ({ ...task, done: true, proofName, proofNames: names, proofUrl: localUrls[0], proofUrls: localUrls, uploadState: 'uploading' }));
    setProofPreview({ playerName: player, taskTitle, proofName, proofNames: names, proofUrl: localUrls[0], proofUrls: localUrls });
    setStatusMessage('已先记录完成，正在后台压缩并上传照片。现在刷新也不会影响今日完成度。');

    const quickSave = await supabase.from('tasks').update({ done: true, proof_name: JSON.stringify(names), proof_url: JSON.stringify(['uploading']), updated_at: new Date().toISOString() }).eq('id', id);
    if (quickSave.error) {
      setStatusMessage(`快速记录失败：${quickSave.error.message}`);
      return;
    }

    const urls = [];
    try {
      for (const file of files) {
        const compressed = await compressImage(file);
        const path = `${today}/${playerSlug(player)}/${id}/${safeFileName(compressed.name)}`;
        const uploaded = await supabase.storage.from('task-proofs').upload(path, compressed, { upsert: false, contentType: compressed.type || 'image/jpeg' });
        if (uploaded.error) throw uploaded.error;
        const { data } = supabase.storage.from('task-proofs').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      await supabase.from('tasks').update({ done: true, proof_name: JSON.stringify(names), proof_url: JSON.stringify(urls), updated_at: new Date().toISOString() }).eq('id', id);
      updateLocal(player, id, (task) => ({ ...task, proofUrl: urls[0], proofUrls: urls, uploadState: 'done' }));
      setStatusMessage(`${files.length} 张照片已压缩上传完成，任务已完成。`);
      await loadData();
    } catch (error) {
      await supabase.from('tasks').update({ done: true, proof_name: JSON.stringify(names), proof_url: JSON.stringify(['upload_failed']), updated_at: new Date().toISOString() }).eq('id', id);
      updateLocal(player, id, (task) => ({ ...task, uploadState: 'failed' }));
      setStatusMessage(`任务已完成，但照片上传失败，可晚点重新上传：${error.message || error}`);
      await loadData();
    }
  }
  async function clearProof(player, id) {
    updateLocal(player, id, (task) => ({ ...task, done: false, proofName: '', proofNames: [], proofUrl: '', proofUrls: [], uploadState: '' }));
    await supabase.from('tasks').update({ done: false, proof_name: null, proof_url: null, updated_at: new Date().toISOString() }).eq('id', id);
    await loadData();
  }
  async function editTask(player, id, title) {
    updateLocal(player, id, (task) => ({ ...task, title }));
    await supabase.from('tasks').update({ title, updated_at: new Date().toISOString() }).eq('id', id);
  }
  function toggleEdit(name) { setEditingTasks((current) => ({ ...current, [name]: !current[name] })); setSelectedTaskIds((current) => ({ ...current, [name]: [] })); }
  function toggleSelect(name, id) { setSelectedTaskIds((current) => { const list = current[name] || []; return { ...current, [name]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] }; }); }
  async function deleteSelected(name) {
    const ids = selectedTaskIds[name] || [];
    if (!ids.length) return;
    setTaskLists((current) => ({ ...current, [name]: current[name].filter((task) => !ids.includes(task.id)) }));
    setSelectedTaskIds((current) => ({ ...current, [name]: [] }));
    await supabase.from('tasks').delete().in('id', ids);
    await loadData();
    setStatusMessage('任务已删除，以后每天会沿用新版任务。');
  }
  function viewProof(playerName, task) {
    setProofPreview({ playerName, taskTitle: task.title, proofName: task.proofName, proofNames: task.proofNames || [], proofUrl: task.proofUrl || '', proofUrls: (task.proofUrls || []).filter(isRealImageUrl), uploadState: task.uploadState });
  }

  const history = useMemo(() => makeHistory(historyRows, currentDate), [historyRows, currentDate]);
  const reports = useMemo(() => weekReports(history), [history]);
  const stats = useMemo(() => PLAYERS.map((player) => {
    const tasks = taskLists[player.name] || [];
    const done = tasks.filter((task) => task.proofName).length;
    const percent = tasks.length ? Math.round(done / tasks.length * 100) : 0;
    const rows = history[player.name] || [];
    return { ...player, doneCount: done, taskCount: tasks.length, percent, flames: flameCount(rows), streak: currentStreak(rows) };
  }), [taskLists, history]);
  const isTie = stats[0].percent === stats[1].percent;
  const leader = stats[0].percent >= stats[1].percent ? stats[0] : stats[1];
  const loser = isTie ? null : stats[0].percent < stats[1].percent ? stats[0] : stats[1];
  const noTasks = stats.every((s) => s.taskCount === 0);
  const badges = noTasks ? [{ label: '今日任务王', owner: '待产生', icon: '👑' }, { label: '火花最多', owner: '待产生', icon: '🔥' }, { label: '请饭预警', owner: '待产生', icon: '🍽️' }] : [{ label: '今日任务王', owner: leader.name, icon: '👑' }, { label: '火花最多', owner: stats[0].flames >= stats[1].flames ? stats[0].name : stats[1].name, icon: '🔥' }, { label: '请饭预警', owner: isTie ? '暂时没有' : loser.name, icon: '🍽️' }];
  const wall = noTasks ? [{ name: '系统监督员', avatar: '🤖', tag: '固定任务', text: '还没有固定任务。添加一次后，之后每天都会自动沿用，只有修改时才变化。' }] : [...stats.map((s) => ({ name: s.name, avatar: s.avatar, text: `今天已完成 ${s.doneCount} / ${s.taskCount} 个任务，任务完成率 ${s.percent}%，累计火花 ${s.flames} 个。`, tag: s.percent === 100 ? '今日超神' : s.percent >= 50 ? '还可以再冲' : '请饭危险区' })), { name: '系统监督员', avatar: '🤖', tag: '实时监督', text: isTie ? '目前两个人任务完成度持平。' : `${leader.name} 目前领先，${loser.name} 暂时落后。今天结束时完成度低的人，明天请对方吃饭。` }];
  const tabs = [{ key: 'home', label: '首页', icon: '🏆' }, { key: 'tasks', label: '任务房间', icon: '🎯' }, { key: 'wall', label: '监督墙', icon: '💬' }];

  return <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dff7ff,transparent_35%),radial-gradient(circle_at_top_right,#fff2b8,transparent_35%),linear-gradient(135deg,#f8fbff,#fff7fb)] p-4 text-slate-800 md:p-8"><div className="mx-auto max-w-7xl"><header className="rounded-[2.5rem] border border-white bg-white/70 p-6 shadow-2xl shadow-sky-100 md:p-8"><div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white">⚡ IELTS Duo Battle Room</div><h1 className="text-4xl font-black text-slate-900 md:text-6xl">雅思双人监督局</h1><p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-slate-600 md:text-lg">今天是 {pretty(currentDate).date}。选照片后先完成打卡，再后台压缩上传。</p></div><div className="rounded-[2rem] bg-slate-900 p-5 text-white md:min-w-72"><p className="text-sm font-bold text-white/60">今日战况</p><div className="mt-2 flex items-center gap-3"><div className="text-4xl">{leader.avatar}</div><div><p className="text-2xl font-black">{noTasks ? '等待开局' : isTie ? '目前持平' : `${leader.name} 今日领先`}</p><p className="text-sm font-semibold text-white/70">{noTasks ? '添加固定任务后开始计算' : isTie ? `双方任务完成度都是 ${leader.percent}%` : `任务完成度：${leader.percent}% · 落后者请吃饭：${loser.name}`}</p></div></div></div></div></header><div className="mt-4 rounded-2xl bg-white/80 p-3 text-sm font-bold text-slate-600 shadow">{statusMessage}</div><nav className="sticky top-3 z-10 mt-5 overflow-x-auto rounded-[2rem] border border-white bg-white/75 p-2 shadow-xl"><div className="flex min-w-max gap-2">{tabs.map((tabItem) => <button key={tabItem.key} onClick={() => setTab(tabItem.key)} className={cn('flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black', tab === tabItem.key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100')}><span>{tabItem.icon}</span>{tabItem.label}</button>)}</div></nav><main className="mt-6">{tab === 'home' && <div className="space-y-6"><div className="grid gap-5 md:grid-cols-2">{stats.map((stat) => <PlayerCard key={stat.name} stat={stat} />)}</div><div className="grid gap-5 lg:grid-cols-2">{stats.map((stat) => <MonthlyBars key={stat.name} stat={stat} rows={history[stat.name] || []} />)}</div><Weekly reports={reports} /><div className="rounded-[2rem] border border-white bg-white/75 p-5 shadow-xl"><SectionTitle icon="👑" title="今日称号榜" desc="上传证据后自动更新" /><div className="grid gap-3 md:grid-cols-3">{badges.map((badge) => <div key={badge.label} className="rounded-3xl bg-slate-50 p-4 text-center"><p className="text-3xl">{badge.icon}</p><p className="mt-2 text-sm font-black text-slate-500">{badge.label}</p><p className="text-xl font-black text-slate-900">{badge.owner}</p></div>)}</div></div></div>}{tab === 'tasks' && <div className="space-y-5"><div className="rounded-[2rem] border border-white bg-white/75 p-5 shadow-xl"><SectionTitle icon="🎯" title={`${pretty(currentDate).date} 的任务房间`} desc="快速打卡：先记录完成，再后台压缩上传照片" /><p className="text-sm font-bold text-slate-600">照片慢不再影响计划完成度；如果照片失败，可以晚点点“重新上传”。</p></div><div className="grid gap-5 lg:grid-cols-2">{PLAYERS.map((player) => <TaskBoard key={player.name} player={player} tasks={taskLists[player.name] || []} draft={taskDrafts[player.name] || ''} editing={editingTasks[player.name] || false} selectedIds={selectedTaskIds[player.name] || []} setDraft={(name, value) => setTaskDrafts((current) => ({ ...current, [name]: value }))} addTask={addTask} toggleEdit={toggleEdit} editTask={editTask} uploadProof={uploadProof} clearProof={clearProof} viewProof={viewProof} toggleSelect={toggleSelect} deleteSelected={deleteSelected} />)}</div></div>}{tab === 'wall' && <div className="rounded-[2rem] border border-white bg-white/75 p-5 shadow-xl"><SectionTitle icon="💬" title="双人监督墙" desc="自动读取今日任务完成度" /><div className="space-y-4">{wall.map((item, index) => <div key={index} className="rounded-[1.7rem] bg-white p-5 shadow"><div className="flex gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-3xl">{item.avatar}</div><div><h3 className="text-lg font-black text-slate-900">{item.name}</h3><span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-600">{item.tag}</span><p className="mt-2 font-semibold leading-7 text-slate-600">{item.text}</p></div></div></div>)}</div></div>}</main>{proofPreview && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4 backdrop-blur-sm"><div className="w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl"><div className="flex items-start justify-between gap-4 bg-slate-900 p-5 text-white"><div><p className="text-sm font-bold text-white/60">学习证据预览</p><h3 className="mt-1 text-2xl font-black">{proofPreview.playerName} · {proofPreview.taskTitle}</h3><p className="mt-1 text-sm font-semibold text-white/60">{proofPreview.proofName}</p></div><button onClick={() => setProofPreview(null)} className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-black">关闭</button></div><div className="max-h-[78vh] overflow-y-auto p-5">{(proofPreview.proofUrls || []).length ? <div className="grid gap-4 md:grid-cols-2">{proofPreview.proofUrls.map((url, index) => <div key={index} className="rounded-3xl bg-slate-100 p-2"><img src={url} alt={`学习证据 ${index + 1}`} className="max-h-[60vh] w-full rounded-2xl object-contain" /><p className="mt-2 text-center text-xs font-bold text-slate-500">第 {index + 1} 张</p></div>)}</div> : <div className="grid min-h-80 place-items-center rounded-3xl bg-slate-100 p-8 text-center"><div><p className="text-5xl">✅</p><p className="mt-3 text-xl font-black text-slate-900">任务已经计入完成</p><p className="mt-2 text-sm font-bold text-slate-500">照片可能正在后台上传，或这次上传失败了。不会影响今日完成度，可晚点重新上传。</p></div></div>}</div></div></div>}</div></div>;
}
