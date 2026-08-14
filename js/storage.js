/* ============================================
   数据持久化层 - Storage
   全部业务数据持久存储于 localStorage
   界面仅做视图渲染，原始数据不在组件本地保存
   APP重启自动加载全部历史台账
   ============================================ */

const Storage = {
  PREFIX: 'miffy_workbench_',

  KEYS: {
    DAILY_PLANS: 'daily_plans',
    PLANS: 'plans',
    TASKS: 'tasks',
    EXPENSES: 'expenses',
    NOTES: 'notes',
    HABITS: 'habits',
    PROJECTS: 'projects',
    QUICK_HISTORY: 'quick_history',
    SETTINGS: 'settings',
    ARCHIVE: 'archive',
    SCHEDULER_LOG: 'scheduler_log',
    NEWS_BRIEFINGS: 'news_briefings',
    NEWS_FAVORITES: 'news_favorites',
    NEWS_INSPIRATIONS: 'news_inspirations',
    ENGLISH: 'english_data',
    DAILY_WORDS: 'daily_words',
    READING: 'reading_data',
    EXERCISE: 'exercise_data',
    INSPIRATIONS: 'inspirations',
    HISTORY_TODAY: 'history_today',
    DAILY_WHY: 'daily_why',
    WORK_HOUR: 'work_hour',
    COMP_TIME: 'comp_time'
  },

  cache: {},

  init() {
    Object.values(this.KEYS).forEach(key => {
      this.cache[key] = this._load(key);
    });
    if (!this.cache.settings) {
      this.cache.settings = {
        theme: 'bright',
        createdDate: this.today(),
        lastArchiveDate: '',
        lastWeeklyArchive: '',
        lastMonthlyArchive: ''
      };
      this._save(this.KEYS.SETTINGS, this.cache.settings);
    }
    this._ensureDefaults();
    console.log('[Storage] init ok');
  },

  _ensureDefaults() {
    const defaults = {};
    defaults[this.KEYS.DAILY_PLANS] = {};
    defaults[this.KEYS.PLANS] = {};
    defaults[this.KEYS.TASKS] = [];
    defaults[this.KEYS.EXPENSES] = [];
    defaults[this.KEYS.NOTES] = [];
    defaults[this.KEYS.HABITS] = [];
    defaults[this.KEYS.PROJECTS] = [];
    defaults[this.KEYS.QUICK_HISTORY] = [];
    defaults[this.KEYS.ARCHIVE] = {};
    defaults[this.KEYS.SCHEDULER_LOG] = [];
    defaults[this.KEYS.NEWS_BRIEFINGS] = {};
    defaults[this.KEYS.NEWS_FAVORITES] = [];
    defaults[this.KEYS.NEWS_INSPIRATIONS] = [];
    defaults[this.KEYS.ENGLISH] = { records: [], dailyGoal: 20 };
    defaults[this.KEYS.READING] = { books: [] };
    defaults[this.KEYS.EXERCISE] = { records: [], weeklyGoal: 3 };
    defaults[this.KEYS.INSPIRATIONS] = [];
    defaults[this.KEYS.HISTORY_TODAY] = {};
    defaults[this.KEYS.DAILY_WHY] = { seenIds: [], lastDate: '' };
    defaults[this.KEYS.WORK_HOUR] = {};
    defaults[this.KEYS.COMP_TIME] = { balance: 0, transactions: [] };
    Object.entries(defaults).forEach(function(entry) {
      var key = entry[0], value = entry[1];
      if (this.cache[key] === null || this.cache[key] === undefined) {
        this.cache[key] = value;
        this._save(key, value);
      }
    }.bind(this));
  },

  _load(key) {
    try {
      var raw = localStorage.getItem(this.PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('[Storage] load fail:', key, e);
      return null;
    }
  },

  _save(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
      this.cache[key] = value;
      return true;
    } catch (e) {
      console.error('[Storage] save fail:', key, e);
      return false;
    }
  },

  get(key) {
    return this.cache[key] !== undefined ? this.cache[key] : this._load(key);
  },

  set(key, value) {
    return this._save(key, value);
  },

  // ===== 每日计划 =====
  getDailyPlan(date) {
    var plans = this.get(this.KEYS.DAILY_PLANS) || {};
    return plans[date] || [];
  },

  setDailyPlan(date, tasks) {
    var plans = this.get(this.KEYS.DAILY_PLANS) || {};
    plans[date] = tasks;
    this.set(this.KEYS.DAILY_PLANS, plans);
  },

  addDailyTask(date, text, time) {
    var tasks = this.getDailyPlan(date);
    tasks.push({ id: this._genId(), text: text, done: false, time: time || '', createdAt: Date.now() });
    this.setDailyPlan(date, tasks);
    return tasks[tasks.length - 1];
  },

  toggleDailyTask(date, taskId) {
    var tasks = this.getDailyPlan(date);
    var task = tasks.find(function(t) { return t.id === taskId; });
    if (task) { task.done = !task.done; this.setDailyPlan(date, tasks); }
  },

  deleteDailyTask(date, taskId) {
    var tasks = this.getDailyPlan(date);
    this.setDailyPlan(date, tasks.filter(function(t) { return t.id !== taskId; }));
  },

  // ===== Plans 数据层 (memory/plans/ 按日期key存储) =====
  _emptyPlan: function(date) {
    return {
      date: date,
      monthlyGoals: [],
      weeklyTasks: [],
      todayTodos: [],
      timePlan: [],
      followUp: [],
      blockers: []
    };
  },

  getPlan: function(date) {
    var plans = this.get(this.KEYS.PLANS) || {};
    if (!plans[date]) {
      plans[date] = this._emptyPlan(date);
      this.set(this.KEYS.PLANS, plans);
    }
    return plans[date];
  },

  setPlan: function(date, plan) {
    var plans = this.get(this.KEYS.PLANS) || {};
    plans[date] = plan;
    this.set(this.KEYS.PLANS, plans);
  },

  _savePlan: function(date, plan) {
    this.setPlan(date, plan);
  },

  // --- 今日待办 ---
  addPlanTodo: function(date, data) {
    var plan = this.getPlan(date);
    var todo = {
      id: this._genId(),
      title: data.title || '',
      done: false,
      priority: data.priority || 'P2',
      projectTag: data.projectTag || '',
      categoryTag: data.categoryTag || '',
      note: data.note || '',
      source: data.source || 'manual',
      createdAt: Date.now()
    };
    plan.todayTodos.push(todo);
    this._savePlan(date, plan);
    return todo;
  },

  togglePlanTodo: function(date, id) {
    var plan = this.getPlan(date);
    var t = plan.todayTodos.find(function(x) { return x.id === id; });
    if (t) { t.done = !t.done; this._savePlan(date, plan); }
  },

  updatePlanTodo: function(date, id, updates) {
    var plan = this.getPlan(date);
    var t = plan.todayTodos.find(function(x) { return x.id === id; });
    if (t) { Object.assign(t, updates); this._savePlan(date, plan); }
  },

  deletePlanTodo: function(date, id) {
    var plan = this.getPlan(date);
    plan.todayTodos = plan.todayTodos.filter(function(x) { return x.id !== id; });
    this._savePlan(date, plan);
  },

  clearCompletedPlanTodos: function(date) {
    var plan = this.getPlan(date);
    var before = plan.todayTodos.length;
    plan.todayTodos = plan.todayTodos.filter(function(x) { return !x.done; });
    this._savePlan(date, plan);
    return before - plan.todayTodos.length;
  },

  // --- 月度目标 ---
  addMonthlyGoal: function(date, text) {
    var plan = this.getPlan(date);
    plan.monthlyGoals.push({ id: this._genId(), text: text, done: false });
    this._savePlan(date, plan);
  },
  toggleMonthlyGoal: function(date, id) {
    var plan = this.getPlan(date);
    var g = plan.monthlyGoals.find(function(x) { return x.id === id; });
    if (g) { g.done = !g.done; this._savePlan(date, plan); }
  },
  deleteMonthlyGoal: function(date, id) {
    var plan = this.getPlan(date);
    plan.monthlyGoals = plan.monthlyGoals.filter(function(x) { return x.id !== id; });
    this._savePlan(date, plan);
  },

  // --- 周任务 ---
  addWeeklyTask: function(date, text) {
    var plan = this.getPlan(date);
    plan.weeklyTasks.push({ id: this._genId(), text: text, done: false });
    this._savePlan(date, plan);
  },
  toggleWeeklyTask: function(date, id) {
    var plan = this.getPlan(date);
    var t = plan.weeklyTasks.find(function(x) { return x.id === id; });
    if (t) { t.done = !t.done; this._savePlan(date, plan); }
  },
  deleteWeeklyTask: function(date, id) {
    var plan = this.getPlan(date);
    plan.weeklyTasks = plan.weeklyTasks.filter(function(x) { return x.id !== id; });
    this._savePlan(date, plan);
  },

  // --- 时间规划 ---
  addTimeSlot: function(date, time, content) {
    var plan = this.getPlan(date);
    plan.timePlan.push({ id: this._genId(), time: time, content: content });
    this._savePlan(date, plan);
  },
  deleteTimeSlot: function(date, id) {
    var plan = this.getPlan(date);
    plan.timePlan = plan.timePlan.filter(function(x) { return x.id !== id; });
    this._savePlan(date, plan);
  },

  // --- 待跟进清单 ---
  addFollowUp: function(date, text, contact) {
    var plan = this.getPlan(date);
    plan.followUp.push({ id: this._genId(), text: text, contact: contact || '' });
    this._savePlan(date, plan);
  },
  deleteFollowUp: function(date, id) {
    var plan = this.getPlan(date);
    plan.followUp = plan.followUp.filter(function(x) { return x.id !== id; });
    this._savePlan(date, plan);
  },

  // --- 当日卡点记录 ---
  addBlocker: function(date, text) {
    var plan = this.getPlan(date);
    plan.blockers.push({ id: this._genId(), text: text });
    this._savePlan(date, plan);
  },
  deleteBlocker: function(date, id) {
    var plan = this.getPlan(date);
    plan.blockers = plan.blockers.filter(function(x) { return x.id !== id; });
    this._savePlan(date, plan);
  },

  // --- 获取昨日日期 ---
  getYesterday: function() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return this.formatDate(d);
  },

  // --- 自动顺延逻辑 ---
  rolloverTodos: function() {
    var today = this.today();
    var yesterday = this.getYesterday();
    var yesterdayPlan = null;
    try {
      var allPlans = this.get(this.KEYS.PLANS) || {};
      yesterdayPlan = allPlans[yesterday];
    } catch (e) {
      throw new Error('读取昨日计划数据失败: ' + e.message);
    }
    if (!yesterdayPlan || !yesterdayPlan.todayTodos) {
      return { rolled: 0, message: '昨日无待办数据，无需顺延' };
    }
    // 筛选未完成任务（排除已完成、已取消）
    var unfinished = yesterdayPlan.todayTodos.filter(function(t) {
      return !t.done;
    });
    if (unfinished.length === 0) {
      return { rolled: 0, message: '昨日无未完成任务' };
    }
    // 复制并追加到今日待办尾部（不覆盖今日已有任务）
    var todayPlan = this.getPlan(today);
    var rolled = 0;
    unfinished.forEach(function(t) {
      var newTodo = {
        id: this._genId(),
        title: t.title,
        done: false,
        priority: t.priority || 'P2',
        projectTag: t.projectTag || '',
        categoryTag: t.categoryTag || '',
        note: t.note || '',
        source: 'auto_rollover',
        createdAt: Date.now()
      };
      todayPlan.todayTodos.push(newTodo);
      rolled++;
    }.bind(this));
    this._savePlan(today, todayPlan);
    return { rolled: rolled, message: '已顺延 ' + rolled + ' 条未完成任务到今日' };
  },

  // ===== 账目台账 =====
  addExpense(data) {
    var expenses = this.get(this.KEYS.EXPENSES) || [];
    var expense = {
      id: this._genId(), date: data.date || this.today(),
      category: data.category || '其他', amount: parseFloat(data.amount) || 0,
      desc: data.desc || '', createdAt: Date.now()
    };
    expenses.push(expense); this.set(this.KEYS.EXPENSES, expenses); return expense;
  },

  updateExpense(id, updates) {
    var expenses = this.get(this.KEYS.EXPENSES) || [];
    var exp = expenses.find(function(e) { return e.id === id; });
    if (exp) { Object.assign(exp, updates); this.set(this.KEYS.EXPENSES, expenses); }
  },

  deleteExpense(id) {
    var expenses = this.get(this.KEYS.EXPENSES) || [];
    this.set(this.KEYS.EXPENSES, expenses.filter(function(e) { return e.id !== id; }));
  },

  // ===== 备忘录 =====
  addNote(data) {
    var notes = this.get(this.KEYS.NOTES) || [];
    var note = {
      id: this._genId(), date: data.date || this.today(),
      title: data.title || '无标题', content: data.content || '', createdAt: Date.now()
    };
    notes.push(note); this.set(this.KEYS.NOTES, notes); return note;
  },

  updateNote(id, updates) {
    var notes = this.get(this.KEYS.NOTES) || [];
    var note = notes.find(function(n) { return n.id === id; });
    if (note) { Object.assign(note, updates); this.set(this.KEYS.NOTES, notes); }
  },

  deleteNote(id) {
    var notes = this.get(this.KEYS.NOTES) || [];
    this.set(this.KEYS.NOTES, notes.filter(function(n) { return n.id !== id; }));
  },

  // ===== 习惯打卡 =====
  addHabit(data) {
    var habits = this.get(this.KEYS.HABITS) || [];
    var habit = { id: this._genId(), name: data.name || '', icon: data.icon || 'star', history: {}, createdAt: Date.now() };
    habits.push(habit); this.set(this.KEYS.HABITS, habits); return habit;
  },

  toggleHabit(id, date) {
    var habits = this.get(this.KEYS.HABITS) || [];
    var habit = habits.find(function(h) { return h.id === id; });
    if (habit) {
      if (!habit.history) habit.history = {};
      habit.history[date] = !habit.history[date];
      if (!habit.history[date]) delete habit.history[date];
      this.set(this.KEYS.HABITS, habits);
    }
  },

  deleteHabit(id) {
    var habits = this.get(this.KEYS.HABITS) || [];
    this.set(this.KEYS.HABITS, habits.filter(function(h) { return h.id !== id; }));
  },

  getHabitStreak(habit) {
    if (!habit.history) return 0;
    var streak = 0;
    var d = new Date();
    var todayStr = this.formatDate(d);
    if (!habit.history[todayStr]) d.setDate(d.getDate() - 1);
    while (true) {
      var ds = this.formatDate(d);
      if (habit.history[ds]) { streak++; d.setDate(d.getDate() - 1); } else break;
    }
    return streak;
  },

  // ===== 项目看板 =====
  addProject(data) {
    var projects = this.get(this.KEYS.PROJECTS) || [];
    var project = { id: this._genId(), name: data.name || '', status: data.status || 'todo', createdAt: Date.now() };
    projects.push(project); this.set(this.KEYS.PROJECTS, projects); return project;
  },

  updateProjectStatus(id, status) {
    var projects = this.get(this.KEYS.PROJECTS) || [];
    var proj = projects.find(function(p) { return p.id === id; });
    if (proj) { proj.status = status; this.set(this.KEYS.PROJECTS, projects); }
  },

  deleteProject(id) {
    var projects = this.get(this.KEYS.PROJECTS) || [];
    this.set(this.KEYS.PROJECTS, projects.filter(function(p) { return p.id !== id; }));
  },

  // ===== 快捷指令历史 =====
  addQuickHistory(text, result) {
    var history = this.get(this.KEYS.QUICK_HISTORY) || [];
    history.unshift({ id: this._genId(), text: text, result: result, time: this.now() });
    if (history.length > 50) history.length = 50;
    this.set(this.KEYS.QUICK_HISTORY, history);
  },

  // ===== 归档 =====
  archiveMonth(yearMonth) {
    var archive = this.get(this.KEYS.ARCHIVE) || {};
    var tasks = (this.get(this.KEYS.TASKS) || []).filter(function(t) { return t.date.startsWith(yearMonth); });
    var expenses = (this.get(this.KEYS.EXPENSES) || []).filter(function(e) { return e.date.startsWith(yearMonth); });
    var notes = (this.get(this.KEYS.NOTES) || []).filter(function(n) { return n.date.startsWith(yearMonth); });
    archive[yearMonth] = { tasks: tasks, expenses: expenses, notes: notes, archivedAt: this.now() };
    this.set(this.KEYS.ARCHIVE, archive);
    var settings = this.get(this.KEYS.SETTINGS);
    settings.lastMonthlyArchive = yearMonth;
    this.set(this.KEYS.SETTINGS, settings);
    return { tasks: tasks.length, expenses: expenses.length, notes: notes.length };
  },

  archiveWeek(weekKey) {
    var archive = this.get(this.KEYS.ARCHIVE) || {};
    var parts = weekKey.split('-W');
    var year = parseInt(parts[0]);
    var week = parseInt(parts[1]);
    var dates = this._getWeekDates(year, week);
    var tasks = (this.get(this.KEYS.TASKS) || []).filter(function(t) { return dates.indexOf(t.date) >= 0; });
    var expenses = (this.get(this.KEYS.EXPENSES) || []).filter(function(e) { return dates.indexOf(e.date) >= 0; });
    archive[weekKey] = { tasks: tasks, expenses: expenses, archivedAt: this.now() };
    this.set(this.KEYS.ARCHIVE, archive);
    var settings = this.get(this.KEYS.SETTINGS);
    settings.lastWeeklyArchive = weekKey;
    this.set(this.KEYS.SETTINGS, settings);
    return { tasks: tasks.length, expenses: expenses.length };
  },

  // ===== 导出/导入 =====
  exportAll() {
    var data = {};
    var self = this;
    Object.entries(this.KEYS).forEach(function(entry) {
      var name = entry[0], key = entry[1];
      data[name] = self.get(key);
    });
    data._exportTime = this.now();
    data._version = '1.0';
    return data;
  },

  importAll(data) {
    try {
      var self = this;
      Object.entries(this.KEYS).forEach(function(entry) {
        var name = entry[0], key = entry[1];
        if (data[name] !== undefined) self._save(key, data[name]);
      });
      this._ensureDefaults();
      return true;
    } catch (e) {
      console.error('[Storage] import fail:', e);
      return false;
    }
  },

  clearAll() {
    var self = this;
    Object.values(this.KEYS).forEach(function(key) { localStorage.removeItem(self.PREFIX + key); });
    this.cache = {}; this.init();
  },

  addSchedulerLog(taskName, status, error) {
    var log = this.get(this.KEYS.SCHEDULER_LOG) || [];
    log.unshift({ task: taskName, status: status, error: error || '', time: this.now() });
    if (log.length > 100) log.length = 100;
    this.set(this.KEYS.SCHEDULER_LOG, log);
  },

  // ===== 时政热点资讯 (memory/news/) =====
  getNewsBriefing: function(date) {
    var all = this.get(this.KEYS.NEWS_BRIEFINGS) || {};
    return all[date] || null;
  },

  createNewsBriefing: function(date) {
    var all = this.get(this.KEYS.NEWS_BRIEFINGS) || {};
    if (all[date]) return all[date];
    var briefing = {
      date: date,
      autoGenerated: true,
      webFetched: false,
      createdAt: this.now(),
      sections: { macro: [], ai: [], expo: [], livelihood: [] }
    };
    all[date] = briefing;
    this.set(this.KEYS.NEWS_BRIEFINGS, all);
    return briefing;
  },

  isNewsWebFetched: function(date) {
    var all = this.get(this.KEYS.NEWS_BRIEFINGS) || {};
    return !!(all[date] && all[date].webFetched === true);
  },

  setNewsWebFetched: function(date) {
    var all = this.get(this.KEYS.NEWS_BRIEFINGS) || {};
    if (!all[date]) {
      all[date] = { date: date, autoGenerated: true, webFetched: false, createdAt: this.now(), sections: { macro: [], ai: [], expo: [], livelihood: [] } };
    }
    all[date].webFetched = true;
    this.set(this.KEYS.NEWS_BRIEFINGS, all);
  },

  saveNewsBriefingFromWeb: function(date, sections) {
    var all = this.get(this.KEYS.NEWS_BRIEFINGS) || {};
    all[date] = {
      date: date,
      autoGenerated: true,
      webFetched: true,
      webFetchedAt: this.now(),
      createdAt: all[date] ? all[date].createdAt : this.now(),
      sections: sections
    };
    this.set(this.KEYS.NEWS_BRIEFINGS, all);
  },

  addNewsItem: function(date, section, data) {
    var all = this.get(this.KEYS.NEWS_BRIEFINGS) || {};
    if (!all[date]) { all[date] = this.createNewsBriefing(date); }
    var item = {
      id: this._genId(),
      title: data.title || '',
      summary: data.summary || '',
      source: data.source || '',
      impact: '',
      thought: '',
      favorited: false,
      createdAt: Date.now()
    };
    all[date].sections[section].push(item);
    this.set(this.KEYS.NEWS_BRIEFINGS, all);
    return item;
  },

  updateNewsItem: function(date, section, itemId, updates) {
    var all = this.get(this.KEYS.NEWS_BRIEFINGS) || {};
    if (!all[date]) return;
    var item = all[date].sections[section].find(function(x) { return x.id === itemId; });
    if (item) { Object.assign(item, updates); this.set(this.KEYS.NEWS_BRIEFINGS, all); }
  },

  deleteNewsItem: function(date, section, itemId) {
    var all = this.get(this.KEYS.NEWS_BRIEFINGS) || {};
    if (!all[date]) return;
    all[date].sections[section] = all[date].sections[section].filter(function(x) { return x.id !== itemId; });
    this.set(this.KEYS.NEWS_BRIEFINGS, all);
  },

  getNewsFavorites: function() {
    return this.get(this.KEYS.NEWS_FAVORITES) || [];
  },

  addNewsFavorite: function(date, section, item) {
    var favs = this.getNewsFavorites();
    if (favs.find(function(f) { return f.id === item.id; })) return false;
    favs.push({
      id: item.id, date: date, section: section,
      title: item.title, summary: item.summary, source: item.source,
      impact: item.impact || '', thought: item.thought || '',
      favoritedAt: this.now()
    });
    this.set(this.KEYS.NEWS_FAVORITES, favs);
    this.updateNewsItem(date, section, item.id, { favorited: true });
    return true;
  },

  removeNewsFavorite: function(itemId) {
    var favs = this.getNewsFavorites();
    favs = favs.filter(function(f) { return f.id !== itemId; });
    this.set(this.KEYS.NEWS_FAVORITES, favs);
    var all = this.get(this.KEYS.NEWS_BRIEFINGS) || {};
    Object.keys(all).forEach(function(date) {
      Object.keys(all[date].sections).forEach(function(sec) {
        var item = all[date].sections[sec].find(function(x) { return x.id === itemId; });
        if (item) item.favorited = false;
      });
    });
    this.set(this.KEYS.NEWS_BRIEFINGS, all);
  },

  getNewsInspirations: function() {
    return this.get(this.KEYS.NEWS_INSPIRATIONS) || [];
  },

  addNewsInspiration: function(text, source) {
    var insps = this.getNewsInspirations();
    insps.unshift({
      id: this._genId(), text: text, source: source || '',
      date: this.today(), createdAt: this.now()
    });
    if (insps.length > 200) insps.length = 200;
    this.set(this.KEYS.NEWS_INSPIRATIONS, insps);
    return insps[0];
  },

  getWeeklyNewsBriefings: function() {
    var now = new Date();
    var startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    var endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    var startStr = this.formatDate(startOfWeek);
    var endStr = this.formatDate(endOfWeek);
    var all = this.get(this.KEYS.NEWS_BRIEFINGS) || {};
    var result = [];
    Object.keys(all).forEach(function(date) {
      if (date >= startStr && date <= endStr) result.push(all[date]);
    });
    result.sort(function(a, b) { return a.date < b.date ? -1 : 1; });
    return { briefings: result, start: startStr, end: endStr };
  },

  getArchivedBriefingDates: function() {
    var all = this.get(this.KEYS.NEWS_BRIEFINGS) || {};
    return Object.keys(all).sort().reverse();
  },

  exportNewsIndustryViews: function() {
    var favs = this.getNewsFavorites();
    if (favs.length === 0) return '收藏库暂无内容';
    var lines = [];
    lines.push('=== 行业观点收藏库 ===');
    lines.push('导出时间: ' + this.now());
    lines.push('共计: ' + favs.length + ' 条');
    lines.push('');
    var sections = { macro: '宏观经贸政策', ai: 'AI科技产业', expo: '展会投融资', livelihood: '民生热点' };
    Object.keys(sections).forEach(function(sec) {
      var items = favs.filter(function(f) { return f.section === sec; });
      if (items.length === 0) return;
      lines.push('【' + sections[sec] + '】');
      items.forEach(function(item, i) {
        lines.push((i + 1) + '. [' + item.date + '] ' + item.title);
        if (item.summary) lines.push('   摘要: ' + item.summary);
        if (item.source) lines.push('   来源: ' + item.source);
        if (item.impact) lines.push('   业务影响: ' + item.impact);
        if (item.thought) lines.push('   个人思考: ' + item.thought);
        lines.push('');
      });
    });
    return lines.join('\n');
  },

  // ===== 英语学习 =====
  getEnglishData: function() {
    var d = this.get(this.KEYS.ENGLISH);
    if (!d) {
      d = {
        records: [],
        dailyGoal: 20,
        goal: { name: '上海海事大学 MBA 备考', tag: '商务管理', totalWords: 200, dailyPush: 20 },
        weekCheckin: 7,
        wordStatus: {}
      };
      this.set(this.KEYS.ENGLISH, d);
    } else {
      // 兼容老数据
      if (!d.goal) d.goal = { name: '上海海事大学 MBA 备考', tag: '商务管理', totalWords: 200, dailyPush: 20 };
      if (!d.wordStatus) d.wordStatus = {};
      if (typeof d.weekCheckin !== 'number') d.weekCheckin = 7;
    }
    return d;
  },
  addEnglishRecord: function(data) {
    var d = this.getEnglishData();
    d.records.push({
      id: this._genId(), date: data.date || this.today(),
      type: data.type || '单词记忆', content: data.content || '',
      duration: parseInt(data.duration) || 0, notes: data.notes || '',
      createdAt: Date.now()
    });
    this.set(this.KEYS.ENGLISH, d);
  },
  deleteEnglishRecord: function(id) {
    var d = this.getEnglishData();
    d.records = d.records.filter(function(r) { return r.id !== id; });
    this.set(this.KEYS.ENGLISH, d);
  },
  saveEnglishGoal: function(goal) {
    var d = this.getEnglishData();
    d.goal = Object.assign({}, d.goal, goal);
    this.set(this.KEYS.ENGLISH, d);
  },
  setEnglishWordStatus: function(word, status) {
    var d = this.getEnglishData();
    if (status) {
      d.wordStatus[word] = { status: status, updatedAt: this.now() };
    } else {
      delete d.wordStatus[word];
    }
    this.set(this.KEYS.ENGLISH, d);
  },
  getEnglishWordStatus: function(word) {
    var d = this.getEnglishData();
    return (d.wordStatus && d.wordStatus[word]) ? d.wordStatus[word].status : null;
  },
  getEnglishWeekCheckin: function() {
    var d = this.getEnglishData();
    var now = new Date();
    var start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    var end = new Date(start);
    end.setDate(start.getDate() + 7);
    var dates = {};
    d.records.forEach(function(r) { dates[r.date] = true; });
    var count = 0;
    for (var day = new Date(start); day < end; day.setDate(day.getDate() + 1)) {
      var ds = this.formatDate(day);
      if (dates[ds]) count++;
    }
    return count;
  },
  getEnglishOralCount: function() {
    var d = this.getEnglishData();
    return d.records.filter(function(r) { return r.type === '口语练习'; }).length;
  },
  getEnglishTodayMinutes: function() {
    var today = this.today();
    var d = this.getEnglishData();
    return d.records.filter(function(r) { return r.date === today; })
      .reduce(function(s, r) { return s + r.duration; }, 0);
  },
  getEnglishStreak: function() {
    var d = this.getEnglishData();
    if (d.records.length === 0) return 0;
    var dates = {};
    d.records.forEach(function(r) { dates[r.date] = true; });
    var streak = 0;
    var day = new Date();
    var todayStr = this.formatDate(day);
    if (!dates[todayStr]) day.setDate(day.getDate() - 1);
    while (true) {
      var ds = this.formatDate(day);
      if (dates[ds]) { streak++; day.setDate(day.getDate() - 1); } else break;
    }
    return streak;
  },

  // ===== 每日单词 =====
  getDailyWords: function(date) {
    var all = this.get(this.KEYS.DAILY_WORDS) || {};
    return all[date] || null;
  },
  isDailyWordsFetched: function(date) {
    var all = this.get(this.KEYS.DAILY_WORDS) || {};
    return !!(all[date] && all[date].webFetched === true);
  },
  saveDailyWords: function(date, words) {
    var all = this.get(this.KEYS.DAILY_WORDS) || {};
    all[date] = { date: date, words: words, webFetched: true, fetchedAt: this.now() };
    this.set(this.KEYS.DAILY_WORDS, all);
  },
  getDailyWordsDates: function() {
    var all = this.get(this.KEYS.DAILY_WORDS) || {};
    return Object.keys(all).filter(function(k) { return k.length === 10; }).sort().reverse();
  },

  // ===== 读书记录 =====
  getReadingData: function() {
    var d = this.get(this.KEYS.READING);
    if (!d) { d = { books: [] }; this.set(this.KEYS.READING, d); }
    return d;
  },
  addBook: function(data) {
    var d = this.getReadingData();
    var book = {
      id: this._genId(), title: data.title || '', author: data.author || '',
      category: data.category || '', totalPages: parseInt(data.totalPages) || 0,
      currentPage: 0, status: '想读', startDate: '', finishDate: '',
      rating: 0, notes: '', createdAt: Date.now()
    };
    d.books.push(book);
    this.set(this.KEYS.READING, d);
    return book;
  },
  updateBook: function(id, updates) {
    var d = this.getReadingData();
    var b = d.books.find(function(x) { return x.id === id; });
    if (b) { Object.assign(b, updates); this.set(this.KEYS.READING, d); }
  },
  deleteBook: function(id) {
    var d = this.getReadingData();
    d.books = d.books.filter(function(b) { return b.id !== id; });
    this.set(this.KEYS.READING, d);
  },

  // ===== 运动锻炼 =====
  getExerciseData: function() {
    var d = this.get(this.KEYS.EXERCISE);
    if (!d) { d = { records: [], weeklyGoal: 3 }; this.set(this.KEYS.EXERCISE, d); }
    return d;
  },
  addExerciseRecord: function(data) {
    var d = this.getExerciseData();
    d.records.push({
      id: this._genId(), date: data.date || this.today(),
      type: data.type || '跑步', duration: parseInt(data.duration) || 0,
      intensity: data.intensity || '中等', notes: data.notes || '',
      createdAt: Date.now()
    });
    this.set(this.KEYS.EXERCISE, d);
  },
  deleteExerciseRecord: function(id) {
    var d = this.getExerciseData();
    d.records = d.records.filter(function(r) { return r.id !== id; });
    this.set(this.KEYS.EXERCISE, d);
  },
  getExerciseWeekCount: function() {
    var now = new Date();
    var start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    var startStr = this.formatDate(start);
    var d = this.getExerciseData();
    return d.records.filter(function(r) { return r.date >= startStr; }).length;
  },

  // ===== 每日灵感 =====
  getInspirations: function() {
    return this.get(this.KEYS.INSPIRATIONS) || [];
  },
  addInspiration: function(text, source) {
    var list = this.getInspirations();
    list.unshift({
      id: this._genId(), text: text, source: source || '手动',
      date: this.today(), favorited: false, createdAt: Date.now()
    });
    if (list.length > 500) list.length = 500;
    this.set(this.KEYS.INSPIRATIONS, list);
    return list[0];
  },
  toggleInspirationFavorite: function(id) {
    var list = this.getInspirations();
    var item = list.find(function(x) { return x.id === id; });
    if (item) { item.favorited = !item.favorited; this.set(this.KEYS.INSPIRATIONS, list); }
  },
  deleteInspiration: function(id) {
    var list = this.getInspirations();
    this.set(this.KEYS.INSPIRATIONS, list.filter(function(x) { return x.id !== id; }));
  },

  // ===== 历史上的今天 =====
  // 结构: { "YYYY-MM-DD": { date, entries: [{title,year,category,story,source}], viewedAt } }
  getHistoryToday: function(date) {
    var all = this.get(this.KEYS.HISTORY_TODAY) || {};
    return all[date] || null;
  },
  saveHistoryToday: function(date, entry, source) {
    var all = this.get(this.KEYS.HISTORY_TODAY) || {};
    if (!all[date]) {
      all[date] = { date: date, entries: [], viewedAt: this.now() };
    }
    // 去重：标题相同则跳过
    var exists = all[date].entries.some(function(e) { return e.title === entry.title; });
    if (!exists) {
      all[date].entries.push(Object.assign({ source: source || 'local' }, entry));
    }
    all[date].viewedAt = this.now();
    this.set(this.KEYS.HISTORY_TODAY, all);
  },
  addHistoryExtraEntries: function(date, entries) {
    var all = this.get(this.KEYS.HISTORY_TODAY) || {};
    if (!all[date]) {
      all[date] = { date: date, entries: [], viewedAt: this.now() };
    }
    var added = 0;
    var self = this;
    entries.forEach(function(entry) {
      var exists = all[date].entries.some(function(e) { return e.title === entry.title; });
      if (!exists) {
        all[date].entries.push(Object.assign({ source: 'web' }, entry));
        added++;
      }
    });
    all[date].viewedAt = self.now();
    self.set(self.KEYS.HISTORY_TODAY, all);
    return added;
  },
  getHistoryDates: function() {
    var all = this.get(this.KEYS.HISTORY_TODAY) || {};
    return Object.keys(all).sort().reverse();
  },
  setHistoryWebFetched: function(date) {
    var all = this.get(this.KEYS.HISTORY_TODAY) || {};
    if (!all[date]) all[date] = { date: date, entries: [], viewedAt: this.now() };
    all[date].webFetched = true;
    this.set(this.KEYS.HISTORY_TODAY, all);
  },
  isHistoryWebFetched: function(date) {
    var all = this.get(this.KEYS.HISTORY_TODAY) || {};
    return !!(all[date] && all[date].webFetched === true);
  },
  replaceHistoryEntries: function(date, entries) {
    var all = this.get(this.KEYS.HISTORY_TODAY) || {};
    all[date] = { date: date, entries: entries, viewedAt: this.now(), webFetched: true };
    this.set(this.KEYS.HISTORY_TODAY, all);
  },

  // ===== 每日为什么 =====
  getDailyWhy: function(date) {
    var all = this.get(this.KEYS.DAILY_WHY) || {};
    return all[date] || null;
  },
  saveDailyWhy: function(date, entry) {
    var all = this.get(this.KEYS.DAILY_WHY) || {};
    if (!all.seenIds) all.seenIds = [];
    all[date] = { date: date, entry: entry, viewedAt: this.now() };
    if (all.seenIds.indexOf(entry.id) === -1) {
      all.seenIds.push(entry.id);
      if (all.seenIds.length > 500) all.seenIds = all.seenIds.slice(-500);
    }
    all.lastDate = date;
    this.set(this.KEYS.DAILY_WHY, all);
  },
  getDailyWhySeenIds: function() {
    var all = this.get(this.KEYS.DAILY_WHY) || {};
    return all.seenIds || [];
  },
  getDailyWhyDates: function() {
    var all = this.get(this.KEYS.DAILY_WHY) || {};
    return Object.keys(all).filter(function(k) { return k.length === 10; }).sort().reverse();
  },
  isDailyWhyWebFetched: function(date) {
    var all = this.get(this.KEYS.DAILY_WHY) || {};
    return !!(all[date] && all[date].webFetched === true);
  },
  saveDailyWhyWebEntry: function(date, entry) {
    var all = this.get(this.KEYS.DAILY_WHY) || {};
    if (!all.seenIds) all.seenIds = [];
    all[date] = { date: date, entry: entry, viewedAt: this.now(), webFetched: true };
    if (all.seenIds.indexOf(entry.id) === -1) {
      all.seenIds.push(entry.id);
      if (all.seenIds.length > 500) all.seenIds = all.seenIds.slice(-500);
    }
    all.lastDate = date;
    this.set(this.KEYS.DAILY_WHY, all);
  },

  // ===== 工时统计 =====
  getMonthData: function(yearMonth) {
    var all = this.get(this.KEYS.WORK_HOUR) || {};
    if (!all[yearMonth]) {
      all[yearMonth] = { days: {}, settled: false, lastSettleDate: '' };
      this.set(this.KEYS.WORK_HOUR, all);
    }
    return all[yearMonth];
  },
  _saveMonthData: function(yearMonth, data) {
    var all = this.get(this.KEYS.WORK_HOUR) || {};
    all[yearMonth] = data;
    this.set(this.KEYS.WORK_HOUR, all);
  },
  addClockRecord: function(date, clockIn, clockOut, note) {
    var ym = date.substring(0, 7);
    var data = this.getMonthData(ym);
    if (!data.days[date]) data.days[date] = { type: 'workday', clockIn: '', clockOut: '', directHours: null, effectiveHours: 0, settled: false, note: '', isTrip: false };
    data.days[date].clockIn = clockIn;
    data.days[date].clockOut = clockOut;
    data.days[date].note = note || '';
    data.days[date].effectiveHours = this._calcEffectiveHours(clockIn, clockOut);
    this._saveMonthData(ym, data);
  },
  setDirectHours: function(date, hours, note) {
    var ym = date.substring(0, 7);
    var data = this.getMonthData(ym);
    if (!data.days[date]) data.days[date] = { type: 'workday', clockIn: '', clockOut: '', directHours: null, effectiveHours: 0, settled: false, note: '', isTrip: false };
    data.days[date].directHours = parseFloat(hours);
    data.days[date].effectiveHours = parseFloat(hours);
    data.days[date].note = note || '';
    this._saveMonthData(ym, data);
  },
  toggleTripDay: function(date) {
    var ym = date.substring(0, 7);
    var data = this.getMonthData(ym);
    if (!data.days[date]) data.days[date] = { type: 'workday', clockIn: '', clockOut: '', directHours: null, effectiveHours: 0, settled: false, note: '', isTrip: false };
    data.days[date].isTrip = !data.days[date].isTrip;
    this._saveMonthData(ym, data);
    return data.days[date].isTrip;
  },
  deleteClockRecord: function(date) {
    var ym = date.substring(0, 7);
    var data = this.getMonthData(ym);
    delete data.days[date];
    this._saveMonthData(ym, data);
  },
  _calcEffectiveHours: function(clockIn, clockOut) {
    if (!clockIn || !clockOut) return 0;
    var inParts = clockIn.split(':');
    var outParts = clockOut.split(':');
    var inMin = parseInt(inParts[0]) * 60 + parseInt(inParts[1]);
    var outMin = parseInt(outParts[0]) * 60 + parseInt(outParts[1]);
    var diff = outMin - inMin;
    if (diff < 0) diff += 24 * 60; // overnight
    // Subtract 1 hour lunch break if > 6 hours
    if (diff > 360) diff -= 60;
    return Math.round(diff / 60 * 10) / 10;
  },
  getMonthSummary: function(yearMonth) {
    var data = this.getMonthData(yearMonth);
    var days = Object.keys(data.days).sort();
    var totalHours = 0;
    var workDays = 0;
    var tripDays = 0;
    var records = [];
    days.forEach(function(date) {
      var d = data.days[date];
      totalHours += d.effectiveHours || 0;
      if (d.effectiveHours > 0) workDays++;
      if (d.isTrip) tripDays++;
      records.push({ date: date, data: d });
    });
    var expectedHours = workDays * 8;
    var overtime = Math.max(0, totalHours - expectedHours);
    return {
      totalHours: Math.round(totalHours * 10) / 10,
      workDays: workDays,
      tripDays: tripDays,
      expectedHours: expectedHours,
      overtime: Math.round(overtime * 10) / 10,
      records: records,
      settled: data.settled
    };
  },
  settleDay: function(date) {
    var ym = date.substring(0, 7);
    var data = this.getMonthData(ym);
    if (data.days[date]) {
      data.days[date].settled = true;
      // Auto-earn comp time for overtime
      var hours = data.days[date].effectiveHours || 0;
      if (hours > 8) {
        this.addCompTransaction(date, 'earn', hours - 8, '当日加班自动转调休');
      }
      this._saveMonthData(ym, data);
    }
  },
  settleMonth: function(yearMonth) {
    var data = this.getMonthData(yearMonth);
    var self = this;
    Object.keys(data.days).forEach(function(date) {
      if (!data.days[date].settled) {
        data.days[date].settled = true;
        var hours = data.days[date].effectiveHours || 0;
        if (hours > 8) {
          self.addCompTransaction(date, 'earn', hours - 8, '月度结算加班转调休');
        }
      }
    });
    data.settled = true;
    data.lastSettleDate = this.today();
    this._saveMonthData(yearMonth, data);
  },
  resetMonth: function(yearMonth) {
    var data = { days: {}, settled: false, lastSettleDate: '' };
    this._saveMonthData(yearMonth, data);
  },
  exportLedger: function(yearMonth) {
    var summary = this.getMonthSummary(yearMonth);
    if (summary.records.length === 0) return '当月暂无打卡记录';
    var lines = [];
    lines.push('=== 工时台账 ' + yearMonth + ' ===');
    lines.push('导出时间: ' + this.now());
    lines.push('工作天数: ' + summary.workDays + ' 天');
    lines.push('出差天数: ' + summary.tripDays + ' 天');
    lines.push('总工时: ' + summary.totalHours + ' 小时');
    lines.push('应出勤: ' + summary.expectedHours + ' 小时');
    lines.push('加班: ' + summary.overtime + ' 小时');
    lines.push('');
    lines.push('日期        上班    下班    直接工时  有效工时  出差  结算  备注');
    lines.push('----------  ------  ------  --------  --------  ----  ----  ----');
    summary.records.forEach(function(r) {
      var d = r.data;
      var line = r.date + '  ' +
        (d.clockIn || '--').padEnd(6, ' ') + '  ' +
        (d.clockOut || '--').padEnd(6, ' ') + '  ' +
        (d.directHours !== null ? String(d.directHours) : '--').padEnd(8, ' ') + '  ' +
        String(d.effectiveHours || 0).padEnd(8, ' ') + '  ' +
        (d.isTrip ? '是' : '否').padEnd(4, ' ') + '  ' +
        (d.settled ? '已结' : '未结') + '  ' +
        (d.note || '');
      lines.push(line);
    });
    return lines.join('\n');
  },

  // ===== 调休流水 =====
  getCompTime: function() {
    return this.get(this.KEYS.COMP_TIME) || { balance: 0, transactions: [] };
  },
  addCompTransaction: function(date, type, amount, note) {
    var ct = this.getCompTime();
    ct.transactions.push({
      id: this._genId(), date: date, type: type,
      amount: parseFloat(amount) || 0, note: note || '', createdAt: this.now()
    });
    if (type === 'earn') ct.balance += parseFloat(amount) || 0;
    else ct.balance -= parseFloat(amount) || 0;
    ct.balance = Math.round(ct.balance * 10) / 10;
    this.set(this.KEYS.COMP_TIME, ct);
  },
  useCompTime: function(date, hours, note) {
    var ct = this.getCompTime();
    if (ct.balance < hours) return false;
    this.addCompTransaction(date, 'use', hours, note || '调休使用');
    return true;
  },

  // ===== 工具 =====
  _genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); },
  today() { return this.formatDate(new Date()); },
  now() { return new Date().toISOString(); },
  formatDate(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  },
  formatTime(date) {
    var h = String(date.getHours()).padStart(2, '0');
    var m = String(date.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  },
  getWeekKey(date) {
    var d = new Date(date);
    var year = d.getFullYear();
    var start = new Date(year, 0, 1);
    var diff = (d - start) / (1000 * 60 * 60 * 24);
    var week = Math.ceil((diff + start.getDay() + 1) / 7);
    return year + '-W' + String(week).padStart(2, '0');
  },
  getMonthKey(date) {
    var d = new Date(date);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  },
  getLastDayOfMonth(year, month) { return new Date(year, month, 0).getDate(); },
  _getWeekDates(year, week) {
    var dates = [];
    var start = new Date(year, 0, 1);
    var dayOffset = (week - 1) * 7 - start.getDay() + 1;
    for (var i = 0; i < 7; i++) {
      var d = new Date(year, 0, dayOffset + i);
      if (d.getFullYear() === year) dates.push(this.formatDate(d));
    }
    return dates;
  },
  getStorageSize() {
    var total = 0;
    var self = this;
    Object.values(this.KEYS).forEach(function(key) {
      var raw = localStorage.getItem(self.PREFIX + key);
      if (raw) total += raw.length;
    });
    return Math.round(total / 1024);
  }
};
