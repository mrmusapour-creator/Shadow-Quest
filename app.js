const STORAGE_KEY = "shadowQuestState.v2";
const categoryLabels = {
  work: "بیزینس",
  sport: "قدرت بدنی",
  health: "ریکاوری",
  learn: "ذهن",
  life: "نظم",
  money: "مالی",
  social: "کاریزما"
};
const ranks = [
  { name: "E Rank", xp: 0 },
  { name: "D Rank", xp: 500 },
  { name: "C Rank", xp: 2000 },
  { name: "B Rank", xp: 5000 },
  { name: "A Rank", xp: 12000 },
  { name: "S Rank", xp: 25000 },
  { name: "National Rank", xp: 50000 },
  { name: "Monarch", xp: 100000 },
  { name: "Shadow Monarch", xp: 250000 }
];
const attributeLabels = {
  strength: "Strength",
  discipline: "Discipline",
  focus: "Focus",
  creativity: "Creativity",
  knowledge: "Knowledge",
  business: "Business",
  health: "Health",
  charisma: "Charisma",
  energy: "Energy",
  leadership: "Leadership",
  confidence: "Confidence"
};
const categoryRewards = {
  work: { business: 3, focus: 2, leadership: 1 },
  sport: { strength: 3, discipline: 2, energy: 1 },
  health: { health: 3, energy: 2, discipline: 1 },
  learn: { knowledge: 3, focus: 2, confidence: 1 },
  life: { discipline: 3, focus: 1, energy: 1 },
  money: { business: 2, knowledge: 2, confidence: 2 },
  social: { charisma: 3, leadership: 2, confidence: 1 }
};

let deferredInstallPrompt = null;
let state = loadState();

const screens = {
  onboarding: document.querySelector("#onboardingScreen"),
  dashboard: document.querySelector("#dashboardScreen")
};
const profileForm = document.querySelector("#profileForm");
const taskForm = document.querySelector("#taskForm");
const taskList = document.querySelector("#taskList");
const taskTemplate = document.querySelector("#taskTemplate");
const logList = document.querySelector("#logList");
const attributeGrid = document.querySelector("#attributeGrid");

document.querySelector("#todayLabel").textContent = new Intl.DateTimeFormat("fa-IR", {
  weekday: "long",
  day: "numeric",
  month: "long"
}).format(new Date());

window.addEventListener("load", () => {
  setTimeout(() => document.querySelector("#splashScreen")?.remove(), 3300);
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  document.querySelector("#installBtn").hidden = false;
});

document.querySelector("#installBtn").addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.querySelector("#installBtn").hidden = true;
});

profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const profile = Object.fromEntries(new FormData(profileForm));
  state.profile = {
    hunterName: profile.hunterName.trim(),
    gender: profile.gender,
    business: profile.business.trim(),
    workGoal: profile.workGoal.trim(),
    currentIncome: Number(profile.currentIncome || 0),
    goalIncome: Number(profile.goalIncome || 0),
    age: Number(profile.age),
    height: Number(profile.height),
    weight: Number(profile.weight),
    sport: profile.sport,
    healthGoal: profile.healthGoal,
    wakeTime: profile.wakeTime,
    sleepTime: profile.sleepTime,
    dailyHours: Number(profile.dailyHours || 3),
    penalty: Number(profile.penalty || 0)
  };
  if (!state.tasks.length) {
    state.tasks = buildStarterTasks(state.profile);
    addLog("سیستم فعال شد. اولین Daily Dungeon ساخته شد.", "System");
  }
  saveState();
  showDashboard();
});

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(taskForm));
  const payload = {
    id: data.id || createId(),
    title: data.title.trim(),
    time: data.time,
    category: data.category,
    xp: Number(data.xp || 25),
    coins: Number(data.coins || 4),
    penalty: Number(data.penalty || state.profile?.penalty || 0),
    done: false,
    settledLate: false
  };
  const index = state.tasks.findIndex((task) => task.id === payload.id);
  if (index >= 0) {
    state.tasks[index] = { ...state.tasks[index], ...payload };
  } else {
    state.tasks.push(payload);
  }
  taskForm.reset();
  taskForm.id.value = "";
  saveState();
  render();
});

document.querySelector("#cancelEditBtn").addEventListener("click", () => {
  taskForm.reset();
  taskForm.id.value = "";
});

document.querySelector("#editProfileBtn").addEventListener("click", () => {
  fillProfileForm();
  showScreen("onboarding");
});

document.querySelector("#resetTodayBtn").addEventListener("click", () => {
  state.tasks = state.tasks.map((task) => ({ ...task, done: false, doneAt: null, settledLate: false }));
  state.streak = 0;
  addLog("دروازه روز جدید باز شد. ماموریت‌ها ریست شدند.", "Reset");
  saveState();
  render();
});

document.querySelector("#clearLogBtn").addEventListener("click", () => {
  state.logs = [];
  saveState();
  renderLog();
});

function buildStarterTasks(profile) {
  const basePenalty = Number(profile.penalty || 50000);
  const isWeightLoss = profile.healthGoal === "کاهش وزن";
  const intenseSport = profile.sport === "بدنسازی" || profile.sport === "دویدن";
  return [
    task(profile.wakeTime || "08:00", "Daily Check-in: تعیین ۳ ماموریت حیاتی", "life", basePenalty, 20, 3),
    task("09:30", `Business Raid: یک اقدام جدی برای ${profile.workGoal}`, "work", basePenalty * 2, 35, 5),
    task("12:30", isWeightLoss ? "Recovery Meal: ناهار سبک و آب کافی" : "Recovery Meal: وعده سالم و کامل", "health", basePenalty, 20, 3),
    task("16:00", `Focus Gate: ۳۰ دقیقه تمرکز روی ${profile.business}`, "work", basePenalty * 2, 35, 5),
    task("18:30", `Strength Quest: ${intenseSport ? "۴۵" : "۳۰"} دقیقه ${profile.sport}`, "sport", basePenalty * 2, 30, 4),
    task("21:30", "Archive: جمع‌بندی روز و آماده‌سازی فردا", "learn", basePenalty, 20, 3)
  ];
}

function task(time, title, category, penalty, xp = 25, coins = 4) {
  return {
    id: createId(),
    time,
    title,
    category,
    penalty,
    xp,
    coins,
    done: false,
    settledLate: false
  };
}

function markDone(id) {
  const selected = state.tasks.find((taskItem) => taskItem.id === id);
  if (!selected || selected.done) return;
  const late = isPastTime(selected.time);
  selected.done = true;
  selected.doneAt = new Date().toISOString();
  if (late) {
    state.power = Math.max(0, state.power - 5);
    addLog(`ماموریت «${selected.title}» دیر پاک‌سازی شد. تعهد جریمه: ${formatMoney(selected.penalty)} برای کار خیر.`, "Penalty");
  } else {
    state.power += 12;
    state.totalXp += selected.xp;
    state.coins += selected.coins;
    state.streak += 1;
    applyAttributes(selected.category);
    normalizeLevel();
    addLog(`ماموریت «${selected.title}» پاک‌سازی شد. ${selected.xp} XP و ${selected.coins} سکه سایه گرفتی.`, "Reward");
  }
  saveState();
  render();
}

function settleExpiredTasks() {
  let changed = false;
  state.tasks.forEach((taskItem) => {
    if (!taskItem.done && !taskItem.settledLate && isPastTime(taskItem.time)) {
      taskItem.settledLate = true;
      state.power = Math.max(0, state.power - 3);
      addLog(`زمان «${taskItem.title}» تمام شد. شکست ماموریت: ${formatMoney(taskItem.penalty)} کمک خیرخواهانه.`, "Failure");
      changed = true;
    }
  });
  if (changed) saveState();
}

function normalizeLevel() {
  const next = nextRank();
  while (state.totalXp >= state.level * 100) {
    state.level += 1;
    state.power += 20;
    addLog(`ارتقای سطح انجام شد. اکنون Level ${state.level} هستی.`, "Level Up");
  }
  if (next && state.totalXp >= next.xp) {
    addLog(`Rank Up: وارد ${currentRank()} شدی.`, "Rank Up");
  }
}

function xpNeeded() {
  const next = nextRank();
  return next ? next.xp : ranks[ranks.length - 1].xp;
}

function currentRank() {
  return ranks.reduce((current, rank) => (state.totalXp >= rank.xp ? rank.name : current), ranks[0].name);
}

function nextRank() {
  return ranks.find((rank) => state.totalXp < rank.xp);
}

function previousRankXp() {
  const currentIndex = ranks.findIndex((rank) => rank.name === currentRank());
  return ranks[Math.max(0, currentIndex)]?.xp || 0;
}

function applyAttributes(category) {
  const rewards = categoryRewards[category] || {};
  Object.entries(rewards).forEach(([key, value]) => {
    state.attributes[key] = (state.attributes[key] || 0) + value;
  });
}

function render() {
  settleExpiredTasks();
  state.tasks.sort((a, b) => a.time.localeCompare(b.time));
  const need = xpNeeded();
  const base = previousRankXp();
  const rankSpan = Math.max(1, need - base);
  const rankProgress = need === base ? 100 : ((state.totalXp - base) / rankSpan) * 100;
  document.querySelector("#hunterTitle").textContent = `${state.profile?.hunterName || "Hunter"} / ${state.profile?.business || "Quest"}`;
  document.querySelector("#levelValue").textContent = state.level;
  document.querySelector("#rankValue").textContent = currentRank();
  document.querySelector("#xpText").textContent = `${state.totalXp} / ${need} XP`;
  document.querySelector("#xpFill").style.width = `${Math.min(100, rankProgress)}%`;
  document.querySelector("#powerValue").textContent = state.power;
  document.querySelector("#coinValue").textContent = state.coins;
  document.querySelector("#streakValue").textContent = state.streak;
  renderAttributes();
  taskList.replaceChildren();

  if (!state.tasks.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "هنوز ماموریتی نداری. از فرم پایین یک ماموریت اضافه کن.";
    taskList.append(empty);
  }

  state.tasks.forEach((taskItem) => {
    const row = taskTemplate.content.firstElementChild.cloneNode(true);
    row.classList.toggle("done", taskItem.done);
    row.classList.toggle("late", !taskItem.done && isPastTime(taskItem.time));
    row.querySelector(".time-chip").textContent = taskItem.time;
    row.querySelector("h3").textContent = taskItem.title;
    row.querySelector(".category-pill").textContent = categoryLabels[taskItem.category] || "Quest";
    row.querySelector(".task-meta").textContent = taskMeta(taskItem);
    const doneBtn = row.querySelector(".done-btn");
    doneBtn.disabled = taskItem.done;
    doneBtn.textContent = taskItem.done ? "Cleared" : "Clear";
    doneBtn.addEventListener("click", () => markDone(taskItem.id));
    row.querySelector(".edit-btn").addEventListener("click", () => editTask(taskItem.id));
    row.querySelector(".delete-btn").addEventListener("click", () => deleteTask(taskItem.id));
    taskList.append(row);
  });

  renderLog();
}

function taskMeta(taskItem) {
  if (taskItem.done) return `پاک‌سازی شد. قدرت و XP ثبت شد.`;
  if (isPastTime(taskItem.time)) return `زمان دروازه بسته شده؛ انجام دیرهنگام ثبت می‌شود اما جریمه خیرخواهانه دارد.`;
  return `پاک‌سازی تا ${taskItem.time}: پاداش ${taskItem.xp} XP، ${taskItem.coins} سکه سایه و رشد attribute.`;
}

function renderAttributes() {
  attributeGrid.replaceChildren();
  Object.entries(attributeLabels).forEach(([key, label]) => {
    const item = document.createElement("div");
    item.className = "attribute-card";
    const name = document.createElement("span");
    name.textContent = label;
    const value = document.createElement("strong");
    value.textContent = state.attributes[key] || 0;
    item.append(name, value);
    attributeGrid.append(item);
  });
}

function renderLog() {
  logList.replaceChildren();
  if (!state.logs.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "هنوز گزارشی ثبت نشده است.";
    logList.append(empty);
    return;
  }
  state.logs.slice(0, 10).forEach((entry) => {
    const item = document.createElement("div");
    item.className = "log-item";
    const type = document.createElement("strong");
    type.textContent = entry.type;
    const text = document.createElement("span");
    text.textContent = entry.text;
    item.append(type, text);
    logList.append(item);
  });
}

function editTask(id) {
  const selected = state.tasks.find((taskItem) => taskItem.id === id);
  if (!selected) return;
  taskForm.id.value = selected.id;
  taskForm.title.value = selected.title;
  taskForm.time.value = selected.time;
  taskForm.category.value = selected.category;
  taskForm.xp.value = selected.xp || 25;
  taskForm.coins.value = selected.coins || 4;
  taskForm.penalty.value = selected.penalty;
  taskForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((taskItem) => taskItem.id !== id);
  saveState();
  render();
}

function fillProfileForm() {
  if (!state.profile) return;
  Object.entries(state.profile).forEach(([key, value]) => {
    if (profileForm.elements[key]) profileForm.elements[key].value = value;
  });
}

function isPastTime(time) {
  const [hour, minute] = time.split(":").map(Number);
  const deadline = new Date();
  deadline.setHours(hour, minute, 0, 0);
  return Date.now() > deadline.getTime();
}

function addLog(text, type) {
  state.logs.unshift({ text, type, at: new Date().toISOString() });
}

function showDashboard() {
  taskForm.penalty.value = state.profile?.penalty || 50000;
  showScreen("dashboard");
  render();
}

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[name].classList.add("active");
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    return {
      profile: parsed.profile || null,
      tasks: parsed.tasks || [],
      logs: parsed.logs || [],
      power: parsed.power || parsed.score || 0,
      totalXp: parsed.totalXp || parsed.xp || 0,
      level: parsed.level || 1,
      coins: parsed.coins || 0,
      streak: parsed.streak || 0,
      attributes: { ...emptyAttributes(), ...(parsed.attributes || {}) }
    };
  }
  return { profile: null, tasks: [], logs: [], power: 0, totalXp: 0, level: 1, coins: 0, streak: 0, attributes: emptyAttributes() };
}

function emptyAttributes() {
  return Object.keys(attributeLabels).reduce((attributes, key) => {
    attributes[key] = 0;
    return attributes;
  }, {});
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatMoney(amount) {
  return `${Number(amount || 0).toLocaleString("fa-IR")} تومان`;
}

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

if (state.profile) {
  showDashboard();
} else {
  showScreen("onboarding");
}

setInterval(render, 60000);
