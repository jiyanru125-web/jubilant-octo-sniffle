import React, { useMemo, useState } from "react";

const players = [
  {
    name: "纪沿如",
    avatar: "🦊",
    target: "IELTS 7.0",
    streak: 0,
    title: "今日成员",
    color: "from-sky-400 to-cyan-300",
  },
  {
    name: "李姝娴",
    avatar: "🐰",
    target: "IELTS 7.0",
    streak: 0,
    title: "今日成员",
    color: "from-pink-400 to-orange-300",
  },
];

const initialDuoTasks = {
  "纪沿如": [],
  "李姝娴": [],
};

const punishmentPool = [
  {
    icon: "🍽️",
    title: "输的人请对方吃饭",
    desc: "当天任务完成度低的人，第二天请对方吃一顿饭。具体吃什么可以当天商量，预算你们自己定。",
  },
];

const checkInHeatmap = Array.from({ length: 28 }).map((_, index) => {
  const baseDate = new Date();
  const date = new Date(baseDate);
  date.setDate(baseDate.getDate() - 27 + index);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = ["日", "一", "二", "三", "四", "五", "六"][date.getDay()];
  return {
    id: index + 1,
    dateText: `${month}/${day}`,
    weekday,
    isToday: index === 27,
    "纪沿如": 0,
    "李姝娴": 0,
  };
});

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function ProgressBar({ value, soft = false }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full border border-white/70 bg-white/60">
      <div
        style={{ width: `${Math.min(value, 100)}%` }}
        className={cn(
          "h-full rounded-full transition-all duration-700",
          soft
            ? "bg-gradient-to-r from-emerald-300 to-sky-300"
            : "bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300"
        )}
      />
    </div>
  );
}

function SectionTitle({ icon, title, desc }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-900 text-2xl text-white shadow-lg">
        {icon}
      </div>
      <div>
        <h2 className="text-2xl font-black text-slate-900">{title}</h2>
        <p className="text-sm font-semibold text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

function tableStatus(rate) {
  if (rate >= 100) return { text: "今日超神", style: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" };
  if (rate >= 75) return { text: "差一点封神", style: "bg-sky-100 text-sky-700", dot: "bg-sky-500" };
  if (rate >= 50) return { text: "还在挣扎", style: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-400" };
  return { text: "今天摸鱼了", style: "bg-rose-100 text-rose-700", dot: "bg-rose-400" };
}

function PlayerCheckTable({ player, stat }) {
  const rows = checkInHeatmap.slice(-7).map((day) =>
    day.isToday ? { ...day, [player.name]: stat.percent } : day
  );
  const fullDays = checkInHeatmap
    .map((day) => (day.isToday ? { ...day, [player.name]: stat.percent } : day))
    .filter((day) => day[player.name] === 100).length;
  const average = Math.round(
    checkInHeatmap
      .map((day) => (day.isToday ? { ...day, [player.name]: stat.percent } : day))
      .reduce((sum, day) => sum + day[player.name], 0) / checkInHeatmap.length
  );

  return (
    <div className="rounded-[2rem] border border-white bg-white/80 p-5 shadow-xl shadow-sky-100">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-3xl bg-slate-100 text-4xl">{player.avatar}</div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">{player.name} 的打卡状况</h3>
            <p className="text-sm font-bold text-slate-500">最近 7 天任务完成记录</p>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-900 px-4 py-3 text-right text-white">
          <p className="text-xs font-bold text-white/60">平均完成</p>
          <p className="text-2xl font-black">{average}%</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-emerald-50 p-3">
          <p className="text-xs font-black text-emerald-600">近 28 天全勤</p>
          <p className="text-2xl font-black text-slate-900">{fullDays} 天</p>
        </div>
        <div className="rounded-2xl bg-orange-50 p-3">
          <p className="text-xs font-black text-orange-600">连续打卡</p>
          <p className="text-2xl font-black text-slate-900">{stat.streak} 天</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
        <div className="grid grid-cols-[1fr_0.9fr_1.1fr] bg-slate-50 px-4 py-3 text-xs font-black text-slate-500">
          <span>日期</span>
          <span>完成度</span>
          <span>状态</span>
        </div>
        {rows.map((day) => {
          const status = tableStatus(day[player.name]);
          return (
            <div key={`${player.name}-${day.id}`} className="grid grid-cols-[1fr_0.9fr_1.1fr] items-center border-t border-slate-100 px-4 py-3 text-sm font-bold text-slate-700">
              <div>
                <p className="font-black text-slate-900">{day.dateText}</p>
                <p className="text-xs text-slate-400">周{day.weekday}{day.isToday ? " · 今天" : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", status.dot)} />
                <span className="font-black">{day[player.name]}%</span>
              </div>
              <span className={cn("w-fit rounded-full px-3 py-1 text-xs font-black", status.style)}>{status.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DuoHeatmap({ taskStats }) {
  return (
    <div className="grid gap-5 lg:col-span-3 lg:grid-cols-2">
      <PlayerCheckTable player={players[0]} stat={taskStats[0]} />
      <PlayerCheckTable player={players[1]} stat={taskStats[1]} />
    </div>
  );
}

function PlayerCard({ player, stat }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white/75 p-5 shadow-xl shadow-sky-100/60">
      <div className={cn("absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-70 blur-2xl", player.color)} />
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-white text-4xl shadow-inner">
            {player.avatar}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-black text-slate-800">{player.name}</h3>
              <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-amber-700">
                {player.title}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-500">目标：{player.target}</p>
          </div>
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

function TaskBoard({
  player,
  tasks,
  draft,
  isEditing,
  selectedIds,
  onToggleEdit,
  onDraftChange,
  onAddTask,
  onUploadProof,
  onClearProof,
  onViewProof,
  onEditTask,
  onToggleSelectTask,
  onDeleteSelectedTasks,
}) {
  const doneCount = tasks.filter((task) => task.proofName).length;
  const percent = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const selectedCount = selectedIds.length;

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white/80 p-5 shadow-xl shadow-sky-100/60">
      <div className={cn("absolute -right-12 -top-12 h-36 w-36 rounded-full bg-gradient-to-br opacity-60 blur-2xl", player.color)} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-white text-4xl shadow-inner">{player.avatar}</div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">{player.name} 的今日任务</h3>
            <p className="text-sm font-bold text-slate-500">完成 {doneCount} / {tasks.length} 个任务</p>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-900 px-4 py-3 text-right text-white">
          <p className="text-xs font-bold text-white/60">完成度</p>
          <p className="text-2xl font-black">{percent}%</p>
        </div>
      </div>

      <div className="relative mt-5">
        <ProgressBar value={percent} soft />
      </div>

      <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-slate-50 p-3">
        <div>
          <p className="text-sm font-black text-slate-900">{isEditing ? "正在编辑任务" : "普通模式"}</p>
          <p className="text-xs font-bold text-slate-500">{isEditing ? "可以新增任务、修改文字、选择任务后批量删除" : "点击左侧图标上传/拍照，上传证据后才算完成"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isEditing && (
            <button
              onClick={() => onDeleteSelectedTasks(player.name)}
              disabled={selectedCount === 0}
              className="rounded-2xl bg-rose-100 px-4 py-3 text-sm font-black text-rose-600 hover:bg-rose-200 disabled:opacity-40"
            >
              删除已选 {selectedCount ? `(${selectedCount})` : ""}
            </button>
          )}
          <button
            onClick={() => onToggleEdit(player.name)}
            className={cn(
              "rounded-2xl px-5 py-3 text-sm font-black transition",
              isEditing ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-slate-900 text-white hover:bg-slate-700"
            )}
          >
            {isEditing ? "完成" : "编辑"}
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="relative mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={draft}
            onChange={(event) => onDraftChange(player.name, event.target.value)}
            placeholder={`给${player.name}添加一个任务，比如：听写 20 个单词`}
            className="min-w-0 flex-1 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-sky-300"
          />
          <button
            onClick={() => onAddTask(player.name)}
            className="rounded-2xl bg-yellow-300 px-5 py-3 text-sm font-black text-slate-900 hover:bg-yellow-200"
          >
            添加新任务
          </button>
        </div>
      )}

      <div className="relative mt-5 space-y-3">
        {tasks.map((task) => {
          const selected = selectedIds.includes(task.id);
          return (
            <div key={task.id} className={cn("rounded-[1.5rem] border p-4 transition", selected ? "border-rose-200 bg-rose-50" : "border-slate-100 bg-slate-50")}>
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <button
                    onClick={() => onToggleSelectTask(player.name, task.id)}
                    className={cn(
                      "grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl font-black",
                      selected ? "bg-rose-500 text-white" : "bg-white text-slate-400"
                    )}
                  >
                    {selected ? "−" : "○"}
                  </button>
                ) : task.proofName ? (
                  <button
                    onClick={() => onViewProof(player.name, task)}
                    className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-emerald-100 text-xl font-black text-emerald-600 transition hover:scale-105 hover:ring-2 hover:ring-emerald-300"
                    title="点击查看已上传的学习证据"
                  >
                    {task.proofUrl ? (
                      <img src={task.proofUrl} alt="学习证据" className="h-full w-full object-cover" />
                    ) : (
                      "✓"
                    )}
                  </button>
                ) : (
                  <label
                    className="grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-2xl bg-yellow-100 text-xl font-black text-amber-600 transition hover:scale-105 hover:ring-2 hover:ring-yellow-300"
                    title="点击上传照片或直接拍照，上传后才算完成"
                  >
                    📷
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(event) => onUploadProof(player.name, task.id, event.target.files && event.target.files[0])}
                    />
                  </label>
                )}
                <div className="min-w-0 flex-1">
                  <input
                    value={task.title}
                    readOnly={!isEditing}
                    onChange={(event) => onEditTask(player.name, task.id, event.target.value)}
                    className={cn(
                      "w-full rounded-xl px-3 py-2 text-base font-black text-slate-900 outline-none",
                      isEditing ? "bg-white focus:ring-2 focus:ring-sky-200" : "bg-transparent cursor-default",
                      task.done && !isEditing ? "line-through decoration-2 opacity-60" : ""
                    )}
                  />
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                    <span>奖励：{task.reward}</span>
                    {task.proofName ? (
                      <button
                        onClick={() => onViewProof(player.name, task)}
                        className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700 hover:bg-emerald-200"
                      >
                        已上传：{task.proofName} · 点击查看
                      </button>
                    ) : (
                      <span className="rounded-full bg-yellow-100 px-2 py-1 text-yellow-700">未上传证据</span>
                    )}
                  </div>
                  {!isEditing && task.proofName && (
                    <button
                      onClick={() => onClearProof(player.name, task.id)}
                      className="mt-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 hover:bg-slate-200"
                    >
                      重新上传 / 取消完成
                    </button>
                  )}
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
  const [tab, setTab] = useState("home");
  const [taskLists, setTaskLists] = useState(initialDuoTasks);
  const [taskDrafts, setTaskDrafts] = useState({ "纪沿如": "", "李姝娴": "" });
  const [editingTasks, setEditingTasks] = useState({ "纪沿如": false, "李姝娴": false });
  const [selectedTaskIds, setSelectedTaskIds] = useState({ "纪沿如": [], "李姝娴": [] });
  const [proofPreview, setProofPreview] = useState(null);

  function updateTaskDraft(playerName, value) {
    setTaskDrafts({ ...taskDrafts, [playerName]: value });
  }

  function addTask(playerName) {
    const title = (taskDrafts[playerName] || "").trim();
    if (!title) return;
    const newTask = {
      id: Date.now(),
      title,
      reward: "Custom +1",
      done: false,
      icon: "⭐",
      proofName: "",
    };
    setTaskLists({
      ...taskLists,
      [playerName]: [...taskLists[playerName], newTask],
    });
    setTaskDrafts({ ...taskDrafts, [playerName]: "" });
  }

  function uploadTaskProof(playerName, taskId, file) {
    if (!file) return;
    const proofUrl = URL.createObjectURL(file);
    setTaskLists({
      ...taskLists,
      [playerName]: taskLists[playerName].map((task) =>
        task.id === taskId ? { ...task, done: true, proofName: file.name, proofUrl } : task
      ),
    });
    setProofPreview({
      playerName,
      taskTitle: taskLists[playerName].find((task) => task.id === taskId)?.title || "学习任务",
      proofName: file.name,
      proofUrl,
    });
  }

  function clearTaskProof(playerName, taskId) {
    setTaskLists({
      ...taskLists,
      [playerName]: taskLists[playerName].map((task) =>
        task.id === taskId ? { ...task, done: false, proofName: "", proofUrl: "" } : task
      ),
    });
  }

  function viewTaskProof(playerName, task) {
    setProofPreview({
      playerName,
      taskTitle: task.title,
      proofName: task.proofName,
      proofUrl: task.proofUrl || "",
    });
  }

  function editTask(playerName, taskId, title) {
    setTaskLists({
      ...taskLists,
      [playerName]: taskLists[playerName].map((task) =>
        task.id === taskId ? { ...task, title } : task
      ),
    });
  }

  function toggleEditTasks(playerName) {
    setEditingTasks({ ...editingTasks, [playerName]: !editingTasks[playerName] });
    setSelectedTaskIds({ ...selectedTaskIds, [playerName]: [] });
  }

  function toggleSelectTask(playerName, taskId) {
    const current = selectedTaskIds[playerName] || [];
    const next = current.includes(taskId)
      ? current.filter((id) => id !== taskId)
      : [...current, taskId];
    setSelectedTaskIds({ ...selectedTaskIds, [playerName]: next });
  }

  function deleteSelectedTasks(playerName) {
    const ids = selectedTaskIds[playerName] || [];
    if (!ids.length) return;
    setTaskLists({
      ...taskLists,
      [playerName]: taskLists[playerName].filter((task) => !ids.includes(task.id)),
    });
    setSelectedTaskIds({ ...selectedTaskIds, [playerName]: [] });
  }

  const taskStats = useMemo(() => {
    return players.map((player) => {
      const tasks = taskLists[player.name] || [];
      const doneCount = tasks.filter((task) => task.proofName).length;
      const percent = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
      const streak = percent === 100 && tasks.length > 0 ? player.streak + 1 : player.streak;
      return { ...player, doneCount, taskCount: tasks.length, percent, streak };
    });
  }, [taskLists]);

  const isTie = taskStats[0].percent === taskStats[1].percent;
  const leader = taskStats[0].percent >= taskStats[1].percent ? taskStats[0] : taskStats[1];
  const loser = isTie ? null : taskStats[0].percent < taskStats[1].percent ? taskStats[0] : taskStats[1];
  const todayPunishment = punishmentPool[0];

  const currentBadges = useMemo(() => {
    const top = taskStats[0].percent >= taskStats[1].percent ? taskStats[0] : taskStats[1];
    const steady = taskStats[0].streak >= taskStats[1].streak ? taskStats[0] : taskStats[1];
    const danger = taskStats[0].percent <= taskStats[1].percent ? taskStats[0] : taskStats[1];
    if (taskStats[0].percent === 0 && taskStats[1].percent === 0) {
      return [
        { label: "今日任务王", owner: "待产生", icon: "👑" },
        { label: "连续打卡王", owner: "待产生", icon: "🔥" },
        { label: "请饭预警", owner: "待产生", icon: "🍽️" },
      ];
    }
    return [
      { label: "今日任务王", owner: top.name, icon: "👑" },
      { label: "连续打卡王", owner: steady.name, icon: "🔥" },
      { label: "请饭预警", owner: taskStats[0].percent === taskStats[1].percent ? "暂时没有" : danger.name, icon: "🍽️" },
    ];
  }, [taskStats]);

  const liveWall = useMemo(() => {
    return [
      {
        name: taskStats[0].name,
        avatar: taskStats[0].avatar,
        text: `今天已上传 ${taskStats[0].doneCount} / ${taskStats[0].taskCount} 个学习证据，任务完成率 ${taskStats[0].percent}%。`,
        tag: taskStats[0].percent === 100 ? "今日超神" : taskStats[0].percent >= 50 ? "还可以再冲" : "请饭危险区",
      },
      {
        name: taskStats[1].name,
        avatar: taskStats[1].avatar,
        text: `今天已上传 ${taskStats[1].doneCount} / ${taskStats[1].taskCount} 个学习证据，任务完成率 ${taskStats[1].percent}%。`,
        tag: taskStats[1].percent === 100 ? "今日超神" : taskStats[1].percent >= 50 ? "还可以再冲" : "请饭危险区",
      },
      {
        name: "系统监督员",
        avatar: "🤖",
        text: isTie
          ? "目前两个人任务完成度持平。今天结束时如果还持平，就不用请饭；如果有人落后，落后的人明天请对方吃饭。"
          : `${leader.name} 目前领先，${loser.name} 暂时落后。今天结束时完成度低的人，明天请对方吃饭。`,
        tag: "实时监督",
      },
    ];
  }, [taskStats, leader.name, loser, isTie]);

  const tabs = [
    { key: "home", label: "首页", icon: "🏆" },
    { key: "tasks", label: "任务房间", icon: "🎯" },
    { key: "wall", label: "监督墙", icon: "💬" },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dff7ff,transparent_35%),radial-gradient(circle_at_top_right,#fff2b8,transparent_35%),linear-gradient(135deg,#f8fbff,#fff7fb)] p-4 text-slate-800 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="relative overflow-hidden rounded-[2.5rem] border border-white bg-white/70 p-6 shadow-2xl shadow-sky-100 backdrop-blur md:p-8">
          <div className="absolute -left-16 -top-16 h-44 w-44 rounded-full bg-cyan-200 blur-3xl" />
          <div className="absolute -right-16 -bottom-16 h-44 w-44 rounded-full bg-yellow-200 blur-3xl" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-lg">
                ⚡ IELTS Duo Battle Room
              </div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-6xl">
                雅思双人监督局
              </h1>
              <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-slate-600 md:text-lg">
                两个人一起背单词、互相监督、完成每日任务。今天的输赢只看任务完成度，不看借口。
              </p>
            </div>
            <div className="rounded-[2rem] bg-slate-900 p-5 text-white shadow-xl md:min-w-72">
              <p className="text-sm font-bold text-white/60">今日战况</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="text-4xl">{leader.avatar}</div>
                <div>
                  <p className="text-2xl font-black">{isTie ? "目前持平" : `${leader.name} 今日领先`}</p>
                  <p className="text-sm font-semibold text-white/70">
                    {isTie ? `双方任务完成度都是 ${leader.percent}%` : `任务完成度：${leader.percent}% · 落后者请吃饭：${loser.name}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <nav className="sticky top-3 z-10 mt-5 overflow-x-auto rounded-[2rem] border border-white bg-white/75 p-2 shadow-xl shadow-sky-100/50 backdrop-blur">
          <div className="flex min-w-max gap-2">
            {tabs.map((item) => {
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={cn(
                    "flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition",
                    active ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        <main className="mt-6">
          {tab === "home" && (
            <div className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                {taskStats.map((stat) => (
                  <PlayerCard key={stat.name} player={stat} stat={stat} />
                ))}
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <div className="rounded-[2rem] border border-white bg-white/75 p-5 shadow-xl shadow-sky-100 lg:col-span-3">
                  <SectionTitle icon="✨" title="今日毒舌监督" desc="让学习稍微有一点压迫感" />
                  <div className="rounded-[2rem] bg-gradient-to-r from-yellow-200 via-pink-100 to-sky-200 p-6">
                    <p className="text-2xl font-black leading-relaxed text-slate-900">
                      “{isTie ? "现在你们两个任务完成度持平，今天正式开局。谁先上传学习证据，谁就先领先。" : `${leader.name} 现在任务完成度领先，${loser.name} 要小心了。今天结束时谁完成度低，明天谁请对方吃饭。`}”
                    </p>
                  </div>
                </div>

                <DuoHeatmap taskStats={taskStats} />
              </div>

              <div className="rounded-[2rem] border border-white bg-white/75 p-5 shadow-xl shadow-sky-100">
                <SectionTitle icon="👑" title="今日称号榜" desc="排行榜不只看分数，也看谁更离谱" />
                <div className="grid gap-3 md:grid-cols-3">
                  {currentBadges.map((badge) => (
                    <div key={badge.label} className="rounded-3xl border border-white bg-slate-50 p-4 text-center">
                      <p className="text-3xl">{badge.icon}</p>
                      <p className="mt-2 text-sm font-black text-slate-500">{badge.label}</p>
                      <p className="text-xl font-black text-slate-900">{badge.owner}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "tasks" && (
            <div className="space-y-6">
              <div className="rounded-[2rem] border border-white bg-white/75 p-5 shadow-xl shadow-sky-100">
                <SectionTitle icon="🎯" title="双人任务房间" desc="点击任务左侧相机上传照片或拍照，上传证据后才算完成" />
                <div className="grid gap-4 md:grid-cols-3">
                  {players.map((player) => {
                    const tasks = taskLists[player.name] || [];
                    const doneCount = tasks.filter((task) => task.proofName).length;
                    const percent = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
                    return (
                      <div key={player.name} className="rounded-3xl bg-slate-900 p-5 text-white">
                        <div className="flex items-center gap-3">
                          <div className="text-4xl">{player.avatar}</div>
                          <div>
                            <p className="text-xl font-black">{player.name}</p>
                            <p className="text-sm font-bold text-white/60">已上传 {doneCount} / {tasks.length} 个证据</p>
                          </div>
                        </div>
                        <p className="mt-4 text-4xl font-black">{percent}%</p>
                        <div className="mt-3"><ProgressBar value={percent} soft /></div>
                      </div>
                    );
                  })}
                  <div className="rounded-3xl bg-gradient-to-r from-yellow-200 via-pink-100 to-sky-200 p-5">
                    <p className="text-sm font-black text-slate-500">任务房间规则</p>
                    <p className="mt-2 text-2xl font-black leading-snug text-slate-900">任务必须上传学习照片才算完成，完成度低的人明天请对方吃饭。</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                {players.map((player) => (
                  <TaskBoard
                    key={player.name}
                    player={player}
                    tasks={taskLists[player.name] || []}
                    draft={taskDrafts[player.name] || ""}
                    isEditing={editingTasks[player.name] || false}
                    selectedIds={selectedTaskIds[player.name] || []}
                    onToggleEdit={toggleEditTasks}
                    onDraftChange={updateTaskDraft}
                    onAddTask={addTask}
                    onUploadProof={uploadTaskProof}
                    onClearProof={clearTaskProof}
                    onViewProof={viewTaskProof}
                    onEditTask={editTask}
                    onToggleSelectTask={toggleSelectTask}
                    onDeleteSelectedTasks={deleteSelectedTasks}
                  />
                ))}
              </div>
            </div>
          )}

          {tab === "wall" && (
            <div className="rounded-[2rem] border border-white bg-white/75 p-5 shadow-xl shadow-sky-100">
              <SectionTitle icon="💬" title="双人监督墙" desc="每天自动生成学习动态，也可以互相留言" />
              <div className="space-y-4">
                {liveWall.map((item, index) => (
                  <div key={index} className="rounded-[1.7rem] border border-slate-100 bg-white p-5 shadow-md">
                    <div className="flex items-start gap-4">
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-3xl">
                        {item.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-black text-slate-900">{item.name}</h3>
                          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-600">
                            {item.tag}
                          </span>
                        </div>
                        <p className="mt-2 text-base font-semibold leading-7 text-slate-600">{item.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-[1.7rem] bg-slate-900 p-4 text-white">
                <p className="text-sm font-bold text-white/60">快捷留言</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["别偷懒，今晚 10 点前背完", "你昨天错的词今天还错，笑死", "今天不错，继续保持", "今天任务完成度低的人请吃饭"].map((msg) => (
                    <button key={msg} className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">
                      {msg}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        {proofPreview && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 bg-slate-900 p-5 text-white">
                <div>
                  <p className="text-sm font-bold text-white/60">学习证据预览</p>
                  <h3 className="mt-1 text-2xl font-black">{proofPreview.playerName} · {proofPreview.taskTitle}</h3>
                  <p className="mt-1 text-sm font-semibold text-white/60">文件：{proofPreview.proofName}</p>
                </div>
                <button
                  onClick={() => setProofPreview(null)}
                  className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-black hover:bg-white/20"
                >
                  关闭
                </button>
              </div>
              <div className="p-5">
                {proofPreview.proofUrl ? (
                  <img src={proofPreview.proofUrl} alt="上传的学习证据" className="max-h-[70vh] w-full rounded-3xl object-contain bg-slate-100" />
                ) : (
                  <div className="grid min-h-80 place-items-center rounded-3xl bg-slate-100 p-8 text-center">
                    <div>
                      <p className="text-5xl">🖼️</p>
                      <p className="mt-3 text-xl font-black text-slate-900">这是示例证据</p>
                      <p className="mt-2 text-sm font-bold text-slate-500">真实上传的照片会在这里直接显示。</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
