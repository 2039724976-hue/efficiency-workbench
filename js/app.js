var App = {
  currentWindow: 'dailyPlan',
  isPC: false,
  pcRightTopTab: 'workHours',
  pcRightBottomTab: 'reading',
  windows: [
    { id: 'dailyPlan', icon: '\u{1F4CB}', label: '\u6BCF\u65E5\u8BA1\u5212', group: 'left' },
    { id: 'workHours', icon: '\u{1F552}', label: '\u5DE5\u65F6\u7EDF\u8BA1', group: 'rightTop' },
    { id: 'news', icon: '\u{1F4F0}', label: '\u65F6\u653F\u70ED\u70B9', group: 'rightTop' },
    { id: 'english', icon: '\u{1F524}', label: '\u82F1\u8BED\u5B66\u4E60', group: 'rightTop' },
    { id: 'historyToday', icon: '\u{1F4DC}', label: '历史今天', group: 'rightTop' },
    { id: 'reading', icon: '\u{1F4DA}', label: '\u8BFB\u4E66\u8BB0\u5F55', group: 'rightBottom' },
    { id: 'exercise', icon: '\u{1F4AA}', label: '\u8FD0\u52A8\u953B\u70BC', group: 'rightBottom' },
    { id: 'inspiration', icon: '\u{1F4A1}', label: '\u6BCF\u65E5\u7075\u611F', group: 'rightBottom' },
    { id: 'dailyWhy', icon: '❓', label: '每天为什么', group: 'rightBottom' }
  ],
  init: function() {
    Storage.init();
    this.isPC = window.innerWidth >= 900;
    this.renderTabBar();
    this.render();
    Scheduler.init();
    var self = this;
    window.addEventListener('resize', function() {
      var wasPC = self.isPC;
      self.isPC = window.innerWidth >= 900;
      if (wasPC !== self.isPC) self.render();
    });
    var input = document.getElementById('quickInput');
    if (input) {
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') self.handleQuickCommand();
      });
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(function() {});
    }
  },
  renderTabBar: function() {
    var scroll = document.getElementById('tabScroll');
    if (!scroll) return;
    var html = '';
    this.windows.forEach(function(w) {
      html += '<div class="tab-item' + (w.id === 'dailyPlan' ? ' active' : '') + '" data-window="' + w.id + '" onclick="App.switchWindow(\'' + w.id + '\')">';
      html += '<span class="tab-icon">' + w.icon + '</span>';
      html += '<span class="tab-label">' + w.label + '</span></div>';
    });
    scroll.innerHTML = html;
  },
  switchWindow: function(id) {
    this.currentWindow = id;
    if (this.isPC) {
      var w = this.windows.find(function(x) { return x.id === id; });
      if (w) {
        if (w.group === 'rightTop') this.pcRightTopTab = id;
        if (w.group === 'rightBottom') this.pcRightBottomTab = id;
      }
    }
    var items = document.querySelectorAll('.tab-item');
    items.forEach(function(item) {
      item.classList.toggle('active', item.getAttribute('data-window') === id);
    });
    this.render();
  },
  render: function() {
    var main = document.getElementById('mainContent');
    if (!main) return;
    if (this.isPC) { this._renderPC(main); } else { this._renderMobile(main); }
  },
  _renderMobile: function(container) {
    container.className = 'main-content';
    container.innerHTML = '<div class="window fade-in">' + this._getWindowHTML(this.currentWindow) + '</div>';
  },
  _renderPC: function(container) {
    container.className = 'main-content';
    var leftWin = this.windows.find(function(w) { return w.group === 'left'; });
    var rightTopWins = this.windows.filter(function(w) { return w.group === 'rightTop'; });
    var rightBottomWins = this.windows.filter(function(w) { return w.group === 'rightBottom'; });
    var html = '';
    html += '<div class="pc-left-column"><div class="window-title">' + leftWin.icon + ' ' + leftWin.label + '</div>' + this._getWindowHTML('dailyPlan') + '</div>';
    html += '<div class="pc-right-top"><div class="pc-tabs">';
    var self = this;
    rightTopWins.forEach(function(w) {
      html += '<div class="pc-tab' + (w.id === self.pcRightTopTab ? ' active' : '') + '" onclick="App.switchWindow(\'' + w.id + '\')">' + w.icon + ' ' + w.label + '</div>';
    });
    html += '</div><div class="pc-tab-content active">' + this._getWindowHTML(this.pcRightTopTab) + '</div></div>';
    html += '<div class="pc-right-bottom"><div class="pc-tabs">';
    rightBottomWins.forEach(function(w) {
      html += '<div class="pc-tab' + (w.id === self.pcRightBottomTab ? ' active' : '') + '" onclick="App.switchWindow(\'' + w.id + '\')">' + w.icon + ' ' + w.label + '</div>';
    });
    html += '</div><div class="pc-tab-content active">' + this._getWindowHTML(this.pcRightBottomTab) + '</div></div>';
    container.innerHTML = html;
  },
  _getWindowHTML: function(id) {
    switch (id) {
      case 'dailyPlan': return this.renderDailyPlan();

      case 'workHours': return this.renderWorkHours();
      case 'news': return this.renderNews();
      case 'english': return this.renderEnglish();
      case 'reading': return this.renderReading();
      case 'exercise': return this.renderExercise();
      case 'inspiration': return this.renderInspiration();

      case 'historyToday': return this.renderHistoryToday();
      case 'dailyWhy': return this.renderDailyWhy();
      default: return '<div class="empty-state"><div class="empty-icon">\u{1F430}</div><div class="empty-text">\u5F00\u53D1\u4E2D</div></div>';
    }
  },
  _esc: function(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },
  // ===== Window 1: Daily Plan (多模块计划) =====
  renderDailyPlan: function() {
    var today = Storage.today();
    var now = new Date();
    var wd = ['\u65E5', '\u4E00', '\u4E8C', '\u4E09', '\u56DB', '\u4E94', '\u516D'];
    var plan = Storage.getPlan(today);
    var todos = plan.todayTodos;
    var done = todos.filter(function(t) { return t.done; }).length;
    var total = todos.length;
    var rate = total > 0 ? Math.round(done / total * 100) : 0;
    var rolledCount = todos.filter(function(t) { return t.source === 'auto_rollover'; }).length;
    var h = '';
    // 日期头部
    h += '<div class="date-display"><div class="date-day">' + now.getDate() + '</div>';
    h += '<div class="date-info">' + (now.getMonth() + 1) + '\u6708 \u661F\u671F' + wd[now.getDay()] + ' \u00B7 ' + today + '</div></div>';
    // 进度条
    if (total > 0) {
      h += '<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:15px;color:#888;"><span>\u5B8C\u6210\u8FDB\u5EA6</span><span>' + done + '/' + total + ' (' + rate + '%)' + (rolledCount > 0 ? ' \u00B7 \u987A\u5EF6' + rolledCount + '\u6761' : '') + '</span></div>';
      h += '<div class="progress-bar"><div class="progress-fill" style="width:' + rate + '%;"></div></div></div>';
    }
    // === 今日待办 (核心模块) ===
    h += '<div class="plan-section">';
    h += '<div class="plan-section-header"><div class="plan-section-title">\u{1F4CB} \u4ECA\u65E5\u5F85\u529E</div>';
    h += '<div class="plan-section-actions">';
    h += '<button class="btn-icon-sm" onclick="App.showPlanTodoModal()" title="\u65B0\u589E">+</button>';
    h += '<button class="btn-icon-sm btn-icon-yellow" onclick="App.clearCompletedPlanTodos()" title="\u6E05\u7A7A\u5DF2\u5B8C\u6210">\u{1F5D1}\uFE0F</button>';
    h += '</div></div>';
    if (todos.length === 0) {
      h += '<div class="empty-state-sm"><div class="empty-text">\u4ECA\u65E5\u8FD8\u6CA1\u6709\u5F85\u529E<br>\u70B9\u51FB + \u6DFB\u52A0\u7B2C\u4E00\u4E2A\u4EFB\u52A1</div></div>';
    } else {
      var self = this;
      todos.forEach(function(t) {
        var pc = t.priority === 'P0' ? 'prio-p0' : t.priority === 'P1' ? 'prio-p1' : 'prio-p2';
        h += '<div class="todo-item' + (t.done ? ' done' : '') + '">';
        h += '<div class="todo-check' + (t.done ? ' checked' : '') + '" onclick="App.togglePlanTodo(\'' + t.id + '\')">' + (t.done ? '\u2713' : '') + '</div>';
        h += '<div class="todo-body">';
        h += '<div class="todo-title-row"><span class="todo-text">' + self._esc(t.title) + '</span></div>';
        h += '<div class="todo-tags-row">';
        h += '<span class="prio-tag ' + pc + '">' + t.priority + '</span>';
        if (t.projectTag) h += '<span class="meta-tag tag-blue">' + self._esc(t.projectTag) + '</span>';
        if (t.categoryTag) h += '<span class="meta-tag tag-lavender">' + self._esc(t.categoryTag) + '</span>';
        if (t.source === 'auto_rollover') h += '<span class="meta-tag tag-yellow">\u987A\u5EF6</span>';
        h += '</div>';
        if (t.note) h += '<div class="todo-note">' + self._esc(t.note) + '</div>';
        h += '</div>';
        h += '<button class="task-delete" onclick="App.deletePlanTodo(\'' + t.id + '\')">\u00D7</button>';
        h += '</div>';
      });
    }
    h += '</div>';
    // === 月度目标 ===
    h += this._renderPlanSubModule(today, 'monthlyGoals', '\u{1F3AF} \u6708\u5EA6\u76EE\u6807', plan.monthlyGoals, 'addMonthlyGoal');
    // === 周任务 ===
    h += this._renderPlanSubModule(today, 'weeklyTasks', '\u{1F4C5} \u5468\u4EFB\u52A1', plan.weeklyTasks, 'addWeeklyTask');
    // === 时间规划 ===
    h += this._renderTimePlanModule(today, plan.timePlan);
    // === 待跟进清单 ===
    h += this._renderFollowUpModule(today, plan.followUp);
    // === 当日卡点记录 ===
    h += this._renderBlockersModule(today, plan.blockers);
    return h;
  },
  // 子模块渲染：月度目标、周任务 (简单勾选列表)
  _renderPlanSubModule: function(date, field, title, items, addFn) {
    var h = '<div class="plan-section"><div class="plan-section-header"><div class="plan-section-title">' + title + '</div>';
    h += '<button class="btn-icon-sm" onclick="App.showPlanTextInput(\'' + field + '\',\'' + addFn + '\')">+</button></div>';
    if (items.length === 0) {
      h += '<div class="empty-state-sm"><div class="empty-text">\u6682\u65E0</div></div>';
    } else {
      var self = this;
      items.forEach(function(item) {
        var fn = field === 'monthlyGoals' ? 'App.toggleMonthlyGoal' : 'App.toggleWeeklyTask';
        var dfn = field === 'monthlyGoals' ? 'App.deleteMonthlyGoal' : 'App.deleteWeeklyTask';
        h += '<div class="checkbox-item' + (item.done ? ' done' : '') + '" onclick="' + fn + '(\'' + item.id + '\')">';
        h += '<div class="checkbox-circle"></div><span class="task-text">' + self._esc(item.text) + '</span>';
        h += '<button class="task-delete" onclick="event.stopPropagation();' + dfn + '(\'' + item.id + '\')">\u00D7</button></div>';
      });
    }
    h += '</div>';
    return h;
  },
  // 时间规划模块
  _renderTimePlanModule: function(date, items) {
    var h = '<div class="plan-section"><div class="plan-section-header"><div class="plan-section-title">\u{1F552} \u65F6\u95F4\u89C4\u5212</div>';
    h += '<button class="btn-icon-sm" onclick="App.showTimeSlotModal()">+</button></div>';
    if (items.length === 0) {
      h += '<div class="empty-state-sm"><div class="empty-text">\u6682\u65E0\u65F6\u95F4\u5B89\u6392</div></div>';
    } else {
      var self = this;
      items.forEach(function(item) {
        h += '<div class="time-slot-item"><span class="time-slot-time">' + self._esc(item.time) + '</span>';
        h += '<span class="time-slot-content">' + self._esc(item.content) + '</span>';
        h += '<button class="task-delete" onclick="App.deleteTimeSlot(\'' + item.id + '\')">\u00D7</button></div>';
      });
    }
    h += '</div>';
    return h;
  },
  // 待跟进清单模块
  _renderFollowUpModule: function(date, items) {
    var h = '<div class="plan-section"><div class="plan-section-header"><div class="plan-section-title">\u{1F501} \u5F85\u8DDF\u8FDB\u6E05\u5355</div>';
    h += '<button class="btn-icon-sm" onclick="App.showFollowUpModal()">+</button></div>';
    if (items.length === 0) {
      h += '<div class="empty-state-sm"><div class="empty-text">\u6682\u65E0\u5F85\u8DDF\u8FDB\u4E8B\u9879</div></div>';
    } else {
      var self = this;
      items.forEach(function(item) {
        h += '<div class="followup-item"><div class="followup-text">' + self._esc(item.text) + '</div>';
        if (item.contact) h += '<div class="followup-contact">\u{1F4DE} ' + self._esc(item.contact) + '</div>';
        h += '<button class="task-delete" onclick="App.deleteFollowUp(\'' + item.id + '\')">\u00D7</button></div>';
      });
    }
    h += '</div>';
    return h;
  },
  // 当日卡点记录模块
  _renderBlockersModule: function(date, items) {
    var h = '<div class="plan-section"><div class="plan-section-header"><div class="plan-section-title">\u{1F6A7} \u5F53\u65E5\u5361\u70B9\u8BB0\u5F55</div>';
    h += '<button class="btn-icon-sm" onclick="App.showBlockerModal()">+</button></div>';
    if (items.length === 0) {
      h += '<div class="empty-state-sm"><div class="empty-text">\u6682\u65E0\u5361\u70B9</div></div>';
    } else {
      var self = this;
      items.forEach(function(item) {
        h += '<div class="blocker-item"><span class="blocker-icon">\u{1F6A7}</span>';
        h += '<span class="blocker-text">' + self._esc(item.text) + '</span>';
        h += '<button class="task-delete" onclick="App.deleteBlocker(\'' + item.id + '\')">\u00D7</button></div>';
      });
    }
    h += '</div>';
    return h;
  },
  // --- Plan 操作方法 ---
  togglePlanTodo: function(id) { Storage.togglePlanTodo(Storage.today(), id); this.render(); },
  deletePlanTodo: function(id) { Storage.deletePlanTodo(Storage.today(), id); this.render(); },
  toggleMonthlyGoal: function(id) { Storage.toggleMonthlyGoal(Storage.today(), id); this.render(); },
  deleteMonthlyGoal: function(id) { Storage.deleteMonthlyGoal(Storage.today(), id); this.render(); },
  toggleWeeklyTask: function(id) { Storage.toggleWeeklyTask(Storage.today(), id); this.render(); },
  deleteWeeklyTask: function(id) { Storage.deleteWeeklyTask(Storage.today(), id); this.render(); },
  deleteTimeSlot: function(id) { Storage.deleteTimeSlot(Storage.today(), id); this.render(); },
  deleteFollowUp: function(id) { Storage.deleteFollowUp(Storage.today(), id); this.render(); },
  deleteBlocker: function(id) { Storage.deleteBlocker(Storage.today(), id); this.render(); },
  clearCompletedPlanTodos: function() {
    var n = Storage.clearCompletedPlanTodos(Storage.today());
    this.render();
    this.showToast(n > 0 ? '\u2705 \u5DF2\u6E05\u9664' + n + '\u6761\u5DF2\u5B8C\u6210\u4EFB\u52A1' : '\u6CA1\u6709\u5DF2\u5B8C\u6210\u7684\u4EFB\u52A1');
  },
  // 新增今日待办弹窗
  showPlanTodoModal: function() {
    var h = '<div class="modal-title">\u65B0\u589E\u4ECA\u65E5\u5F85\u529E</div><div class="modal-body">';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">\u4EFB\u52A1\u6807\u9898</label><input type="text" class="input-field" id="todoTitle" placeholder="\u8F93\u5165\u4EFB\u52A1\u6807\u9898..."></div>';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">\u4F18\u5148\u7EA7</label><select class="select-field" id="todoPriority"><option value="P0">P0 \u7D27\u6025</option><option value="P1">P1 \u91CD\u8981</option><option value="P2" selected>P2 \u666E\u901A</option></select></div>';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">\u9879\u76EE\u6807\u7B7E</label><input type="text" class="input-field" id="todoProject" placeholder="\u5982\uFF1ACRM\u7CFB\u7EDF\u3001\u62A5\u9500\u7BA1\u7406..."></div>';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">\u5206\u7C7B\u6807\u7B7E</label><input type="text" class="input-field" id="todoCategory" placeholder="\u5982\uFF1A\u5F00\u53D1\u3001\u8BBE\u8BA1\u3001\u8FD0\u8425..."></div>';
    h += '<div><label class="modal-label">\u5907\u6CE8</label><textarea class="input-field" id="todoNote" placeholder="\u53EF\u9009\u5907\u6CE8..." style="min-height:80px;"></textarea></div>';
    h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">\u53D6\u6D88</button><button class="btn btn-primary" onclick="App.savePlanTodo()">\u4FDD\u5B58</button></div>';
    this.showModal(h);
  },
  savePlanTodo: function() {
    var title = document.getElementById('todoTitle').value.trim();
    if (!title) { this.showToast('\u26A0\uFE0F \u8BF7\u8F93\u5165\u4EFB\u52A1\u6807\u9898'); return; }
    Storage.addPlanTodo(Storage.today(), {
      title: title,
      priority: document.getElementById('todoPriority').value,
      projectTag: document.getElementById('todoProject').value.trim(),
      categoryTag: document.getElementById('todoCategory').value.trim(),
      note: document.getElementById('todoNote').value.trim()
    });
    this.closeModal(); this.render(); this.showToast('\u2705 \u5DF2\u6DFB\u52A0');
  },
  // 通用文本输入弹窗 (月度目标、周任务)
  showPlanTextInput: function(field, addFn) {
    var title = field === 'monthlyGoals' ? '\u65B0\u589E\u6708\u5EA6\u76EE\u6807' : '\u65B0\u589E\u5468\u4EFB\u52A1';
    var ph = field === 'monthlyGoals' ? '\u8F93\u5165\u6708\u5EA6\u76EE\u6807...' : '\u8F93\u5165\u5468\u4EFB\u52A1...';
    var h = '<div class="modal-title">' + title + '</div><div class="modal-body">';
    h += '<input type="text" class="input-field" id="planTextInput" placeholder="' + ph + '"></div>';
    h += '<div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">\u53D6\u6D88</button><button class="btn btn-primary" onclick="App.savePlanText(\'' + addFn + '\')">\u4FDD\u5B58</button></div>';
    this.showModal(h);
  },
  savePlanText: function(addFn) {
    var input = document.getElementById('planTextInput');
    if (!input || !input.value.trim()) { this.showToast('\u26A0\uFE0F \u8BF7\u8F93\u5165\u5185\u5BB9'); return; }
    Storage[addFn](Storage.today(), input.value.trim());
    this.closeModal(); this.render(); this.showToast('\u2705 \u5DF2\u6DFB\u52A0');
  },
  // 时间规划弹窗
  showTimeSlotModal: function() {
    var h = '<div class="modal-title">\u65B0\u589E\u65F6\u95F4\u5B89\u6392</div><div class="modal-body">';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">\u65F6\u95F4</label><input type="time" class="input-field" id="tsTime"></div>';
    h += '<div><label class="modal-label">\u5185\u5BB9</label><input type="text" class="input-field" id="tsContent" placeholder="\u5B89\u6392\u5185\u5BB9..."></div>';
    h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">\u53D6\u6D88</button><button class="btn btn-primary" onclick="App.saveTimeSlot()">\u4FDD\u5B58</button></div>';
    this.showModal(h);
  },
  saveTimeSlot: function() {
    var time = document.getElementById('tsTime').value;
    var content = document.getElementById('tsContent').value.trim();
    if (!time || !content) { this.showToast('\u26A0\uFE0F \u8BF7\u586B\u5199\u65F6\u95F4\u548C\u5185\u5BB9'); return; }
    Storage.addTimeSlot(Storage.today(), time, content);
    this.closeModal(); this.render(); this.showToast('\u2705 \u5DF2\u6DFB\u52A0');
  },
  // 待跟进弹窗
  showFollowUpModal: function() {
    var h = '<div class="modal-title">\u65B0\u589E\u5F85\u8DDF\u8FDB</div><div class="modal-body">';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">\u8DDF\u8FDB\u4E8B\u9879</label><input type="text" class="input-field" id="fuText" placeholder="\u8F93\u5165\u8DDF\u8FDB\u4E8B\u9879..."></div>';
    h += '<div><label class="modal-label">\u8054\u7CFB\u5BF9\u8C61/\u6E20\u9053</label><input type="text" class="input-field" id="fuContact" placeholder="\u53EF\u9009..."></div>';
    h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">\u53D6\u6D88</button><button class="btn btn-primary" onclick="App.saveFollowUp()">\u4FDD\u5B58</button></div>';
    this.showModal(h);
  },
  saveFollowUp: function() {
    var text = document.getElementById('fuText').value.trim();
    if (!text) { this.showToast('\u26A0\uFE0F \u8BF7\u8F93\u5165\u8DDF\u8FDB\u4E8B\u9879'); return; }
    Storage.addFollowUp(Storage.today(), text, document.getElementById('fuContact').value.trim());
    this.closeModal(); this.render(); this.showToast('\u2705 \u5DF2\u6DFB\u52A0');
  },
  // 卡点弹窗
  showBlockerModal: function() {
    var h = '<div class="modal-title">\u8BB0\u5F55\u5361\u70B9</div><div class="modal-body">';
    h += '<textarea class="input-field" id="blkText" placeholder="\u63CF\u8FF0\u5F53\u524D\u9047\u5230\u7684\u5361\u70B9..." style="min-height:100px;"></textarea>';
    h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">\u53D6\u6D88</button><button class="btn btn-primary" onclick="App.saveBlocker()">\u4FDD\u5B58</button></div>';
    this.showModal(h);
  },
  saveBlocker: function() {
    var text = document.getElementById('blkText').value.trim();
    if (!text) { this.showToast('\u26A0\uFE0F \u8BF7\u8F93\u5165\u5361\u70B9\u63CF\u8FF0'); return; }
    Storage.addBlocker(Storage.today(), text);
    this.closeModal(); this.render(); this.showToast('\u2705 \u5DF2\u8BB0\u5F55');
  },
  // ===== Window 2: Quick Commands =====
  renderQuickCommands: function() {
    var h = '<div class="window-header"><div class="window-title">\u26A1 \u5FEB\u6377\u6307\u4EE4</div></div>';
    // 斜杠指令快捷按钮
    h += '<div class="cmd-quick-actions">';
    h += '<div class="cmd-quick-btn" style="background:#E8F4FD;color:#5BA4E5;" onclick="App.quickFill(\'/\u4ECA\u65E5\u89C4\u5212\')"><span style="font-size:24px;">\u{1F4CB}</span>\u4ECA\u65E5\u89C4\u5212</div>';
    h += '<div class="cmd-quick-btn" style="background:#FFF3B0;color:#8A6D00;" onclick="App.quickFill(\'/\u987A\u5EF6\u5F85\u529E\')"><span style="font-size:24px;">\u{1F504}</span>\u987A\u5EF6\u5F85\u529E</div>';
    h += '<div class="cmd-quick-btn" style="background:#D4F5DC;color:#2A8B3A;" onclick="App.quickFill(\'/\u540C\u6B65\u590D\u76D8\')"><span style="font-size:24px;">\u{1F4E4}</span>\u540C\u6B65\u590D\u76D8</div>';
    h += '<div class="cmd-quick-btn" style="background:#FFDDE1;color:#C44A52;" onclick="App.quickFill(\'/\u65B0\u589E\u4EFB\u52A1\')"><span style="font-size:24px;">\u{1F4DD}</span>\u65B0\u589E\u4EFB\u52A1</div>';
    h += '<div class="cmd-quick-btn" style="background:#EDE5FA;color:#7B5DB0;" onclick="App.quickFill(\'/\u6E05\u7A7A\u5DF2\u5B8C\u6210\')"><span style="font-size:24px;">\u{1F5D1}\uFE0F</span>\u6E05\u7A7A\u5DF2\u5B8C\u6210</div>';
    h += '<div class="cmd-quick-btn" style="background:#FFE8CC;color:#B07020;" onclick="App.quickFill(\'\u652F\u51FA \')"><span style="font-size:24px;">\u{1F4B0}</span>\u8BB0\u4E00\u7B14\u8D26</div>';
    h += '</div>';
    // \u65F6\u653F\u70ED\u70B9\u6307\u4EE4\u5FEB\u6377\u6309\u94AE
    h += '<div class="cmd-quick-actions">';
    h += '<div class="cmd-quick-btn" style="background:#E8F4FD;color:#5BA4E5;" onclick="App.quickFill(\'/\u4ECA\u65E5\u7B80\u62A5\')"><span style="font-size:24px;">\u{1F4F0}</span>\u4ECA\u65E5\u7B80\u62A5</div>';
    h += '<div class="cmd-quick-btn" style="background:#EDE5FA;color:#7B5DB0;" onclick="App.quickFill(\'/\u672C\u5468\u6C47\u603B\')"><span style="font-size:24px;">\u{1F4C5}</span>\u672C\u5468\u6C47\u603B</div>';
    h += '<div class="cmd-quick-btn" style="background:#FFF3B0;color:#8A6D00;" onclick="App.quickFill(\'/\u6536\u85CF\u70ED\u70B9\')"><span style="font-size:24px;">\u2B50</span>\u6536\u85CF\u70ED\u70B9</div>';
    h += '<div class="cmd-quick-btn" style="background:#D4F5DC;color:#2A8B3A;" onclick="App.quickFill(\'/\u540C\u6B65\u7075\u611F\')"><span style="font-size:24px;">\u{1F4A1}</span>\u540C\u6B65\u7075\u611F</div>';
    h += '<div class="cmd-quick-btn" style="background:#FFDDE1;color:#C44A52;" onclick="App.quickFill(\'/\u5BFC\u51FA\u884C\u4E1A\u89C2\u70B9\')"><span style="font-size:24px;">\u{1F4E4}</span>\u5BFC\u51FA\u89C2\u70B9</div>';
    h += '</div>';
    // 工时统计指令快捷按钮
    h += '<div class="cmd-quick-actions">';
    h += '<div class="cmd-quick-btn" style="background:#E8F4FD;color:#3B8BCC;" onclick="App.quickFill(\'/\u6253\u5361\')"><span style="font-size:24px;">\u{1F4CD}</span>\u6253\u5361</div>';
    h += '<div class="cmd-quick-btn" style="background:#FFF3B0;color:#8A6D00;" onclick="App.quickFill(\'/\u5F55\u5DE5\u65F6\')"><span style="font-size:24px;">\u{1F4DD}</span>\u5F55\u5DE5\u65F6</div>';
    h += '<div class="cmd-quick-btn" style="background:#D4F5DC;color:#2A8B3A;" onclick="App.quickFill(\'/\u8C03\u4F11\')"><span style="font-size:24px;">\u{1F3C4}</span>\u8C03\u4F11</div>';
    h += '<div class="cmd-quick-btn" style="background:#FFB347;color:#fff;" onclick="App.quickFill(\'/\u51FA\u5DEE\')"><span style="font-size:24px;">\u2708\uFE0F</span>\u51FA\u5DEE</div>';
    h += '<div class="cmd-quick-btn" style="background:#FFDDE1;color:#C44A52;" onclick="App.quickFill(\'/\u6708\u7ED3\')"><span style="font-size:24px;">\u{1F4CB}</span>\u6708\u7ED3</div>';
    h += '<div class="cmd-quick-btn" style="background:#EDE5FA;color:#7B5DB0;" onclick="App.quickFill(\'/\u5BFC\u51FA\u53F0\u8D26\')"><span style="font-size:24px;">\u{1F4E4}</span>\u5BFC\u51FA\u53F0\u8D26</div>';
    h += '</div>';
    // \u6307\u4EE4\u683C\u5F0F\u8BF4\u660E
    h += '<div class="card"><div class="card-title">\u{1F4D6} \u6307\u4EE4\u683C\u5F0F</div><div style="font-size:15px;line-height:2;color:#888;">';
    h += '<b style="color:#5BA4E5;">\u8BA1\u5212\u6307\u4EE4</b><br>';
    h += '/今日规划 \u2014 \u6253\u5F00\u4ECA\u65E5\u8BA1\u5212\u89C6\u56FE<br>';
    h += '/顺延待办 \u2014 \u624B\u52A8\u89E6\u53D1\u987A\u5EF6\u903B\u8F91<br>';
    h += '/新增任务 [标题] \u2014 \u5FEB\u901F\u65B0\u589E\u4ECA\u65E5\u5F85\u529E<br>';
    h += '/清空已完成 \u2014 \u6E05\u9664\u4ECA\u65E5\u5DF2\u5B8C\u6210\u4EFB\u52A1<br><br>';
    h += '<b style="color:#FFB347;">\u8D44\u8BAF\u6307\u4EE4</b><br>';
    h += '/今日简报 \u2014 \u624B\u52A8\u751F\u6210\u5F53\u65E5\u8D44\u8BAF\u7B80\u62A5<br>';
    h += '/本周汇总 \u2014 \u751F\u6210\u672C\u5468\u8D44\u8BAF\u6C47\u603B<br>';
    h += '/收藏热点 \u2014 \u67E5\u770B\u6536\u85CF\u5E93<br>';
    h += '/同步灵感 \u2014 \u63D0\u793A\u540C\u6B65\u70ED\u70B9\u611F\u609F<br>';
    h += '/导出行业观点 \u2014 \u5BFC\u51FA\u6536\u85CF\u884C\u4E1A\u89C2\u70B9\u6587\u672C<br><br>';
    h += '<b style="color:#4ECCA3;">\u5DE5\u65F6\u6307\u4EE4</b><br>';
    h += '/打卡 \u2014 \u8BB0\u5F55\u4E0A\u4E0B\u73ED\u65F6\u95F4<br>';
    h += '/录工时 \u2014 \u76F4\u63A5\u8F93\u5165\u5DE5\u65F6\u6570<br>';
    h += '/调休 \u2014 \u4F7F\u7528\u8C03\u4F11\u4F59\u989D<br>';
    h += '/出差 \u2014 \u6807\u8BB0/\u53D6\u6D88\u4ECA\u65E5\u51FA\u5DEE<br>';
    h += '/月结 \u2014 \u6708\u5EA6\u5DE5\u65F6\u7ED3\u7B97<br>';
    h += '/导出台账 \u2014 \u5BFC\u51FA\u672C\u6708\u5DE5\u65F6\u53F0\u8D26<br><br>';
    h += '<b style="color:#5BA4E5;">\u5176\u4ED6\u6307\u4EE4</b><br>';
    h += '\u8BA1\u5212 [\u5185\u5BB9] \u2014 \u6DFB\u52A0\u5230\u4ECA\u65E5\u8BA1\u5212<br>';
    h += '\u652F\u51FA [\u7C7B\u522B] [\u91D1\u989D] [\u63CF\u8FF0] \u2014 \u8BB0\u8D26<br>';
    h += '\u5907\u5FD8 [\u6807\u9898] [\u5185\u5BB9] \u2014 \u5199\u5907\u5FD8\u5F55<br>';
    h += '\u4E60\u60EF [\u540D\u79F0] \u2014 \u521B\u5EFA\u4E60\u60EF\u6253\u5361<br>';
    h += '\u9879\u76EE [\u540D\u79F0] \u2014 \u6DFB\u52A0\u9879\u76EE\u770B\u677F</div></div>';
    var history = Storage.get(Storage.KEYS.QUICK_HISTORY) || [];
    if (history.length > 0) {
      h += '<div class="card"><div class="card-title">\u{1F559} \u6700\u8FD1\u6307\u4EE4</div>';
      var self = this;
      history.slice(0, 10).forEach(function(item) {
        var time = new Date(item.time);
        var ts = String(time.getHours()).padStart(2, '0') + ':' + String(time.getMinutes()).padStart(2, '0');
        h += '<div class="cmd-item"><span class="cmd-time">' + ts + '</span><span>' + self._esc(item.text) + '</span></div>';
      });
      h += '</div>';
    }
    return h;
  },
  quickFill: function(prefix) {
    var input = document.getElementById('quickInput');
    if (input) { input.value = prefix; input.focus(); }
  },
  handleQuickCommand: function() {
    var input = document.getElementById('quickInput');
    if (!input || !input.value.trim()) return;
    var cmd = input.value.trim();
    input.value = '';
    var result = this._parseCommand(cmd);
    Storage.addQuickHistory(cmd, result);
    this.render();
    this.showToast(result);
  },
  _parseCommand: function(cmd) {
    var parts = cmd.split(/\s+/);
    var type = parts[0];
    var rest = parts.slice(1).join(' ');
    // ===== 斜杠指令 =====
    if (type === '/\u4ECA\u65E5\u89C4\u5212') {
      this.switchWindow('dailyPlan');
      return '\u2705 \u5DF2\u6253\u5F00\u4ECA\u65E5\u8BA1\u5212';
    }
    if (type === '/\u987A\u5EF6\u5F85\u529E') {
      try {
        var r = Storage.rolloverTodos();
        return '\u2705 ' + r.message;
      } catch (e) {
        return '\u26A0\uFE0F \u987A\u5EF6\u5931\u8D25: ' + e.message;
      }
    }
    if (type === '/\u65B0\u589E\u4EFB\u52A1') {
      if (!rest) { this.showPlanTodoModal(); return '\u{1F4DD} \u8BF7\u5728\u5F39\u7A97\u4E2D\u586B\u5199\u4EFB\u52A1\u8BE6\u60C5'; }
      Storage.addPlanTodo(Storage.today(), { title: rest });
      return '\u2705 \u5DF2\u65B0\u589E\u4EFB\u52A1: ' + rest;
    }
    if (type === '/\u6E05\u7A7A\u5DF2\u5B8C\u6210') {
      var n = Storage.clearCompletedPlanTodos(Storage.today());
      return n > 0 ? '\u2705 \u5DF2\u6E05\u9664' + n + '\u6761\u5DF2\u5B8C\u6210\u4EFB\u52A1' : '\u6CA1\u6709\u5DF2\u5B8C\u6210\u7684\u4EFB\u52A1';
    }
    // ===== \u65F6\u653F\u70ED\u70B9\u6307\u4EE4 =====
    if (type === '/\u4ECA\u65E5\u7B80\u62A5') {
      this.switchWindow('news');
      this.fetchNewsFromWeb(false);
      return '\u{1F504} \u6B63\u5728\u4ECE\u7F51\u7EDC\u83B7\u53D6\u65F6\u653F\u8D44\u8BAF\u2026';
    }
    if (type === '/\u672C\u5468\u6C47\u603B') {
      this.switchWindow('news');
      this.showWeeklyNewsSummary();
      return '\u{1F4C5} \u672C\u5468\u8D44\u8BAF\u6C47\u603B\u5DF2\u751F\u6210';
    }
    if (type === '/\u6536\u85CF\u70ED\u70B9') {
      this.switchWindow('news');
      this.showNewsFavoritesModal();
      return '\u2B50 \u6536\u85CF\u5E93\u5DF2\u6253\u5F00';
    }
    if (type === '/\u540C\u6B65\u7075\u611F') {
      this.switchWindow('news');
      return '\u{1F4A1} \u8BF7\u5728\u8D44\u8BAF\u5217\u8868\u4E2D\u70B9\u51FB \u{1F4A1} \u6309\u94AE\u540C\u6B65\u7075\u611F';
    }
    if (type === '/\u5BFC\u51FA\u884C\u4E1A\u89C2\u70B9') {
      this.switchWindow('news');
      this.doExportIndustryViews();
      return '\u{1F4E4} \u884C\u4E1A\u89C2\u70B9\u5DF2\u751F\u6210';
    }
    // ===== 新窗口指令 =====
    if (type === '/英语打卡') {
      this.switchWindow('english');
      this.showEnglishModal();
      return '\u{1F524} 请在弹窗中填写学习详情';
    }
    if (type === '/读书') {
      this.switchWindow('reading');
      if (rest) { this.showBookModal(); return '\u{1F4DA} 请在弹窗中完善书籍信息'; }
      return '\u{1F4DA} 请点击 + 添加按钮';
    }
    if (type === '/运动') {
      this.switchWindow('exercise');
      this.showExerciseModal();
      return '\u{1F4AA} 请在弹窗中填写运动详情';
    }
    if (type === '/灵感') {
      if (!rest) { this.switchWindow('inspiration'); this.showInspirationModal(); return '\u{1F4A1} 请在弹窗中记录灵感'; }
      Storage.addInspiration(rest, '手动');
      return '\u2705 灵感已记录';
    }
    // ===== 历史今天 & 每天为什么 =====
    if (type === '/历史上的今天') {
      this.switchWindow('historyToday');
      return '📜 已切换到历史今天';
    }
    if (type === '/刷新历史事件') {
      this.switchWindow('historyToday');
      this.fetchHistoryFromWeb();
      return '🔄 正在从网络获取历史事件…';
    }
    if (type === '/每天为什么') {
      this.switchWindow('dailyWhy');
      return '❓ 已切换到每天为什么';
    }
    // ===== 工时统计指令 =====
    if (type === '/打卡') {
      this.switchWindow('workHours');
      this.showClockInModal();
      return '\u{1F4CD} \u8BF7\u5728\u5F39\u7A97\u4E2D\u586B\u5199\u6253\u5361\u65F6\u95F4';
    }
    if (type === '/录工时') {
      this.switchWindow('workHours');
      this.showDirectHoursModal();
      return '\u{1F4DD} \u8BF7\u5728\u5F39\u7A97\u4E2D\u586B\u5199\u5DE5\u65F6';
    }
    if (type === '/调休') {
      this.switchWindow('workHours');
      this.showCompUseModal();
      return '\u{1F3C4} \u8BF7\u5728\u5F39\u7A97\u4E2D\u586B\u5199\u8C03\u4F11\u4FE1\u606F';
    }
    if (type === '/出差') {
      var today = Storage.today();
      var isTrip = Storage.toggleTripDay(today);
      this.switchWindow('workHours');
      return isTrip ? '\u2708\uFE0F \u4ECA\u65E5\u5DF2\u6807\u8BB0\u4E3A\u51FA\u5DEE' : '\u5DF2\u53D6\u6D88\u4ECA\u65E5\u51FA\u5DEE\u6807\u8BB0';
    }
    if (type === '/月结') {
      this.switchWindow('workHours');
      var ym = Storage.today().substring(0, 7);
      Storage.settleMonth(ym);
      this.render();
      return '\u2705 \u6708\u5EA6\u5DF2\u7ED3\u7B97';
    }
    if (type === '/导出台账') {
      this.switchWindow('workHours');
      this.exportLedger();
      return '\u{1F4E4} \u53F0\u8D26\u5BFC\u51FA\u4E2D';
    }
    // ===== 原有指令 =====
    if (type === '\u8BA1\u5212' || type === 'plan') {
      if (!rest) return '\u26A0\uFE0F \u8BF7\u8F93\u5165\u8BA1\u5212\u5185\u5BB9';
      Storage.addDailyTask(Storage.today(), rest);
      return '\u2705 \u5DF2\u6DFB\u52A0\u8BA1\u5212: ' + rest;
    }
    if (type === '\u4EFB\u52A1' || type === 'task') {
      if (!rest) return '\u26A0\uFE0F \u8BF7\u8F93\u5165\u4EFB\u52A1\u6807\u9898';
      Storage.addTask({ title: rest });
      return '\u2705 \u5DF2\u6DFB\u52A0\u4EFB\u52A1: ' + rest;
    }
    if (type === '\u652F\u51FA' || type === 'expense') {
      var cat = parts[1] || '\u5176\u4ED6';
      var amt = parseFloat(parts[2]) || 0;
      var desc = parts.slice(3).join(' ') || '';
      if (amt <= 0) return '\u26A0\uFE0F \u8BF7\u8F93\u5165\u6709\u6548\u91D1\u989D';
      Storage.addExpense({ category: cat, amount: amt, desc: desc });
      return '\u2705 \u5DF2\u8BB0\u8D26: ' + cat + ' ' + amt + '\u5143';
    }
    if (type === '\u5907\u5FD8' || type === 'note') {
      var title = parts[1] || '\u65E0\u6807\u9898';
      var content = parts.slice(2).join(' ') || '';
      Storage.addNote({ title: title, content: content });
      return '\u2705 \u5DF2\u4FDD\u5B58\u5907\u5FD8: ' + title;
    }
    if (type === '\u4E60\u60EF' || type === 'habit') {
      if (!rest) return '\u26A0\uFE0F \u8BF7\u8F93\u5165\u4E60\u60EF\u540D\u79F0';
      Storage.addHabit({ name: rest });
      return '\u2705 \u5DF2\u521B\u5EFA\u4E60\u60EF: ' + rest;
    }
    if (type === '\u9879\u76EE' || type === 'project') {
      if (!rest) return '\u26A0\uFE0F \u8BF7\u8F93\u5165\u9879\u76EE\u540D\u79F0';
      Storage.addProject({ name: rest });
      return '\u2705 \u5DF2\u6DFB\u52A0\u9879\u76EE: ' + rest;
    }
    return '\u26A0\uFE0F \u672A\u77E5\u6307\u4EE4: ' + type + '。可用: /今日规划 /顺延待办 /新增任务 /清空已完成';
  },
  // ===== Window 3: Task Ledger =====
  renderTaskLedger: function() {
    var h = '<div class="window-header"><div class="window-title">\u{1F4DD} \u4EFB\u52A1\u53F0\u8D26</div><button class="btn btn-primary btn-sm" onclick="App.showTaskModal()">+ \u65B0\u589E</button></div>';
    var tasks = Storage.get(Storage.KEYS.TASKS) || [];
    if (tasks.length === 0) {
      h += '<div class="empty-state"><div class="empty-icon">\u{1F4DD}</div><div class="empty-text">\u6682\u65E0\u4EFB\u52A1\u8BB0\u5F55</div></div>';
    } else {
      h += '<div class="table-wrap"><table class="data-table"><thead><tr><th>\u65E5\u671F</th><th>\u4EFB\u52A1</th><th>\u72B6\u6001</th><th>\u4F18\u5148\u7EA7</th><th>\u622A\u6B62</th><th>\u64CD\u4F5C</th></tr></thead><tbody>';
      var self = this;
      tasks.slice().reverse().forEach(function(t) {
        var st = t.status === '\u5DF2\u5B8C\u6210' ? 'tag-mint' : t.status === '\u8FDB\u884C\u4E2D' ? 'tag-blue' : 'tag-yellow';
        var pr = t.priority === '\u7D27\u6025' ? 'tag-pink' : t.priority === '\u91CD\u8981' ? 'tag-orange' : 'tag-lavender';
        h += '<tr><td>' + t.date + '</td><td>' + self._esc(t.title) + '</td>';
        h += '<td><span class="tag ' + st + '">' + t.status + '</span></td>';
        h += '<td><span class="tag ' + pr + '">' + t.priority + '</span></td>';
        h += '<td>' + (t.dueDate || '-') + '</td>';
        h += '<td><button class="btn btn-sm btn-danger" onclick="App.deleteTask(\'' + t.id + '\')">\u5220\u9664</button></td></tr>';
      });
      h += '</tbody></table></div>';
    }
    return h;
  },
  showTaskModal: function() {
    var h = '<div class="modal-title">\u65B0\u589E\u4EFB\u52A1</div><div class="modal-body">';
    h += '<div style="margin-bottom:12px;"><label style="font-size:15px;color:#888;display:block;margin-bottom:6px;">\u4EFB\u52A1\u6807\u9898</label><input type="text" class="input-field" id="taskTitle" placeholder="\u8F93\u5165\u4EFB\u52A1\u6807\u9898..."></div>';
    h += '<div style="margin-bottom:12px;"><label style="font-size:15px;color:#888;display:block;margin-bottom:6px;">\u72B6\u6001</label><select class="select-field" id="taskStatus"><option>\u5F85\u5904\u7406</option><option>\u8FDB\u884C\u4E2D</option><option>\u5DF2\u5B8C\u6210</option></select></div>';
    h += '<div style="margin-bottom:12px;"><label style="font-size:15px;color:#888;display:block;margin-bottom:6px;">\u4F18\u5148\u7EA7</label><select class="select-field" id="taskPriority"><option>\u666E\u901A</option><option>\u91CD\u8981</option><option>\u7D27\u6025</option></select></div>';
    h += '<div><label style="font-size:15px;color:#888;display:block;margin-bottom:6px;">\u622A\u6B62\u65E5\u671F</label><input type="date" class="input-field" id="taskDue"></div>';
    h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">\u53D6\u6D88</button><button class="btn btn-primary" onclick="App.saveTask()">\u4FDD\u5B58</button></div>';
    this.showModal(h);
  },
  saveTask: function() {
    var title = document.getElementById('taskTitle').value.trim();
    if (!title) { this.showToast('\u26A0\uFE0F \u8BF7\u8F93\u5165\u4EFB\u52A1\u6807\u9898'); return; }
    Storage.addTask({ title: title, status: document.getElementById('taskStatus').value, priority: document.getElementById('taskPriority').value, dueDate: document.getElementById('taskDue').value });
    this.closeModal(); this.render(); this.showToast('\u2705 \u4EFB\u52A1\u5DF2\u6DFB\u52A0');
  },
  deleteTask: function(id) { Storage.deleteTask(id); this.render(); this.showToast('\u5DF2\u5220\u9664'); },
  // ===== Window 4: Expense Ledger =====
  renderExpenseLedger: function() {
    var h = '<div class="window-header"><div class="window-title">\u{1F4B0} \u8D26\u76EE\u53F0\u8D26</div><button class="btn btn-primary btn-sm" onclick="App.showExpenseModal()">+ \u8BB0\u8D26</button></div>';
    var expenses = Storage.get(Storage.KEYS.EXPENSES) || [];
    var mk = Storage.getMonthKey(new Date());
    var me = expenses.filter(function(e) { return e.date.startsWith(mk); });
    var mt = me.reduce(function(s, e) { return s + e.amount; }, 0);
    h += '<div class="stat-grid">';
    h += '<div class="stat-card"><div class="stat-icon">\u{1F4B8}</div><div class="stat-value">\u00A5' + mt.toFixed(2) + '</div><div class="stat-label">\u672C\u6708\u652F\u51FA</div></div>';
    h += '<div class="stat-card"><div class="stat-icon">\u{1F4CA}</div><div class="stat-value">' + me.length + '</div><div class="stat-label">\u672C\u6708\u7B14\u6570</div></div>';
    h += '</div>';
    if (expenses.length === 0) {
      h += '<div class="empty-state"><div class="empty-icon">\u{1F4B0}</div><div class="empty-text">\u6682\u65E0\u8D26\u76EE\u8BB0\u5F55</div></div>';
    } else {
      h += '<div class="table-wrap"><table class="data-table"><thead><tr><th>\u65E5\u671F</th><th>\u7C7B\u522B</th><th>\u91D1\u989D</th><th>\u8BF4\u660E</th><th>\u64CD\u4F5C</th></tr></thead><tbody>';
      var self = this;
      expenses.slice().reverse().forEach(function(e) {
        var ct = 'tag-yellow';
        if (e.category === '\u9910\u996E') ct = 'tag-orange';
        else if (e.category === '\u4EA4\u901A') ct = 'tag-blue';
        else if (e.category === '\u4F4F\u5BBF') ct = 'tag-pink';
        else if (e.category === '\u8D2D\u7269') ct = 'tag-lavender';
        else if (e.category === '\u5176\u4ED6') ct = 'tag-mint';
        h += '<tr><td>' + e.date + '</td><td><span class="tag ' + ct + '">' + e.category + '</span></td>';
        h += '<td style="font-weight:700;color:#FF9AA2;">\u00A5' + e.amount.toFixed(2) + '</td>';
        h += '<td>' + self._esc(e.desc || '-') + '</td>';
        h += '<td><button class="btn btn-sm btn-danger" onclick="App.deleteExpense(\'' + e.id + '\')">\u5220\u9664</button></td></tr>';
      });
      h += '</tbody></table></div>';
    }
    return h;
  },
  showExpenseModal: function() {
    var h = '<div class="modal-title">\u8BB0\u4E00\u7B14\u8D26</div><div class="modal-body">';
    h += '<div style="margin-bottom:12px;"><label style="font-size:15px;color:#888;display:block;margin-bottom:6px;">\u65E5\u671F</label><input type="date" class="input-field" id="expDate" value="' + Storage.today() + '"></div>';
    h += '<div style="margin-bottom:12px;"><label style="font-size:15px;color:#888;display:block;margin-bottom:6px;">\u8D39\u7528\u7C7B\u522B</label><select class="select-field" id="expCategory"><option>\u9910\u996E</option><option>\u4EA4\u901A</option><option>\u4F4F\u5BBF</option><option>\u8D2D\u7269</option><option>\u5176\u4ED6</option></select></div>';
    h += '<div style="margin-bottom:12px;"><label style="font-size:15px;color:#888;display:block;margin-bottom:6px;">\u91D1\u989D</label><input type="number" class="input-field" id="expAmount" placeholder="0.00" step="0.01"></div>';
    h += '<div><label style="font-size:15px;color:#888;display:block;margin-bottom:6px;">\u8BF4\u660E</label><input type="text" class="input-field" id="expDesc" placeholder="\u53EF\u9009..."></div>';
    h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">\u53D6\u6D88</button><button class="btn btn-primary" onclick="App.saveExpense()">\u4FDD\u5B58</button></div>';
    this.showModal(h);
  },
  saveExpense: function() {
    var amt = parseFloat(document.getElementById('expAmount').value);
    if (!amt || amt <= 0) { this.showToast('\u26A0\uFE0F \u8BF7\u8F93\u5165\u6709\u6548\u91D1\u989D'); return; }
    Storage.addExpense({ date: document.getElementById('expDate').value, category: document.getElementById('expCategory').value, amount: amt, desc: document.getElementById('expDesc').value.trim() });
    this.closeModal(); this.render(); this.showToast('\u2705 \u5DF2\u8BB0\u8D26');
  },
  deleteExpense: function(id) { Storage.deleteExpense(id); this.render(); this.showToast('\u5DF2\u5220\u9664'); },
  // ===== Window 5: Notes =====
  renderNotes: function() {
    var h = '<div class="window-header"><div class="window-title">\u{1F4CC} \u5907\u5FD8\u5F55</div><button class="btn btn-primary btn-sm" onclick="App.showNoteModal()">+ \u65B0\u5EFA</button></div>';
    var notes = Storage.get(Storage.KEYS.NOTES) || [];
    if (notes.length === 0) {
      h += '<div class="empty-state"><div class="empty-icon">\u{1F4CC}</div><div class="empty-text">\u6682\u65E0\u5907\u5FD8\u5F55</div></div>';
    } else {
      var self = this;
      notes.slice().reverse().forEach(function(n) {
        h += '<div class="note-card" onclick="App.showNoteModal(\'' + n.id + '\')">';
        h += '<div class="note-title">' + self._esc(n.title) + '</div>';
        h += '<div class="note-preview">' + self._esc(n.content) + '</div>';
        h += '<div class="note-date">' + n.date + '</div></div>';
      });
    }
    return h;
  },
  showNoteModal: function(id) {
    var note = null;
    if (id) { var notes = Storage.get(Storage.KEYS.NOTES) || []; note = notes.find(function(n) { return n.id === id; }); }
    var h = '<div class="modal-title">' + (note ? '\u7F16\u8F91\u5907\u5FD8' : '\u65B0\u5EFA\u5907\u5FD8') + '</div><div class="modal-body">';
    h += '<div style="margin-bottom:12px;"><input type="text" class="input-field" id="noteTitle" placeholder="\u6807\u9898" value="' + (note ? this._esc(note.title) : '') + '"></div>';
    h += '<textarea class="input-field" id="noteContent" placeholder="\u8F93\u5165\u5185\u5BB9..." style="min-height:160px;">' + (note ? this._esc(note.content) : '') + '</textarea>';
    h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">\u53D6\u6D88</button>';
    if (note) h += '<button class="btn btn-danger" onclick="App.deleteNote(\'' + note.id + '\')">\u5220\u9664</button>';
    h += '<button class="btn btn-primary" onclick="App.saveNote(' + (note ? "'" + note.id + "'" : 'null') + ')">\u4FDD\u5B58</button></div>';
    this.showModal(h);
  },
  saveNote: function(id) {
    var title = document.getElementById('noteTitle').value.trim() || '\u65E0\u6807\u9898';
    var content = document.getElementById('noteContent').value.trim();
    if (id) { Storage.updateNote(id, { title: title, content: content }); }
    else { Storage.addNote({ title: title, content: content }); }
    this.closeModal(); this.render(); this.showToast('\u2705 \u5DF2\u4FDD\u5B58');
  },
  deleteNote: function(id) { Storage.deleteNote(id); this.closeModal(); this.render(); this.showToast('\u5DF2\u5220\u9664'); },
  // ===== Window 6: Habits =====
  renderHabits: function() {
    var h = '<div class="window-header"><div class="window-title">\u2705 \u4E60\u60EF\u6253\u5361</div><button class="btn btn-primary btn-sm" onclick="App.showHabitModal()">+ \u65B0\u5EFA</button></div>';
    var habits = Storage.get(Storage.KEYS.HABITS) || [];
    var today = Storage.today();
    if (habits.length === 0) {
      h += '<div class="empty-state"><div class="empty-icon">\u2705</div><div class="empty-text">\u6682\u65E0\u4E60\u60EF\u6253\u5361<br>\u521B\u5EFA\u7B2C\u4E00\u4E2A\u4E60\u60EF\u5F00\u59CB\u5427</div></div>';
    } else {
      habits.forEach(function(hb) {
        var checked = hb.history && hb.history[today];
        var streak = Storage.getHabitStreak(hb);
        h += '<div class="habit-item">';
        h += '<div class="habit-check' + (checked ? ' checked' : '') + '" onclick="App.toggleHabit(\'' + hb.id + '\')">' + (checked ? '\u2713' : '') + '</div>';
        h += '<div class="habit-info"><div class="habit-name">' + this._esc(hb.name) + '</div>';
        h += '<div class="habit-streak">\u{1F525} \u8FDE\u7EED' + streak + '\u5929</div></div>';
        h += '<button class="task-delete" onclick="App.deleteHabit(\'' + hb.id + '\')">\u00D7</button></div>';
      }.bind(this));
    }
    return h;
  },
  showHabitModal: function() {
    var h = '<div class="modal-title">\u521B\u5EFA\u4E60\u60EF</div><div class="modal-body"><input type="text" class="input-field" id="habitName" placeholder="\u4E60\u60EF\u540D\u79F0\uFF0C\u5982\uFF1A\u6BCF\u65E5\u8BFB\u4E66"></div>';
    h += '<div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">\u53D6\u6D88</button><button class="btn btn-primary" onclick="App.saveHabit()">\u521B\u5EFA</button></div>';
    this.showModal(h);
  },
  saveHabit: function() {
    var name = document.getElementById('habitName').value.trim();
    if (!name) { this.showToast('\u26A0\uFE0F \u8BF7\u8F93\u5165\u4E60\u60EF\u540D\u79F0'); return; }
    Storage.addHabit({ name: name });
    this.closeModal(); this.render(); this.showToast('\u2705 \u4E60\u60EF\u5DF2\u521B\u5EFA');
  },
  toggleHabit: function(id) { Storage.toggleHabit(id, Storage.today()); this.render(); },
  deleteHabit: function(id) { Storage.deleteHabit(id); this.render(); this.showToast('\u5DF2\u5220\u9664'); },
  // ===== Window 7: Project Board =====
  renderProjectBoard: function() {
    var h = '<div class="window-header"><div class="window-title">\u{1F3AF} \u9879\u76EE\u770B\u677F</div><button class="btn btn-primary btn-sm" onclick="App.showProjectModal()">+ \u65B0\u589E</button></div>';
    var projects = Storage.get(Storage.KEYS.PROJECTS) || [];
    var cols = [
      { key: 'todo', title: '\u{1F4CB} \u5F85\u529E', color: '#FFF3B0' },
      { key: 'doing', title: '\u{1F504} \u8FDB\u884C\u4E2D', color: '#E8F4FD' },
      { key: 'done', title: '\u2705 \u5DF2\u5B8C\u6210', color: '#D4F5DC' }
    ];
    h += '<div class="kanban-board">';
    var self = this;
    cols.forEach(function(col) {
      var items = projects.filter(function(p) { return p.status === col.key; });
      h += '<div class="kanban-column" style="background:' + col.color + ';">';
      h += '<div class="kanban-column-header"><div class="kanban-column-title">' + col.title + '</div><span class="tag tag-blue">' + items.length + '</span></div>';
      items.forEach(function(p) {
        h += '<div class="kanban-card"><span class="card-name">' + self._esc(p.name) + '</span>';
        h += '<div class="kanban-actions">';
        if (col.key === 'todo') h += '<button onclick="App.moveProject(\'' + p.id + '\',\'doing\')">\u2192</button>';
        if (col.key === 'doing') h += '<button onclick="App.moveProject(\'' + p.id + '\',\'done\')">\u2713</button>';
        h += '<button onclick="App.deleteProject(\'' + p.id + '\')">\u00D7</button></div></div>';
      });
      if (items.length === 0) h += '<div style="text-align:center;padding:20px;color:#B0B0B0;font-size:15px;">\u6682\u65E0</div>';
      h += '</div>';
    });
    h += '</div>';
    return h;
  },
  showProjectModal: function() {
    var h = '<div class="modal-title">\u65B0\u589E\u9879\u76EE</div><div class="modal-body"><input type="text" class="input-field" id="projName" placeholder="\u9879\u76EE\u540D\u79F0"></div>';
    h += '<div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">\u53D6\u6D88</button><button class="btn btn-primary" onclick="App.saveProject()">\u6DFB\u52A0</button></div>';
    this.showModal(h);
  },
  saveProject: function() {
    var name = document.getElementById('projName').value.trim();
    if (!name) { this.showToast('\u26A0\uFE0F \u8BF7\u8F93\u5165\u9879\u76EE\u540D\u79F0'); return; }
    Storage.addProject({ name: name });
    this.closeModal(); this.render(); this.showToast('\u2705 \u9879\u76EE\u5DF2\u6DFB\u52A0');
  },
  moveProject: function(id, status) { Storage.updateProjectStatus(id, status); this.render(); },
  deleteProject: function(id) { Storage.deleteProject(id); this.render(); this.showToast('\u5DF2\u5220\u9664'); },
  // ===== Window 8: Stats =====
  renderStats: function() {
    var h = '<div class="window-header"><div class="window-title">\u{1F4CA} \u7EDF\u8BA1\u6982\u89C8</div></div>';
    var tasks = Storage.get(Storage.KEYS.TASKS) || [];
    var expenses = Storage.get(Storage.KEYS.EXPENSES) || [];
    var notes = Storage.get(Storage.KEYS.NOTES) || [];
    var habits = Storage.get(Storage.KEYS.HABITS) || [];
    var projects = Storage.get(Storage.KEYS.PROJECTS) || [];
    var today = Storage.today();
    var tPlan = Storage.getPlan(today);
    var tTasks = tPlan.todayTodos;
    var tDone = tTasks.filter(function(t) { return t.done; }).length;
    var mk = Storage.getMonthKey(new Date());
    var me = expenses.filter(function(e) { return e.date.startsWith(mk); });
    var mt = me.reduce(function(s, e) { return s + e.amount; }, 0);
    h += '<div class="stat-grid">';
    h += '<div class="stat-card"><div class="stat-icon">\u{1F4CB}</div><div class="stat-value">' + tDone + '/' + tTasks.length + '</div><div class="stat-label">\u4ECA\u65E5\u5B8C\u6210</div></div>';
    h += '<div class="stat-card"><div class="stat-icon">\u{1F4DD}</div><div class="stat-value">' + tasks.length + '</div><div class="stat-label">\u4EFB\u52A1\u603B\u6570</div></div>';
    h += '<div class="stat-card"><div class="stat-icon">\u{1F4B0}</div><div class="stat-value">\u00A5' + mt.toFixed(0) + '</div><div class="stat-label">\u672C\u6708\u652F\u51FA</div></div>';
    h += '<div class="stat-card"><div class="stat-icon">\u{1F4CC}</div><div class="stat-value">' + notes.length + '</div><div class="stat-label">\u5907\u5FD8\u5F55\u6570</div></div>';
    h += '<div class="stat-card"><div class="stat-icon">\u2705</div><div class="stat-value">' + habits.length + '</div><div class="stat-label">\u4E60\u60EF\u6570</div></div>';
    h += '<div class="stat-card"><div class="stat-icon">\u{1F3AF}</div><div class="stat-value">' + projects.length + '</div><div class="stat-label">\u9879\u76EE\u6570</div></div>';
    h += '</div>';
    if (me.length > 0) {
      var cs = {};
      me.forEach(function(e) { cs[e.category] = (cs[e.category] || 0) + e.amount; });
      h += '<div class="card"><div class="card-title">\u{1F4B0} \u672C\u6708\u652F\u51FA\u5206\u7C7B</div>';
      Object.keys(cs).forEach(function(cat) {
        var pct = mt > 0 ? Math.round(cs[cat] / mt * 100) : 0;
        h += '<div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;font-size:15px;margin-bottom:4px;"><span>' + cat + '</span><span>\u00A5' + cs[cat].toFixed(2) + ' (' + pct + '%)</span></div>';
        h += '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%;"></div></div></div>';
      });
      h += '</div>';
    }
    var logs = Storage.get(Storage.KEYS.SCHEDULER_LOG) || [];
    if (logs.length > 0) {
      h += '<div class="card"><div class="card-title">\u{1F550} \u81EA\u52A8\u4EFB\u52A1\u65E5\u5FD7</div>';
      logs.slice(0, 5).forEach(function(l) {
        var tc = l.status === 'success' ? 'tag-mint' : 'tag-pink';
        var time = new Date(l.time);
        var ts = (time.getMonth() + 1) + '/' + time.getDate() + ' ' + String(time.getHours()).padStart(2, '0') + ':' + String(time.getMinutes()).padStart(2, '0');
        h += '<div class="cmd-item"><span class="cmd-time">' + ts + '</span><span class="tag ' + tc + '">' + l.task + '</span></div>';
      });
      h += '</div>';
    }
    return h;
  },
  // ===== Window 9: Settings =====
  renderSettings: function() {
    var settings = Storage.get(Storage.KEYS.SETTINGS) || {};
    var size = Storage.getStorageSize();
    var next = Scheduler.getNextRun();
    var h = '<div class="window-header"><div class="window-title">\u2699\uFE0F \u8BBE\u7F6E</div></div>';
    h += '<div class="setting-group"><div class="setting-group-title">\u{1F4CA} \u6570\u636E\u7BA1\u7406</div>';
    h += '<div class="setting-item"><span class="setting-label">\u5B58\u50A8\u5360\u7528</span><span class="setting-value">' + size + ' KB</span></div>';
    h += '<div class="setting-item" onclick="App.exportData()"><span class="setting-label">\u{1F4E4} \u5BFC\u51FA\u5168\u90E8\u6570\u636E</span><span class="setting-value">\u70B9\u51FB\u5BFC\u51FA</span></div>';
    h += '<div class="setting-item" onclick="App.importData()"><span class="setting-label">\u{1F4E5} \u5BFC\u5165\u6570\u636E</span><span class="setting-value">\u70B9\u51FB\u5BFC\u5165</span></div>';
    h += '<div class="setting-item" onclick="App.confirmClear()"><span class="setting-label">\u{1F5D1}\uFE0F \u6E05\u7A7A\u5168\u90E8\u6570\u636E</span><span class="setting-value" style="color:#FF9AA2;">\u5371\u9669\u64CD\u4F5C</span></div>';
    h += '</div>';
    h += '<div class="setting-group"><div class="setting-group-title">\u{1F550} \u5B9A\u65F6\u4EFB\u52A1</div>';
    if (next.length > 0) {
      next.forEach(function(n) {
        var d = n.time;
        var s = (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        h += '<div class="setting-item"><span class="setting-label">' + n.name + '</span><span class="setting-value">\u4E0B\u6B21: ' + s + '</span></div>';
      });
    }
    h += '<div class="setting-item" onclick="App.testScheduler()"><span class="setting-label">\u{1F9EA} \u624B\u52A8\u6D4B\u8BD5\u8C03\u5EA6</span><span class="setting-value">\u70B9\u51FB\u6267\u884C</span></div>';
    h += '</div>';
    h += '<div class="setting-group"><div class="setting-group-title">\u2139\uFE0F \u5173\u4E8E</div>';
    h += '<div class="setting-item"><span class="setting-label">\u5E94\u7528\u7248\u672C</span><span class="setting-value">v1.0.0</span></div>';
    h += '<div class="setting-item"><span class="setting-label">\u521B\u5EFA\u65E5\u671F</span><span class="setting-value">' + (settings.createdDate || '-') + '</span></div>';
    h += '<div class="setting-item"><span class="setting-label">\u6570\u636E\u5B58\u50A8</span><span class="setting-value">\u672C\u5730\u6301\u4E45\u5316</span></div>';
    h += '</div>';
    h += '<div style="text-align:center;padding:20px;color:#B0B0B0;font-size:15px;">\u{1F430} \u4E2A\u4EBA\u6548\u7387\u5DE5\u4F5C\u53F0 \u00B7 \u7C73\u83F2\u5154\u98CE\u683C</div>';
    return h;
  },
  exportData: function() {
    var data = Storage.exportAll();
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'efficiency_workbench_' + Storage.today() + '.json'; a.click();
    URL.revokeObjectURL(url);
    this.showToast('\u2705 \u6570\u636E\u5DF2\u5BFC\u51FA');
  },
  importData: function() {
    var input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    var self = this;
    input.onchange = function(e) {
      var file = e.target.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        try {
          var data = JSON.parse(ev.target.result);
          if (Storage.importAll(data)) { self.render(); self.showToast('\u2705 \u6570\u636E\u5BFC\u5165\u6210\u529F'); }
          else { self.showToast('\u26A0\uFE0F \u5BFC\u5165\u5931\u8D25'); }
        } catch (err) { self.showToast('\u26A0\uFE0F \u6587\u4EF6\u683C\u5F0F\u9519\u8BEF'); }
      };
      reader.readAsText(file);
    };
    input.click();
  },
  confirmClear: function() {
    var h = '<div class="modal-title" style="color:#FF9AA2;">\u26A0\uFE0F \u786E\u8BA4\u6E05\u7A7A\u6570\u636E\uFF1F</div>';
    h += '<div class="modal-body" style="font-size:17px;line-height:1.6;">\u6B64\u64CD\u4F5C\u5C06\u5220\u9664\u6240\u6709\u6570\u636E\uFF0C\u4E14\u4E0D\u53EF\u6062\u590D\uFF01</div>';
    h += '<div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">\u53D6\u6D88</button><button class="btn btn-danger" onclick="App.doClear()">\u786E\u8BA4\u6E05\u7A7A</button></div>';
    this.showModal(h);
  },
  doClear: function() { Storage.clearAll(); this.closeModal(); this.render(); this.showToast('\u5DF2\u6E05\u7A7A\u5168\u90E8\u6570\u636E'); },
  testScheduler: function() {
    var h = '<div class="modal-title">\u{1F9EA} \u624B\u52A8\u6D4B\u8BD5\u8C03\u5EA6</div><div class="modal-body">';
    Scheduler.tasks.forEach(function(t) {
      h += '<button class="btn btn-outline btn-block" style="margin-bottom:8px;" onclick="App.runSchedulerTask(\'' + t.id + '\')">' + t.name + '</button>';
    });
    h += '</div><div class="modal-footer"><button class="btn btn-primary" onclick="App.closeModal()">\u5173\u95ED</button></div>';
    this.showModal(h);
  },
  runSchedulerTask: function(id) {
    var result = Scheduler.trigger(id);
    this.closeModal(); this.render();
    if (result) this.showToast(result);
  },
  // ===== Window: Work Hours (工时统计) =====
  renderWorkHours: function() {
    var today = Storage.today();
    var ym = today.substring(0, 7);
    var summary = Storage.getMonthSummary(ym);
    var compTime = Storage.getCompTime();
    var todayRec = null;
    summary.records.forEach(function(r) { if (r.date === today) todayRec = r.data; });
    var h = '';

    h += '<div class="window-header"><div class="window-title">\u{1F552} \u5DE5\u65F6\u7EDF\u8BA1</div>';
    h += '<div style="display:flex;gap:6px;flex-wrap:wrap;">';
    h += '<button class="btn btn-primary btn-sm" onclick="App.showClockInModal()">\u{1F4CD} \u6253\u5361</button>';
    h += '<button class="btn btn-sm" style="background:#FFF3B0;color:#8A6D00;" onclick="App.showDirectHoursModal()">\u{1F4DD} \u5F55\u5DE5\u65F6</button>';
    h += '<button class="btn btn-sm" style="background:#D4F5DC;color:#2A8B3A;" onclick="App.showCompUseModal()">\u{1F3C4} \u8C03\u4F11</button>';
    h += '<button class="btn btn-sm" style="background:#E8F4FD;color:#3B8BCC;" onclick="App.exportLedger()">\u{1F4E4} \u5BFC\u51FA</button>';
    if (!summary.settled) {
      h += '<button class="btn btn-sm" style="background:#FFDDE1;color:#C44A52;" onclick="App.settleMonth()">\u{1F4CB} \u6708\u7ED3</button>';
    }
    h += '</div></div>';

    // 今日卡片
    h += '<div class="card" style="margin-bottom:12px;">';
    h += '<div class="card-title">\u{1F4C5} ' + today + ' \u4ECA\u65E5</div>';
    if (todayRec) {
      h += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">';
      h += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
      if (todayRec.clockIn) h += '<span style="background:#E8F4FD;color:#3B8BCC;padding:4px 12px;border-radius:8px;font-weight:bold;">\u4E0A\u73ED ' + todayRec.clockIn + '</span>';
      if (todayRec.clockOut) h += '<span style="background:#FFDDE1;color:#C44A52;padding:4px 12px;border-radius:8px;font-weight:bold;">\u4E0B\u73ED ' + todayRec.clockOut + '</span>';
      if (todayRec.directHours !== null) h += '<span style="background:#FFF3B0;color:#8A6D00;padding:4px 12px;border-radius:8px;font-weight:bold;">\u76F4\u63A5 ' + todayRec.directHours + 'h</span>';
      h += '<span style="background:' + (todayRec.effectiveHours >= 8 ? '#D4F5DC' : '#F0F0F0') + ';color:' + (todayRec.effectiveHours >= 8 ? '#2A8B3A' : '#999') + ';padding:4px 12px;border-radius:8px;font-weight:bold;">\u6709\u6548 ' + todayRec.effectiveHours + 'h</span>';
      h += '</div>';
      h += '<div style="display:flex;gap:6px;">';
      h += '<button class="btn-icon-sm" onclick="App.toggleTrip(\'' + today + '\')" title="\u6807\u8BB0/\u53D6\u6D88\u51FA\u5DEE" style="' + (todayRec.isTrip ? 'background:#FFB347;color:#fff;' : '') + '">\u2708\uFE0F</button>';
      if (!todayRec.settled) h += '<button class="btn-icon-sm" onclick="App.settleDay(\'' + today + '\')" title="\u7ED3\u7B97\u4ECA\u65E5">\u2705</button>';
      h += '<button class="btn-icon-sm" onclick="App.deleteClock(\'' + today + '\')" title="\u5220\u9664">\u{1F5D1}\uFE0F</button>';
      h += '</div>';
      h += '</div>';
      if (todayRec.note) h += '<div style="margin-top:6px;font-size:14px;color:#999;">' + this._esc(todayRec.note) + '</div>';
      if (todayRec.isTrip) h += '<div style="margin-top:4px;font-size:14px;color:#FF8C00;font-weight:bold;">\u2708\uFE0F \u4ECA\u65E5\u51FA\u5DEE</div>';
    } else {
      h += '<div style="color:#bbb;text-align:center;padding:16px 0;">\u{1F552} \u4ECA\u65E5\u8FD8\u672A\u6253\u5361\uFF0C\u70B9\u51FB\u4E0A\u65B9\u6309\u94AE\u5F00\u59CB</div>';
    }
    h += '</div>';

    // 月度汇总
    h += '<div class="card" style="margin-bottom:12px;">';
    h += '<div class="card-title">\u{1F4CA} ' + ym + ' \u6708\u5EA6\u6C47\u603B' + (summary.settled ? ' \u2705\u5DF2\u7ED3\u7B97' : '') + '</div>';
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;">';
    h += '<div style="text-align:center;background:#E8F4FD;border-radius:10px;padding:10px 6px;"><div style="font-size:24px;font-weight:bold;color:#3B8BCC;">' + summary.totalHours + '</div><div style="font-size:13px;color:#888;">\u603B\u5DE5\u65F6(h)</div></div>';
    h += '<div style="text-align:center;background:#D4F5DC;border-radius:10px;padding:10px 6px;"><div style="font-size:24px;font-weight:bold;color:#2A8B3A;">' + summary.workDays + '</div><div style="font-size:13px;color:#888;">\u5DE5\u4F5C\u5929\u6570</div></div>';
    h += '<div style="text-align:center;background:#FFF3B0;border-radius:10px;padding:10px 6px;"><div style="font-size:24px;font-weight:bold;color:#B07020;">' + summary.tripDays + '</div><div style="font-size:13px;color:#888;">\u51FA\u5DEE\u5929\u6570</div></div>';
    h += '<div style="text-align:center;background:#FFDDE1;border-radius:10px;padding:10px 6px;"><div style="font-size:24px;font-weight:bold;color:#C44A52;">' + summary.overtime + '</div><div style="font-size:13px;color:#888;">\u52A0\u73ED(h)</div></div>';
    h += '</div>';
    h += '<div style="margin-top:8px;font-size:14px;color:#888;">\u5E94\u51FA\u52E4: ' + summary.expectedHours + 'h \uFF5C \u5B9E\u9645: ' + summary.totalHours + 'h \uFF5C \u5DEE\u989D: ' + (Math.round((summary.totalHours - summary.expectedHours) * 10) / 10) + 'h</div>';
    h += '</div>';

    // 调休余额
    h += '<div class="card" style="margin-bottom:12px;">';
    h += '<div class="card-title">\u{1F3C4} \u8C03\u4F11\u4F59\u989D</div>';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;">';
    h += '<div style="font-size:28px;font-weight:bold;color:' + (compTime.balance > 0 ? '#4ECCA3' : '#999') + ';">' + compTime.balance + 'h</div>';
    h += '<button class="btn btn-sm" style="background:#D4F5DC;color:#2A8B3A;" onclick="App.showCompUseModal()">\u4F7F\u7528\u8C03\u4F11</button>';
    h += '</div>';
    if (compTime.transactions && compTime.transactions.length > 0) {
      h += '<div style="margin-top:8px;max-height:120px;overflow-y:auto;">';
      compTime.transactions.slice(-5).reverse().forEach(function(t) {
        var color = t.type === 'earn' ? '#2A8B3A' : '#C44A52';
        var sign = t.type === 'earn' ? '+' : '-';
        h += '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f0f0f0;font-size:14px;">';
        h += '<span>' + t.date + ' ' + (t.note || '') + '</span>';
        h += '<span style="color:' + color + ';font-weight:bold;">' + sign + t.amount + 'h</span>';
        h += '</div>';
      });
      h += '</div>';
    }
    h += '</div>';

    // 月度台账
    h += '<div class="card">';
    h += '<div class="card-title">\u{1F4D3} \u6253\u5361\u53F0\u8D26</div>';
    if (summary.records.length === 0) {
      h += '<div style="color:#bbb;text-align:center;padding:16px 0;">\u6682\u65E0\u8BB0\u5F55</div>';
    } else {
      h += '<div style="overflow-x:auto;"><table style="width:100%;font-size:13px;border-collapse:collapse;">';
      h += '<thead><tr style="background:#f5f5f5;"><th style="padding:6px;text-align:left;">\u65E5\u671F</th><th style="padding:6px;text-align:center;">\u4E0A\u73ED</th><th style="padding:6px;text-align:center;">\u4E0B\u73ED</th><th style="padding:6px;text-align:center;">\u76F4\u63A5</th><th style="padding:6px;text-align:center;">\u6709\u6548</th><th style="padding:6px;text-align:center;">\u51FA\u5DEE</th><th style="padding:6px;text-align:center;">\u7ED3\u7B97</th><th style="padding:6px;text-align:center;">\u64CD\u4F5C</th></tr></thead><tbody>';
      var self = this;
      summary.records.forEach(function(r) {
        var d = r.data;
        h += '<tr style="border-bottom:1px solid #f0f0f0;">';
        h += '<td style="padding:6px;">' + r.date.substring(8) + '</td>';
        h += '<td style="padding:6px;text-align:center;">' + (d.clockIn || '-') + '</td>';
        h += '<td style="padding:6px;text-align:center;">' + (d.clockOut || '-') + '</td>';
        h += '<td style="padding:6px;text-align:center;">' + (d.directHours !== null ? d.directHours + 'h' : '-') + '</td>';
        h += '<td style="padding:6px;text-align:center;font-weight:bold;color:' + (d.effectiveHours >= 8 ? '#2A8B3A' : '#999') + ';">' + d.effectiveHours + 'h</td>';
        h += '<td style="padding:6px;text-align:center;">' + (d.isTrip ? '\u2708\uFE0F' : '') + '</td>';
        h += '<td style="padding:6px;text-align:center;">' + (d.settled ? '\u2705' : '\u23F3') + '</td>';
        h += '<td style="padding:6px;text-align:center;"><button class="btn-icon-sm" onclick="App.deleteClock(\'' + r.date + '\')" title="\u5220\u9664">\u{1F5D1}\uFE0F</button></td>';
        h += '</tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div>';

    return h;
  },
  showClockInModal: function(dateStr) {
    var selDate = dateStr || Storage.today();
    var ym = selDate.substring(0, 7);
    var summary = Storage.getMonthSummary(ym);
    var rec = null;
    summary.records.forEach(function(r) { if (r.date === selDate) rec = r.data; });
    var now = new Date();
    var nowTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    var h = '';
    h += '<div class="modal-card" style="max-width:400px;">';
    h += '<div class="modal-header"><span>\u{1F4CD} \u6253\u5361\u8BB0\u5F55</span><button class="modal-close" onclick="App.closeModal()">\u00D7</button></div>';
    h += '<div style="padding:16px;">';
    h += '<div class="form-group"><label>\u65E5\u671F</label><input type="date" id="clockDate" class="form-input" value="' + selDate + '" onchange="App.showClockInModal(this.value)"></div>';
    h += '<div class="form-group"><label>\u4E0A\u73ED\u65F6\u95F4</label><input type="time" id="clockInTime" class="form-input" value="' + (rec ? rec.clockIn : nowTime) + '"></div>';
    h += '<div class="form-group"><label>\u4E0B\u73ED\u65F6\u95F4</label><input type="time" id="clockOutTime" class="form-input" value="' + (rec ? rec.clockOut : '') + '"></div>';
    h += '<div class="form-group"><label>\u5907\u6CE8</label><input type="text" id="clockNote" class="form-input" placeholder="\u53EF\u9009" value="' + (rec ? this._esc(rec.note) : '') + '"></div>';
    if (rec && rec.effectiveHours > 0) {
      h += '<div style="margin:8px 0;padding:8px 12px;background:#f5f5f5;border-radius:8px;font-size:14px;color:#888;">\u6709\u6548\u5DE5\u65F6: <b style="color:' + (rec.effectiveHours >= 8 ? '#2A8B3A' : '#C44A52') + ';">' + rec.effectiveHours + 'h</b>' + (rec.effectiveHours > 8 ? ' (\u52A0\u73ED ' + (Math.round((rec.effectiveHours - 8) * 10) / 10) + 'h)' : '') + '</div>';
    }
    h += '<div style="display:flex;gap:8px;margin-top:16px;">';
    h += '<button class="btn btn-primary" style="flex:1;" onclick="App.saveClockIn()">\u2705 \u4FDD\u5B58</button>';
    h += '<button class="btn" style="flex:1;" onclick="App.closeModal()">\u53D6\u6D88</button>';
    h += '</div>';
    h += '</div></div>';
    this.showModal(h);
  },
  saveClockIn: function() {
    var date = document.getElementById('clockDate').value;
    var clockIn = document.getElementById('clockInTime').value;
    var clockOut = document.getElementById('clockOutTime').value;
    var note = document.getElementById('clockNote').value;
    if (!clockIn && !clockOut) { this.showToast('\u26A0\uFE0F \u8BF7\u81F3\u5C11\u586B\u5199\u4E00\u4E2A\u65F6\u95F4'); return; }
    Storage.addClockRecord(date, clockIn, clockOut, note);
    this.closeModal();
    this.render();
    this.showToast('\u2705 \u6253\u5361\u5DF2\u4FDD\u5B58 (' + date + ')');
  },
  showDirectHoursModal: function(dateStr) {
    var selDate = dateStr || Storage.today();
    var ym = selDate.substring(0, 7);
    var summary = Storage.getMonthSummary(ym);
    var rec = null;
    summary.records.forEach(function(r) { if (r.date === selDate) rec = r.data; });
    var h = '';
    h += '<div class="modal-card" style="max-width:400px;">';
    h += '<div class="modal-header"><span>\u{1F4DD} \u76F4\u63A5\u5F55\u5DE5\u65F6</span><button class="modal-close" onclick="App.closeModal()">\u00D7</button></div>';
    h += '<div style="padding:16px;">';
    h += '<div class="form-group"><label>\u65E5\u671F</label><input type="date" id="directDate" class="form-input" value="' + selDate + '" onchange="App.showDirectHoursModal(this.value)"></div>';
    h += '<div class="form-group"><label>\u5DE5\u65F6\u6570\uFF08\u5C0F\u65F6\uFF09</label><input type="number" id="directHoursInput" class="form-input" step="0.5" min="0" max="24" placeholder="\u5982: 8" value="' + (rec && rec.directHours !== null ? rec.directHours : '') + '"></div>';
    h += '<div class="form-group"><label>\u5907\u6CE8</label><input type="text" id="directNote" class="form-input" placeholder="\u53EF\u9009" value="' + (rec ? this._esc(rec.note) : '') + '"></div>';
    h += '<div style="display:flex;gap:8px;margin-top:16px;">';
    h += '<button class="btn btn-primary" style="flex:1;" onclick="App.saveDirectHours()">\u2705 \u4FDD\u5B58</button>';
    h += '<button class="btn" style="flex:1;" onclick="App.closeModal()">\u53D6\u6D88</button>';
    h += '</div>';
    h += '</div></div>';
    this.showModal(h);
  },
  saveDirectHours: function() {
    var date = document.getElementById('directDate').value;
    var hours = document.getElementById('directHoursInput').value;
    var note = document.getElementById('directNote').value;
    if (!hours || parseFloat(hours) <= 0) { this.showToast('\u26A0\uFE0F \u8BF7\u8F93\u5165\u6709\u6548\u5DE5\u65F6'); return; }
    Storage.setDirectHours(date, hours, note);
    this.closeModal();
    this.render();
    this.showToast('\u2705 \u5DE5\u65F6\u5DF2\u4FDD\u5B58');
  },
  showCompUseModal: function() {
    var compTime = Storage.getCompTime();
    var today = Storage.today();
    var h = '';
    h += '<div class="modal-card" style="max-width:400px;">';
    h += '<div class="modal-header"><span>\u{1F3C4} \u4F7F\u7528\u8C03\u4F11</span><button class="modal-close" onclick="App.closeModal()">\u00D7</button></div>';
    h += '<div style="padding:16px;">';
    h += '<div style="margin-bottom:12px;font-size:16px;">\u5F53\u524D\u8C03\u4F11\u4F59\u989D: <b style="color:#4ECCA3;">' + compTime.balance + 'h</b></div>';
    h += '<div class="form-group"><label>\u4F7F\u7528\u65F6\u95F4\uFF08\u5C0F\u65F6\uFF09</label><input type="number" id="compUseHours" class="form-input" step="0.5" min="0.5" max="' + compTime.balance + '" placeholder="\u5982: 4"></div>';
    h += '<div class="form-group"><label>\u65E5\u671F</label><input type="date" id="compUseDate" class="form-input" value="' + today + '"></div>';
    h += '<div class="form-group"><label>\u5907\u6CE8</label><input type="text" id="compUseNote" class="form-input" placeholder="\u53EF\u9009"></div>';
    h += '<div style="display:flex;gap:8px;margin-top:16px;">';
    h += '<button class="btn btn-primary" style="flex:1;" onclick="App.saveCompUse()">\u2705 \u786E\u8BA4\u4F7F\u7528</button>';
    h += '<button class="btn" style="flex:1;" onclick="App.closeModal()">\u53D6\u6D88</button>';
    h += '</div>';
    h += '</div></div>';
    this.showModal(h);
  },
  saveCompUse: function() {
    var hours = parseFloat(document.getElementById('compUseHours').value);
    var date = document.getElementById('compUseDate').value;
    var note = document.getElementById('compUseNote').value;
    if (!hours || hours <= 0) { this.showToast('\u26A0\uFE0F \u8BF7\u8F93\u5165\u6709\u6548\u65F6\u957F'); return; }
    var ok = Storage.useCompTime(date, hours, note);
    if (!ok) { this.showToast('\u26A0\uFE0F \u8C03\u4F11\u4F59\u989D\u4E0D\u8DB3'); return; }
    this.closeModal();
    this.render();
    this.showToast('\u2705 \u8C03\u4F11\u5DF2\u4F7F\u7528 ' + hours + 'h');
  },
  toggleTrip: function(date) {
    var isTrip = Storage.toggleTripDay(date);
    this.render();
    this.showToast(isTrip ? '\u2708\uFE0F \u5DF2\u6807\u8BB0\u51FA\u5DEE' : '\u5DF2\u53D6\u6D88\u51FA\u5DEE');
  },
  deleteClock: function(date) {
    Storage.deleteClockRecord(date);
    this.render();
    this.showToast('\u2705 \u5DF2\u5220\u9664');
  },
  settleDay: function(date) {
    Storage.settleDay(date);
    this.render();
    this.showToast('\u2705 \u5F53\u65E5\u5DF2\u7ED3\u7B97');
  },
  settleMonth: function() {
    var ym = Storage.today().substring(0, 7);
    Storage.settleMonth(ym);
    this.render();
    this.showToast('\u2705 \u6708\u5EA6\u5DF2\u7ED3\u7B97');
  },
  exportLedger: function() {
    var ym = Storage.today().substring(0, 7);
    var text = Storage.exportLedger(ym);
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = '\u5DE5\u65F6\u53F0\u8D26_' + ym + '.txt';
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('\u{1F4E4} \u5DF2\u5BFC\u51FA');
  },

  // ===== Window: News (时政热点) =====
  renderNews: function() {
    var today = Storage.today();
    var briefing = Storage.getNewsBriefing(today);
    var webFetched = Storage.isNewsWebFetched(today);
    var h = '<div class="window-header"><div class="window-title">\u{1F4F0} 时政热点</div>';
    h += '<div style="display:flex;gap:6px;">';
    h += '<button class="btn-icon-sm" onclick="App.fetchNewsFromWeb(false)" title="\u5237\u65B0\u8D44\u8BAF">\u{1F504}</button>';
    h += '<button class="btn-icon-sm" onclick="App.showNewsArchiveModal()" title="\u5F52\u6863">\u{1F4C2}</button>';
    h += '<button class="btn-icon-sm" onclick="App.showNewsFavoritesModal()" title="\u6536\u85CF\u5E93">\u2B50</button>';
    h += '<button class="btn-icon-sm" onclick="App.doExportIndustryViews()" title="\u5BFC\u51FA">\u{1F4E4}</button>';
    h += '</div></div>';
    // \u6BCF\u5929\u9996\u6B21\u6253\u5F00\u81EA\u52A8\u4ECE\u7F51\u7EDC\u6293\u53D6
    if (!webFetched) {
      this.fetchNewsFromWeb(true);
    }
    var hasContent = briefing && briefing.sections && (briefing.sections.macro.length > 0 || briefing.sections.ai.length > 0 || briefing.sections.expo.length > 0 || briefing.sections.livelihood.length > 0);
    if (!hasContent) {
      if (!webFetched) {
        h += '<div class="loading-state"><div class="loading-icon">\u23F3</div><div style="margin-top:8px;color:#999;">\u6B63\u5728\u4ECE\u7F51\u7EDC\u83B7\u53D6\u65F6\u653F\u8D44\u8BAF\u2026</div></div>';
      } else {
        h += '<div class="news-fetch-error">';
        h += '\u26A0\uFE0F \u8D44\u8BAF\u83B7\u53D6\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5';
        h += '<br><button class="btn btn-primary btn-sm" style="margin-top:8px;" onclick="App.fetchNewsFromWeb(false)">\u{1F504} \u91CD\u65B0\u83B7\u53D6</button>';
        h += '</div>';
      }
      return h;
    }
    var now = new Date();
    var wd = ['日','一','二','三','四','五','六'];
    h += '<div class="news-date-header">';
    h += '<span class="news-date-text">' + today + ' 星期' + wd[now.getDay()] + '</span>';
    h += '<span class="news-date-badge">\u{1F4CB} 今日简报</span>';
    h += '</div>';
    h += '<div class="news-quick-actions">';
    h += '<button class="btn btn-sm btn-outline" onclick="App.showWeeklyNewsSummary()">\u{1F4C5} 本周汇总</button>';
    h += '<button class="btn btn-sm btn-yellow" onclick="App.showNewsFavoritesModal()">\u2B50 收藏库</button>';
    h += '<button class="btn btn-sm btn-mint" onclick="App.doExportIndustryViews()">\u{1F4E4} 导出观点</button>';
    h += '</div>';
    var sections = [
      { key: 'macro', title: '宏观经贸政策', icon: '\u{1F30D}', color: 'blue' },
      { key: 'ai', title: 'AI科技产业', icon: '\u{1F916}', color: 'lavender' },
      { key: 'expo', title: '展会投融资', icon: '\u{1F3E2}', color: 'mint' },
      { key: 'livelihood', title: '民生热点', icon: '\u{1F375}\uFE0F', color: 'orange' }
    ];
    var self = this;
    sections.forEach(function(sec) {
      var items = briefing.sections[sec.key];
      h += '<div class="plan-section news-section news-section-' + sec.color + '">';
      h += '<div class="plan-section-header"><div class="plan-section-title">' + sec.icon + ' ' + sec.title + '</div>';
      h += '<div class="plan-section-actions">';
      h += '<span class="tag tag-' + sec.color + '">' + items.length + '</span>';
      h += '<button class="btn-icon-sm" onclick="App.showNewsItemModal(\'' + sec.key + '\')" title="新增">+</button>';
      h += '</div></div>';
      if (items.length === 0) {
        h += '<div class="empty-state-sm"><div class="empty-text">暂无资讯<br>点击 + 添加</div></div>';
      } else {
        items.forEach(function(item) {
          h += '<div class="news-item">';
          h += '<div class="news-item-title">' + self._esc(item.title) + '</div>';
          if (item.summary) h += '<div class="news-item-summary">' + self._esc(item.summary) + '</div>';
          if (item.source) h += '<div class="news-item-source">\u{1F4F0} ' + self._esc(item.source) + '</div>';
          if (item.impact) h += '<div class="news-item-annotation news-impact">\u{1F4A1} 业务影响: ' + self._esc(item.impact) + '</div>';
          if (item.thought) h += '<div class="news-item-annotation news-thought">\u{1F4AD} 个人思考: ' + self._esc(item.thought) + '</div>';
          h += '<div class="news-item-actions">';
          h += '<button class="btn-icon-sm" onclick="App.showNewsDetailModal(\'' + today + '\',\'' + sec.key + '\',\'' + item.id + '\')" title="详情/批注">\u{1F4DD}</button>';
          h += '<button class="btn-icon-sm ' + (item.favorited ? 'btn-icon-yellow' : '') + '" onclick="App.toggleNewsFavorite(\'' + today + '\',\'' + sec.key + '\',\'' + item.id + '\')" title="收藏">' + (item.favorited ? '\u2B50' : '\u2606') + '</button>';
          h += '<button class="btn-icon-sm" onclick="App.syncNewsToInspiration(\'' + today + '\',\'' + sec.key + '\',\'' + item.id + '\')" title="同步灵感">\u{1F4A1}</button>';
          h += '<button class="btn-icon-sm" onclick="App.deleteNewsItem(\'' + today + '\',\'' + sec.key + '\',\'' + item.id + '\')" title="删除">\u00D7</button>';
          h += '</div>';
          h += '</div>';
        });
      }
      h += '</div>';
    });
    return h;
  },
  manualFetchBriefing: function() {
    this.fetchNewsFromWeb(false);
  },
  fetchNewsFromWeb: function(silent) {
    var self = this;
    var today = Storage.today();
    if (!silent) this.showToast('\u{1F504} \u6B63\u5728\u4ECE\u7F51\u7EDC\u83B7\u53D6\u65F6\u653F\u8D44\u8BAF\u2026');

    // Use 60s.viki.moe API (60秒读懂世界) + 知乎热榜 as news source
    var news60sUrl = 'https://60s.viki.moe/v2/60s';
    var zhihuUrl = 'https://60s.viki.moe/v2/zhihu';

    var p60s = fetch(news60sUrl).then(function(res) { return res.json(); }).then(function(data) {
      var items = [];
      if (data && data.code === 200 && data.data && data.data.news) {
        data.data.news.forEach(function(text, idx) {
          items.push({
            id: 'web_' + Date.now() + '_' + idx,
            title: text,
            summary: '',
            source: '60秒读懂世界',
            link: '',
            impact: '',
            thought: '',
            favorited: false,
            fromWeb: true,
            createdAt: Date.now()
          });
        });
      }
      return items;
    }).catch(function(err) {
      console.log('[News] 60s API error:', err);
      return [];
    });

    var pZhihu = fetch(zhihuUrl).then(function(res) { return res.json(); }).then(function(data) {
      var items = [];
      if (data && data.code === 200 && Array.isArray(data.data)) {
        data.data.slice(0, 12).forEach(function(item, idx) {
          items.push({
            id: 'zhihu_' + Date.now() + '_' + idx,
            title: item.title || '',
            summary: (item.detail || '').substring(0, 200),
            source: '知乎热榜',
            link: item.url || '',
            impact: '',
            thought: '',
            favorited: false,
            fromWeb: true,
            createdAt: Date.now()
          });
        });
      }
      return items;
    }).catch(function(err) {
      console.log('[News] Zhihu API error:', err);
      return [];
    });

    Promise.all([p60s, pZhihu]).then(function(results) {
      var news60s = results[0]; // 60秒读懂世界
      var zhihuItems = results[1]; // 知乎热榜

      // Classify 60s news into sections by keyword matching
      var sections = { macro: [], ai: [], expo: [], livelihood: [] };
      var seen = {};

      // Keyword-based classification
      var kw = {
        macro: ['\u7ECF\u6D4E', '\u8D22\u653F', '\u7A0E', '\u94F6\u884C', '\u592E\u884C', '\u8D27\u5E01', '\u623F\u4EA7', '\u80A1\u5E02', '\u8D37', '\u5546\u52A1', '\u901A\u5546', '\u5173\u7A0E', '\u8D38\u6613', '\u6295\u8D44', '\u57FA\u5EFA', '\u5DE5\u7A0B', '\u91C7\u8D2D'],
        ai: ['AI', '\u4EBA\u5DE5\u667A\u80FD', '\u7B97\u6CD5', '\u5927\u6A21\u578B', '\u82AF\u7247', '\u79D1\u6280', '\u4E92\u8054\u7F51', '\u6570\u5B57', '\u667A\u80FD', '\u673A\u5668\u4EBA', '\u5347\u7EF4', '\u5B81\u5FB7', '\u7279\u65AF\u62C9', '\u82F9\u679C', '\u5FAE\u8F6F', '\u8C37\u6B4C', '\u767E\u5EA6', '\u5BBD\u5185', '\u9AD8\u901A', '\u534E\u4E3A', '\u82F9\u679C', 'GPT', 'LLM'],
        expo: ['\u5C55\u4F1A', '\u5CF0\u4F1A', '\u8BBA\u575B', '\u4F1A\u8BAE', '\u53D1\u5E03', '\u7B7E\u7EA6', '\u5408\u4F5C', '\u9879\u76EE', '\u62DB\u5546', '\u5DE5\u56ED', '\u4EA7\u4E1A\u56ED', '\u878D\u8D44', '\u4E0A\u5E02', '\u5E76\u8D2D'],
        livelihood: ['\u6C11\u751F', '\u6559\u80B2', '\u533B\u7597', '\u4FDD\u9669', '\u5C31\u4E1A', '\u5DE5\u8D44', '\u517B\u8001', '\u4F4F\u623F', '\u98DF\u54C1', '\u5B89\u5168', '\u73AF\u5883', '\u4EA4\u901A', '\u7269\u4EF7', '\u7ED3\u5A5A', '\u751F\u80B2', '\u6C34\u7535', '\u7167\u987E', '\u8865\u8D34', '\u793E\u4F1A', '\u6E29\u5EA6', '\u96E8', '\u70ED', '\u51B7', '\u706B\u707E', '\u5730\u9707']
      };

      function classify(text) {
        for (var sec in kw) {
          for (var i = 0; i < kw[sec].length; i++) {
            if (text.indexOf(kw[sec][i]) >= 0) return sec;
          }
        }
        return 'macro'; // default to macro
      }

      // Distribute 60s news into sections
      news60s.forEach(function(item) {
        var sec = classify(item.title);
        if (!seen[item.title] && sections[sec].length < 6) {
          seen[item.title] = true;
          sections[sec].push(item);
        }
      });

      // Add zhihu items to fill empty sections
      zhihuItems.forEach(function(item) {
        var sec = classify(item.title);
        if (!seen[item.title] && sections[sec].length < 6) {
          seen[item.title] = true;
          sections[sec].push(item);
        }
      });

      Storage.saveNewsBriefingFromWeb(today, sections);
      self.render();
      var total = sections.macro.length + sections.ai.length + sections.expo.length + sections.livelihood.length;
      if (total > 0) {
        if (!silent) self.showToast('\u2705 \u5DF2\u83B7\u53D6 ' + total + ' \u6761\u65F6\u653F\u8D44\u8BAF');
      } else {
        Storage.setNewsWebFetched(today);
        self.render();
        if (!silent) self.showToast('\u26A0\uFE0F \u8D44\u8BAF\u83B7\u53D6\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5');
      }
    }).catch(function(err) {
      console.error('[News] Fetch error:', err);
      Storage.setNewsWebFetched(today);
      self.render();
      if (!silent) self.showToast('\u26A0\uFE0F \u8D44\u8BAF\u83B7\u53D6\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5');
    });
  },
  showNewsItemModal: function(section) {
    var sections = { macro: '宏观经贸政策', ai: 'AI科技产业', expo: '展会投融资', livelihood: '民生热点' };
    var h = '<div class="modal-title">新增资讯 - ' + sections[section] + '</div><div class="modal-body">';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">标题</label><input type="text" class="input-field" id="newsTitle" placeholder="资讯标题..."></div>';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">摘要</label><textarea class="input-field" id="newsSummary" placeholder="资讯摘要..." style="min-height:80px;"></textarea></div>';
    h += '<div><label class="modal-label">来源</label><input type="text" class="input-field" id="newsSource" placeholder="资讯来源..."></div>';
    h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.saveNewsItem(\'' + section + '\')">保存</button></div>';
    this.showModal(h);
  },
  saveNewsItem: function(section) {
    var title = document.getElementById('newsTitle').value.trim();
    if (!title) { this.showToast('\u26A0\uFE0F 请输入资讯标题'); return; }
    Storage.addNewsItem(Storage.today(), section, {
      title: title,
      summary: document.getElementById('newsSummary').value.trim(),
      source: document.getElementById('newsSource').value.trim()
    });
    this.closeModal(); this.render(); this.showToast('\u2705 资讯已添加');
  },
  showNewsDetailModal: function(date, section, itemId) {
    var briefing = Storage.getNewsBriefing(date);
    if (!briefing) return;
    var item = briefing.sections[section].find(function(x) { return x.id === itemId; });
    if (!item) return;
    var h = '<div class="modal-title">\u{1F4DD} 资讯详情与批注</div><div class="modal-body">';
    h += '<div style="margin-bottom:10px;padding:10px;background:var(--miffy-blue-pale);border-radius:8px;">';
    h += '<div style="font-weight:700;font-size:17px;margin-bottom:4px;">' + this._esc(item.title) + '</div>';
    if (item.summary) h += '<div style="font-size:15px;color:#666;line-height:1.5;">' + this._esc(item.summary) + '</div>';
    if (item.source) h += '<div style="font-size:14px;color:#888;margin-top:4px;">\u{1F4F0} ' + this._esc(item.source) + '</div>';
    h += '</div>';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">\u{1F4A1} 业务影响</label><textarea class="input-field" id="newsImpact" placeholder="这条资讯对业务有什么影响..." style="min-height:80px;">' + this._esc(item.impact || '') + '</textarea></div>';
    h += '<div><label class="modal-label">\u{1F4AD} 个人思考批注</label><textarea class="input-field" id="newsThought" placeholder="你的思考和见解..." style="min-height:100px;">' + this._esc(item.thought || '') + '</textarea></div>';
    h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.saveNewsAnnotation(\'' + date + '\',\'' + section + '\',\'' + itemId + '\')">保存</button></div>';
    this.showModal(h);
  },
  saveNewsAnnotation: function(date, section, itemId) {
    var impact = document.getElementById('newsImpact').value.trim();
    var thought = document.getElementById('newsThought').value.trim();
    Storage.updateNewsItem(date, section, itemId, { impact: impact, thought: thought });
    this.closeModal(); this.render(); this.showToast('\u2705 批注已保存');
  },
  deleteNewsItem: function(date, section, itemId) {
    Storage.deleteNewsItem(date, section, itemId);
    this.render(); this.showToast('已删除');
  },
  toggleNewsFavorite: function(date, section, itemId) {
    var briefing = Storage.getNewsBriefing(date);
    if (!briefing) return;
    var item = briefing.sections[section].find(function(x) { return x.id === itemId; });
    if (!item) return;
    if (item.favorited) {
      Storage.removeNewsFavorite(itemId);
      this.render(); this.showToast('已取消收藏');
    } else {
      Storage.addNewsFavorite(date, section, item);
      this.render(); this.showToast('\u2B50 已加入收藏库');
    }
  },
  syncNewsToInspiration: function(date, section, itemId) {
    var briefing = Storage.getNewsBriefing(date);
    if (!briefing) return;
    var item = briefing.sections[section].find(function(x) { return x.id === itemId; });
    if (!item) return;
    var text = item.title;
    if (item.thought) text += ' - ' + item.thought;
    else if (item.impact) text += ' - ' + item.impact;
    Storage.addInspiration(text, '时政热点 ' + date);
    Storage.addNewsInspiration(text, '时政热点 ' + date);
    this.showToast('\u2705 已同步至每日灵感');
  },
  showNewsArchiveModal: function() {
    var dates = Storage.getArchivedBriefingDates();
    var h = '<div class="modal-title">\u{1F4C2} 资讯归档</div><div class="modal-body">';
    if (dates.length === 0) {
      h += '<div class="empty-state-sm"><div class="empty-text">暂无归档记录</div></div>';
    } else {
      h += '<div style="max-height:400px;overflow-y:auto;">';
      dates.forEach(function(date) {
        var briefing = Storage.getNewsBriefing(date);
        var totalCount = 0;
        Object.keys(briefing.sections).forEach(function(sec) { totalCount += briefing.sections[sec].length; });
        h += '<div class="list-item" onclick="App.viewArchivedBriefing(\'' + date + '\')">';
        h += '<span style="flex:1;font-size:17px;">' + date + '</span>';
        h += '<span class="tag tag-blue">' + totalCount + ' 条</span>';
        h += '</div>';
      });
      h += '</div>';
    }
    h += '</div><div class="modal-footer"><button class="btn btn-primary" onclick="App.closeModal()">关闭</button></div>';
    this.showModal(h);
  },
  viewArchivedBriefing: function(date) {
    var briefing = Storage.getNewsBriefing(date);
    if (!briefing) return;
    var sections = [
      { key: 'macro', title: '宏观经贸政策', icon: '\u{1F30D}' },
      { key: 'ai', title: 'AI科技产业', icon: '\u{1F916}' },
      { key: 'expo', title: '展会投融资', icon: '\u{1F3E2}' },
      { key: 'livelihood', title: '民生热点', icon: '\u{1F375}\uFE0F' }
    ];
    var h = '<div class="modal-title">\u{1F4C2} ' + date + ' 资讯简报</div><div class="modal-body">';
    var totalCount = 0;
    sections.forEach(function(sec) { totalCount += briefing.sections[sec.key].length; });
    h += '<div style="text-align:center;font-size:16px;color:#888;margin-bottom:12px;">共 ' + totalCount + ' 条资讯</div>';
    var self = this;
    sections.forEach(function(sec) {
      var items = briefing.sections[sec.key];
      if (items.length === 0) return;
      h += '<div style="margin-bottom:12px;"><div style="font-weight:700;font-size:16px;margin-bottom:6px;">' + sec.icon + ' ' + sec.title + '</div>';
      items.forEach(function(item) {
        h += '<div class="news-item" style="margin-bottom:6px;">';
        h += '<div class="news-item-title" style="font-size:15px;">' + self._esc(item.title) + '</div>';
        if (item.summary) h += '<div class="news-item-summary" style="font-size:14px;">' + self._esc(item.summary) + '</div>';
        h += '</div>';
      });
      h += '</div>';
    });
    h += '</div><div class="modal-footer"><button class="btn btn-primary" onclick="App.closeModal()">关闭</button></div>';
    this.showModal(h);
  },
  showWeeklyNewsSummary: function() {
    var data = Storage.getWeeklyNewsBriefings();
    var h = '<div class="modal-title">\u{1F4C5} 本周资讯汇总</div><div class="modal-body">';
    h += '<div style="margin-bottom:12px;padding:10px;background:var(--miffy-blue-pale);border-radius:8px;text-align:center;font-size:16px;color:var(--miffy-blue);">';
    h += data.start + ' ~ ' + data.end + '</div>';
    if (data.briefings.length === 0) {
      h += '<div class="empty-state-sm"><div class="empty-text">暂无资讯记录</div></div>';
    } else {
      var sections = { macro: '宏观经贸政策', ai: 'AI科技产业', expo: '展会投融资', livelihood: '民生热点' };
      var totalCount = 0;
      data.briefings.forEach(function(b) {
        Object.keys(b.sections).forEach(function(sec) { totalCount += b.sections[sec].length; });
      });
      h += '<div style="margin-bottom:12px;text-align:center;font-size:17px;font-weight:700;">共 ' + data.briefings.length + ' 天简报，' + totalCount + ' 条资讯</div>';
      Object.keys(sections).forEach(function(sec) {
        var items = [];
        data.briefings.forEach(function(b) {
          b.sections[sec].forEach(function(item) {
            items.push({ date: b.date, title: item.title, summary: item.summary, source: item.source });
          });
        });
        if (items.length === 0) return;
        h += '<div style="margin-bottom:12px;"><div style="font-weight:700;font-size:16px;margin-bottom:6px;color:var(--miffy-blue);">' + sections[sec] + ' (' + items.length + ')</div>';
        items.forEach(function(item) {
          h += '<div class="news-item" style="margin-bottom:6px;">';
          h += '<div class="news-item-title" style="font-size:15px;">' + item.title + '</div>';
          h += '<div style="font-size:13px;color:#888;">' + item.date + (item.source ? ' \u00B7 ' + item.source : '') + '</div>';
          h += '</div>';
        });
        h += '</div>';
      });
    }
    h += '</div><div class="modal-footer"><button class="btn btn-primary" onclick="App.closeModal()">关闭</button></div>';
    this.showModal(h);
  },
  showNewsFavoritesModal: function() {
    var favs = Storage.getNewsFavorites();
    var h = '<div class="modal-title">\u2B50 收藏库</div><div class="modal-body">';
    if (favs.length === 0) {
      h += '<div class="empty-state-sm"><div class="empty-text">暂无收藏记录<br>点击资讯旁的 \u2606 加入收藏</div></div>';
    } else {
      h += '<div style="max-height:450px;overflow-y:auto;">';
      var sections = { macro: '宏观经贸政策', ai: 'AI科技产业', expo: '展会投融资', livelihood: '民生热点' };
      var self = this;
      favs.forEach(function(f) {
        h += '<div class="news-item">';
        h += '<div class="news-item-title">' + self._esc(f.title) + '</div>';
        if (f.summary) h += '<div class="news-item-summary">' + self._esc(f.summary) + '</div>';
        h += '<div class="news-item-source">\u{1F4F0} ' + self._esc(f.source || '未知') + ' \u00B7 ' + f.date + ' \u00B7 ' + (sections[f.section] || f.section) + '</div>';
        if (f.impact) h += '<div class="news-item-annotation news-impact">\u{1F4A1} ' + self._esc(f.impact) + '</div>';
        if (f.thought) h += '<div class="news-item-annotation news-thought">\u{1F4AD} ' + self._esc(f.thought) + '</div>';
        h += '<div class="news-item-actions"><button class="btn-icon-sm" onclick="App.removeNewsFavoriteDirect(\'' + f.id + '\')">\u{1F5D1}\uFE0F</button></div>';
        h += '</div>';
      });
      h += '</div>';
    }
    h += '</div><div class="modal-footer"><button class="btn btn-primary" onclick="App.closeModal()">关闭</button></div>';
    this.showModal(h);
  },
  removeNewsFavoriteDirect: function(itemId) {
    Storage.removeNewsFavorite(itemId);
    this.closeModal(); this.render();
    this.showNewsFavoritesModal();
    this.showToast('已移除收藏');
  },
  doExportIndustryViews: function() {
    var text = Storage.exportNewsIndustryViews();
    var h = '<div class="modal-title">\u{1F4E4} 导出行业观点</div><div class="modal-body">';
    h += '<textarea class="input-field" id="exportNewsText" style="min-height:300px;font-family:monospace;font-size:14px;white-space:pre;" readonly>' + this._esc(text) + '</textarea>';
    h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">关闭</button><button class="btn btn-primary" onclick="App.copyNewsExport()">复制</button></div>';
    this.showModal(h);
  },
  copyNewsExport: function() {
    var ta = document.getElementById('exportNewsText');
    if (ta) { ta.select(); document.execCommand('copy'); this.showToast('\u2705 已复制到剪贴板'); }
  },
  // ===== Window: English (英语学习) =====
  _englishFilter: 'today20',
  _englishMode: 'today20',
  renderEnglish: function() {
    var self = this;
    var data = Storage.getEnglishData();
    var goal = data.goal || { name: '英语学习', tag: '商务管理', totalWords: 200, dailyPush: 20 };
    var today = Storage.today();
    var todayMin = Storage.getEnglishTodayMinutes();
    var wordData = Storage.getDailyWords(today);
    var wordsFetched = Storage.isDailyWordsFetched(today);
    var weekCount = Storage.getEnglishWeekCheckin();
    var oralCount = Storage.getEnglishOralCount();
    var statusMap = (data.wordStatus) || {};
    var pushed = goal.dailyPush || 20;
    var total = goal.totalWords || 200;

    // 已掌握单词数：所有历史日子中标记为 "已掌握" 的去重集合
    var masteredSet = {};
    var allWords = Storage.get(Storage.KEYS.DAILY_WORDS) || {};
    Object.keys(allWords).forEach(function(d) {
      (allWords[d].words || []).forEach(function(w) {
        var st = statusMap[w.word] ? statusMap[w.word].status : null;
        if (st === '已掌握') masteredSet[w.word] = true;
      });
    });
    var mastered = Object.keys(masteredSet).length;
    var pending = Math.max(0, total - mastered);
    var pct = total > 0 ? Math.round(mastered / total * 100) : 0;
    if (pct > 100) pct = 100;

    var h = '<div class="window-header"><div class="window-title">📚 英语学习</div>';
    h += '<button class="btn btn-primary btn-sm" onclick="App.showEnglishModal()">+ 打卡</button></div>';

    // ===== 1. 目标卡 =====
    h += '<div class="eng-goal-card" onclick="App.showEnglishGoalModal()">';
    h += '<div class="eng-goal-row1"><span class="eng-goal-icon">🎓</span>';
    h += '<span class="eng-goal-name">' + self._esc(goal.name) + '</span>';
    h += '<span class="eng-goal-edit">✏️</span></div>';
    h += '<div class="eng-goal-desc">题库' + total + '词 · ' + self._esc(goal.tag) + ' · 每日推送' + pushed + '词</div>';
    h += '<div class="eng-goal-progress">';
    h += '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%;"></div></div>';
    h += '<div class="eng-goal-meta">总进度 ' + mastered + '/' + total + ' (' + pct + '%)</div>';
    h += '</div></div>';

    // ===== 2. 统计网格 (3x2) =====
    h += '<div class="eng-stats-grid">';
    h += '<div class="eng-stat-box"><div class="eng-stat-num">' + pushed + '</div><div class="eng-stat-label">今日</div></div>';
    h += '<div class="eng-stat-box"><div class="eng-stat-num">' + mastered + '</div><div class="eng-stat-label">今日已掌握</div></div>';
    h += '<div class="eng-stat-box"><div class="eng-stat-num">' + pending + '</div><div class="eng-stat-label">待掌握</div></div>';
    h += '<div class="eng-stat-box"><div class="eng-stat-num">' + oralCount + '</div><div class="eng-stat-label">口语</div></div>';
    h += '<div class="eng-stat-box"><div class="eng-stat-num">' + weekCount + '/' + (data.weekCheckin || 7) + '</div><div class="eng-stat-label">本周打卡</div></div>';
    h += '<div class="eng-stat-box"><div class="eng-stat-num">' + todayMin + 'm</div><div class="eng-stat-label">今日时长</div></div>';
    h += '</div>';

    // ===== 3. 主操作行 =====
    h += '<div class="eng-action-row">';
    h += '<button class="eng-action eng-action-primary" onclick="App.showEnglishModal()">打卡</button>';
    h += '<button class="eng-action" onclick="App.englishActionStudy()">今日背词</button>';
    h += '<button class="eng-action" onclick="App.englishActionReview()">生词复习</button>';
    h += '<button class="eng-action" onclick="App.englishActionAdd()">新增单词</button>';
    h += '</div>';

    // ===== 4. 过滤器行 =====
    var filter = this._englishFilter || 'today20';
    var filterMap = { today20: '今日20词', all: '全部', new: '生词', familiar: '熟悉', mastered: '已掌握' };
    var fbtns = ['today20', 'all', 'new', 'familiar', 'mastered'].map(function(f) {
      var cls = 'eng-filter' + (filter === f ? ' eng-filter-active' : '');
      return '<button class="' + cls + '" onclick="App.englishSetFilter(\'' + f + '\')">' + filterMap[f] + '</button>';
    }).join('');
    h += '<div class="eng-filter-row">' + fbtns + '</div>';

    // ===== 5. 词表 =====
    h += '<div class="card"><div class="card-title">📚 今日单词 (' + (wordData && wordData.words ? wordData.words.length : 0) + ')';
    h += '<button class="btn-icon-sm" style="float:right;" onclick="App.fetchDailyWords(false)" title="刷新单词">🔄</button>';
    h += '</div>';

    if (wordData && wordData.words && wordData.words.length > 0) {
      var words = wordData.words.slice();
      // 过滤
      if (filter === 'new') {
        words = words.filter(function(w) { return !statusMap[w.word]; });
      } else if (filter === 'familiar') {
        words = words.filter(function(w) { return statusMap[w.word] && statusMap[w.word].status === '熟悉'; });
      } else if (filter === 'mastered') {
        words = words.filter(function(w) { return statusMap[w.word] && statusMap[w.word].status === '已掌握'; });
      } else if (filter === 'all') {
        // 全部：含历史日期所有单词
        var allWordsList = [];
        Object.keys(allWords).forEach(function(d) {
          (allWords[d].words || []).forEach(function(w) {
            if (!allWordsList.find(function(x) { return x.word === w.word; })) {
              allWordsList.push(Object.assign({}, w, { date: d }));
            }
          });
        });
        words = allWordsList;
      }

      if (words.length === 0) {
        h += '<div class="empty-state-sm"><div class="empty-text">当前过滤下无单词</div></div>';
      } else {
        h += '<div class="word-list">';
        words.forEach(function(w, i) {
          var posShort = w.pos ? w.pos.replace('noun', 'n.').replace('verb', 'v.').replace('adjective', 'adj.').replace('adverb', 'adv.').replace('pronoun', 'pron.').replace('preposition', 'prep.').replace('conjunction', 'conj.') : '';
          var ws = statusMap[w.word];
          var status = ws ? ws.status : '今日';
          var statusTagCls = status === '已掌握' ? 'tag-mint' : (status === '熟悉' ? 'tag-blue' : 'tag-yellow');
          h += '<div class="word-card-compact" onclick="App.toggleWordDetail(this)">';
          h += '<div class="wc-head">';
          h += '<span class="wc-num">' + (i + 1) + '</span>';
          h += '<span class="wc-spell">' + self._esc(w.word) + '</span>';
          if (posShort) h += '<span class="wc-pos">' + self._esc(posShort) + '</span>';
          h += '<span class="wc-toggle">▼</span>';
          h += '</div>';
          if (w.meaning) h += '<div class="wc-meaning">' + self._esc(w.meaning) + '</div>';
          h += '<div class="wc-tags">';
          h += '<span class="tag tag-' + (goal.tag === '商务管理' ? 'blue' : 'mint') + '">' + self._esc(goal.tag || '通用') + '</span>';
          h += '<span class="tag tag-yellow">生词·今日</span>';
          if (status && status !== '今日') {
            h += '<span class="tag ' + statusTagCls + '" style="cursor:pointer;" onclick="App.englishCycleWordStatus(\'' + self._esc(w.word) + '\', event)" title="点击切换状态">' + status + ' ▾</span>';
          } else {
            h += '<span class="tag tag-outline" style="cursor:pointer;color:#888;" onclick="App.englishCycleWordStatus(\'' + self._esc(w.word) + '\', event)" title="点击标记状态">+标记</span>';
          }
          h += '</div>';
          // 展开面板：保留上次设计的搭配/例句/易混 三板块
          h += '<div class="word-detail"><div class="word-detail-inner">';
          h += '<div class="word-section"><div class="word-section-title">✨ 高频搭配</div>';
          if (w.collocations && w.collocations.length > 0) {
            h += '<div class="word-collocations">';
            w.collocations.forEach(function(c) { h += '<span class="word-collocation">' + self._esc(c) + '</span>'; });
            h += '</div>';
          } else {
            h += '<div class="word-empty">暂无搭配数据</div>';
          }
          h += '</div>';
          h += '<div class="word-section"><div class="word-section-title">📝 实用例句</div>';
          if (w.example) {
            h += '<div class="word-example">' + self._esc(w.example) + '</div>';
            if (w.exampleZh) h += '<div class="word-example-zh">' + self._esc(w.exampleZh) + '</div>';
          } else {
            h += '<div class="word-empty">暂无例句</div>';
          }
          h += '</div>';
          h += '<div class="word-section"><div class="word-section-title">⚠️ 易混提示</div>';
          if (w.confusion) {
            h += '<div class="word-confusion">' + self._esc(w.confusion) + '</div>';
          } else {
            h += '<div class="word-empty">无特殊辨析</div>';
          }
          h += '</div>';
          h += '</div></div>';
          h += '</div>';
        });
        h += '</div>';
      }
    } else if (!wordsFetched) {
      h += '<div class="loading-state"><div class="loading-icon"></div><div style="margin-top:8px;color:#999;">正在从网络获取单词…</div></div>';
    } else {
      h += '<div class="empty-state-sm"><div class="empty-text">暂无单词数据</div></div>';
    }
    h += '</div>';

    // 每天首次打开自动获取
    if (!wordsFetched) {
      this.fetchDailyWords(true);
    }

    // ===== 6. 学习记录 =====
    h += '<div class="card"><div class="card-title">📋 学习记录</div>';
    var recent = data.records.slice().reverse().slice(0, 20);
    if (recent.length === 0) {
      h += '<div class="empty-state-sm"><div class="empty-text">暂无学习记录<br>点击打卡开始</div></div>';
    } else {
      h += '<div class="table-wrap"><table class="data-table"><thead><tr><th>日期</th><th>类型</th><th>时长</th><th>内容</th><th></th></tr></thead><tbody>';
      recent.forEach(function(r) {
        h += '<tr><td>' + r.date + '</td><td><span class="tag tag-blue">' + r.type + '</span></td>';
        h += '<td style="font-weight:700;">' + r.duration + 'min</td>';
        h += '<td>' + self._esc(r.content || r.notes || '') + '</td>';
        h += '<td><button class="btn-icon-sm" onclick="App.deleteEnglishRecord(\'' + r.id + '\')">×</button></td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div>';

    // ===== 7. 底栏 =====
    h += '<div class="eng-bottom-bar">';
    h += '<button class="eng-bottom-btn" onclick="App.englishSyncAll()">同步全部</button>';
    h += '<button class="eng-bottom-btn" onclick="App.englishEndOfDay()">下班一键</button>';
    h += '<button class="eng-bottom-btn" onclick="App.englishExport()">存档导出</button>';
    h += '</div>';

    return h;
  },
  showEnglishGoalModal: function() {
    var data = Storage.getEnglishData();
    var g = data.goal || {};
    var h = '<div class="modal-title">🎓 编辑学习目标</div><div class="modal-body">';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">目标名称</label><input type="text" class="input-field" id="engGoalName" value="' + this._esc(g.name || '') + '" placeholder="例：上海海事大学 MBA 备考"></div>';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">分类标签</label><input type="text" class="input-field" id="engGoalTag" value="' + this._esc(g.tag || '商务管理') + '" placeholder="例：商务管理"></div>';
    h += '<div style="display:flex;gap:10px;margin-bottom:12px;"><div style="flex:1;"><label class="modal-label">题库总词数</label><input type="number" class="input-field" id="engGoalTotal" value="' + (g.totalWords || 200) + '" min="20" max="2000"></div>';
    h += '<div style="flex:1;"><label class="modal-label">每日推送</label><input type="number" class="input-field" id="engGoalDaily" value="' + (g.dailyPush || 20) + '" min="5" max="50"></div></div>';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">本周打卡目标 (天)</label><input type="number" class="input-field" id="engGoalWeek" value="' + (data.weekCheckin || 7) + '" min="1" max="7"></div>';
    h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.saveEnglishGoal()">保存</button></div>';
    this.showModal(h);
  },
  saveEnglishGoal: function() {
    var name = document.getElementById('engGoalName').value.trim();
    var tag = document.getElementById('engGoalTag').value.trim() || '通用';
    var total = parseInt(document.getElementById('engGoalTotal').value) || 200;
    var daily = parseInt(document.getElementById('engGoalDaily').value) || 20;
    var week = parseInt(document.getElementById('engGoalWeek').value) || 7;
    if (week < 1) week = 1; if (week > 7) week = 7;
    var data = Storage.getEnglishData();
    Storage.saveEnglishGoal({ name: name || '英语学习', tag: tag, totalWords: total, dailyPush: daily });
    data.weekCheckin = week;
    Storage.set(Storage.KEYS.ENGLISH, data);
    this.closeModal();
    this.render();
    this.showToast('✅ 目标已更新');
  },
  englishSetFilter: function(f) {
    this._englishFilter = f;
    this.render();
  },
  englishCycleWordStatus: function(word, evt) {
    if (evt) { evt.stopPropagation(); }
    var cur = Storage.getEnglishWordStatus(word) || null;
    var order = ['新词', '熟悉', '已掌握', null];
    var next = order[(order.indexOf(cur) + 1) % order.length];
    Storage.setEnglishWordStatus(word, next);
    this.render();
    this.showToast(next ? '已标记为：' + next : '已重置标记');
  },
  englishActionStudy: function() {
    this._englishFilter = 'today20';
    this.render();
    this.showToast('📖 今日20词，已展开');
  },
  englishActionReview: function() {
    this._englishFilter = 'new';
    this.render();
    this.showToast('🔁 切换到生词复习');
  },
  englishActionAdd: function() {
    var h = '<div class="modal-title">➕ 新增单词</div><div class="modal-body">';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">英文单词</label><input type="text" class="input-field" id="newWWord" placeholder="例：leverage"></div>';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">中文释义</label><input type="text" class="input-field" id="newWMeaning" placeholder="例：杠杆 / 影响"></div>';
    h += '<div><label class="modal-label">备注 (可选)</label><input type="text" class="input-field" id="newWNote" placeholder="例：MBA 高频词"></div>';
    h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.saveEnglishAddWord()">加入今日</button></div>';
    this.showModal(h);
  },
  saveEnglishAddWord: function() {
    var word = document.getElementById('newWWord').value.trim().toLowerCase();
    var meaning = document.getElementById('newWMeaning').value.trim();
    var note = document.getElementById('newWNote').value.trim();
    if (!word) { this.showToast('请输入单词'); return; }
    var today = Storage.today();
    var d = Storage.getDailyWords(today) || { date: today, words: [], webFetched: true, fetchedAt: Storage.now() };
    if (!d.words) d.words = [];
    if (d.words.find(function(w) { return w.word === word; })) {
      this.showToast('该单词已在列表中');
    } else {
      d.words.unshift({ word: word, meaning: meaning, pos: '', phonetic: '', collocations: [], example: '', exampleZh: '', confusion: '', isManual: true, note: note });
      Storage.saveDailyWords(today, d.words);
    }
    Storage.addEnglishRecord({ type: '单词记忆', duration: 1, content: '手动新增：' + word + (note ? ' (' + note + ')' : '') });
    this.closeModal();
    this.render();
    this.showToast('✅ 已加入今日');
  },
  englishSyncAll: function() {
    this.fetchDailyWords(false);
  },
  englishEndOfDay: function() {
    if (!confirm('确认结束今日学习？已学单词将标记为"熟悉"。')) return;
    var today = Storage.today();
    var d = Storage.getDailyWords(today);
    if (d && d.words) {
      var statusMap = (Storage.getEnglishData().wordStatus) || {};
      d.words.forEach(function(w) {
        if (!statusMap[w.word]) {
          Storage.setEnglishWordStatus(w.word, '熟悉');
        }
      });
    }
    Storage.addEnglishRecord({ type: '单词记忆', duration: 0, content: '下班打卡：今日学习结束' });
    this.render();
    this.showToast('🌙 今日学习已结课');
  },
  englishExport: function() {
    var today = Storage.today();
    var d = Storage.getDailyWords(today);
    var data = Storage.getEnglishData();
    var statusMap = data.wordStatus || {};
    var lines = [];
    lines.push('# 英语学习存档 (' + today + ')');
    lines.push('');
    var g = data.goal || {};
    lines.push('目标：' + (g.name || '') + ' · 题库' + (g.totalWords || 0) + '词 · 已掌握 ' + Object.keys(statusMap).filter(function(k){return statusMap[k].status==='已掌握';}).length + ' 个');
    lines.push('');
    if (d && d.words) {
      d.words.forEach(function(w, i) {
        var st = statusMap[w.word] ? statusMap[w.word].status : '新词';
        lines.push((i + 1) + '. ' + w.word + (w.phonetic ? ' /' + w.phonetic + '/' : '') + ' — ' + (w.meaning || '') + ' [' + st + ']');
      });
    }
    var text = lines.join('\n');
    var h = '<div class="modal-title">📤 存档导出</div><div class="modal-body">';
    h += '<textarea id="engExportText" class="input-field" style="height:300px;font-family:monospace;font-size:13px;line-height:1.6;" readonly>' + this._esc(text) + '</textarea>';
    h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">关闭</button><button class="btn btn-primary" onclick="App.copyEnglishExport()">复制</button></div>';
    this.showModal(h);
  },
  copyEnglishExport: function() {
    var ta = document.getElementById('engExportText');
    if (ta) { ta.select(); document.execCommand('copy'); this.showToast('✅ 已复制'); }
  },
  toggleWordDetail: function(el) {
    el.classList.toggle('expanded');
  },
  fetchDailyWords: function(silent) {
    var self = this;
    var today = Storage.today();
    if (!silent) this.showToast('\u{1F504} \u6B63\u5728\u83B7\u53D6\u5355\u8BCD\u2026');

    // 轮换主题，确保每天不同
    var topics = [
      'workplace office business', 'daily life routine', 'food cooking meal',
      'travel transportation journey', 'health medical body', 'emotion feeling mood',
      'shopping purchase buy', 'technology computer digital', 'education learning study',
      'social communication talk', 'finance money economy', 'environment nature weather',
      'sports exercise fitness', 'home family house', 'time schedule plan'
    ];
    var dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    var topic = topics[dayOfYear % topics.length];

    var url = 'https://api.datamuse.com/words?ml=' + encodeURIComponent(topic) + '&max=40&md=d&md=p';

    fetch(url).then(function(res) { return res.json(); }).then(function(data) {
      if (!data || data.length === 0) {
        if (!silent) self.showToast('\u26A0\uFE0F \u672A\u83B7\u53D6\u5230\u5355\u8BCD');
        return;
      }

      // 过滤：去掉太短(<3字母)、含空格/连字符的词，取前20个
      var candidates = data.filter(function(w) {
        return w.word && w.word.length >= 3 && w.word.indexOf(' ') === -1 &&
               w.word.indexOf('-') === -1 && /^[a-zA-Z]+$/.test(w.word);
      }).slice(0, 20);

      if (candidates.length === 0) {
        if (!silent) self.showToast('\u26A0\uFE0F \u672A\u627E\u5230\u5408\u9002\u5355\u8BCD');
        return;
      }

      // 为每个词异步获取详细信息
      var promises = candidates.map(function(w) {
        return self._fetchWordDetails(w.word).then(function(detail) {
          return {
            word: w.word,
            phonetic: detail.phonetic || '',
            pos: detail.pos || (w.tags && w.tags.length > 0 ? w.tags[0] : ''),
            meaning: detail.meaning || '',
            collocations: detail.collocations || [],
            example: detail.example || '',
            exampleZh: detail.exampleZh || '',
            confusion: self._generateConfusionTip(w.word, detail.pos || '')
          };
        }).catch(function() {
          return {
            word: w.word,
            phonetic: '',
            pos: (w.tags && w.tags.length > 0 ? w.tags[0] : ''),
            meaning: '',
            collocations: [],
            example: '',
            exampleZh: '',
            confusion: self._generateConfusionTip(w.word, '')
          };
        });
      });

      Promise.all(promises).then(function(words) {
        Storage.saveDailyWords(today, words);
        self.render();
        if (!silent) self.showToast('\u2705 \u83B7\u53D6\u5230 ' + words.length + ' \u4E2A\u5355\u8BCD');
      });
    }).catch(function(err) {
      console.error('[Words] fetch error:', err);
      if (!silent) self.showToast('\u26A0\uFE0F \u7F51\u7EDC\u83B7\u53D6\u5931\u8D25');
    });
  },
  _fetchWordDetails: function(word) {
    var self = this;
    var dictUrl = 'https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word);
    var translateUrl = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(word) + '&langpair=en|zh-CN';

    var dictPromise = fetch(dictUrl).then(function(res) { return res.json(); }).then(function(data) {
      var result = { phonetic: '', pos: '', example: '' };
      if (Array.isArray(data) && data.length > 0) {
        var entry = data[0];
        if (entry.phonetics && entry.phonetics.length > 0) {
          for (var i = 0; i < entry.phonetics.length; i++) {
            if (entry.phonetics[i].text) { result.phonetic = entry.phonetics[i].text; break; }
          }
        }
        if (entry.meanings && entry.meanings.length > 0) {
          var m = entry.meanings[0];
          result.pos = m.partOfSpeech || '';
          if (m.definitions && m.definitions.length > 0) {
            var d = m.definitions[0];
            result.example = d.example || '';
          }
        }
      }
      return result;
    }).catch(function() { return { phonetic: '', pos: '', example: '' }; });

    var transPromise = fetch(translateUrl).then(function(res) { return res.json(); }).then(function(data) {
      if (data && data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
      }
      return '';
    }).catch(function() { return ''; });

    var collocPromise = fetch('https://api.datamuse.com/words?rel_jja=' + encodeURIComponent(word) + '&max=5').then(function(res) { return res.json(); }).then(function(data) {
      if (Array.isArray(data) && data.length > 0) {
        return data.slice(0, 3).map(function(item) { return word + ' ' + item.word; });
      }
      return [];
    }).catch(function() { return []; });

    return Promise.all([dictPromise, transPromise, collocPromise]).then(function(results) {
      var detail = results[0];
      detail.meaning = results[1];
      detail.collocations = results[2];
      if (detail.example && detail.example.length < 200) {
        var exUrl = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(detail.example) + '&langpair=en|zh-CN';
        return fetch(exUrl).then(function(res) { return res.json(); }).then(function(data) {
          detail.exampleZh = (data && data.responseData && data.responseData.translatedText) ? data.responseData.translatedText : '';
          return detail;
        }).catch(function() { detail.exampleZh = ''; return detail; });
      }
      detail.exampleZh = '';
      return detail;
    });
  },
  _generateConfusionTip: function(word, pos) {
    var w = word.toLowerCase();
    var tips = [];
    if (w.indexOf('un') === 0 && w.length > 4) tips.push('un- 前缀表否定（如 unhappy 不开心的）');
    if (w.indexOf('re') === 0 && w.length > 4) tips.push('re- 前缀表重新（如 rewrite 重写）');
    if (w.indexOf('pre') === 0 && w.length > 5) tips.push('pre- 前缀表预先（如 preview 预览）');
    if (w.indexOf('dis') === 0 && w.length > 5) tips.push('dis- 前缀表相反（如 disagree 不同意）');
    if (w.indexOf('over') === 0 && w.length > 6) tips.push('over- 前缀表过度（如 overwork 过度工作）');
    if (w.indexOf('under') === 0 && w.length > 7) tips.push('under- 前缀表不足（如 underestimate 低估）');
    if (w.length > 5 && w.lastIndexOf('tion') === w.length - 4) tips.push('-tion 名词后缀，表动作或状态');
    if (w.length > 5 && w.lastIndexOf('ment') === w.length - 4) tips.push('-ment 名词后缀，表行为结果');
    if (w.length > 5 && w.lastIndexOf('able') === w.length - 4) tips.push('-able 形容词后缀，表可以\u2026的');
    if (w.length > 4 && w.lastIndexOf('ful') === w.length - 3) tips.push('-ful 形容词后缀，表充满\u2026的');
    if (w.length > 5 && w.lastIndexOf('less') === w.length - 4) tips.push('-less 形容词后缀，表没有\u2026的');
    if (w.length > 5 && w.lastIndexOf('ness') === w.length - 4) tips.push('-ness 名词后缀，表性质或状态');
    if (w.length > 4 && w.lastIndexOf('ly') === w.length - 2) tips.push('-ly 副词后缀，表方式');
    if (w.length > 5 && w.lastIndexOf('ize') === w.length - 3) tips.push('-ize 动词后缀，表使\u2026化');
    if (w.length > 5 && w.lastIndexOf('ist') === w.length - 3) tips.push('-ist 名词后缀，表做\u2026的人');
    return tips.length > 0 ? tips[0] : '';
  },
  showEnglishModal: function() {
    var types = ['单词记忆', '听力练习', '阅读理解', '口语练习', '写作练习'];
    var h = '<div class="modal-title">\u{1F524} 英语学习打卡</div><div class="modal-body">';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">学习类型</label><select class="input-field" id="engType">';
    types.forEach(function(t) { h += '<option value="' + t + '">' + t + '</option>'; });
    h += '</select></div>';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">时长 (分钟)</label><input type="number" class="input-field" id="engDuration" value="20" min="1"></div>';
    h += '<div><label class="modal-label">内容/笔记</label><input type="text" class="input-field" id="engContent" placeholder="学了什么..."></div>';
    h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.saveEnglishRecord()">保存</button></div>';
    this.showModal(h);
  },
  saveEnglishRecord: function() {
    var type = document.getElementById('engType').value;
    var duration = document.getElementById('engDuration').value;
    var content = document.getElementById('engContent').value.trim();
    if (!duration || parseInt(duration) <= 0) { this.showToast('请输入有效时长'); return; }
    Storage.addEnglishRecord({ type: type, duration: duration, content: content });
    this.closeModal(); this.render(); this.showToast('已打卡 ' + duration + ' 分钟');
  },
  deleteEnglishRecord: function(id) {
    Storage.deleteEnglishRecord(id); this.render(); this.showToast('已删除');
  },

  // ===== Window: Reading (读书记录) =====
  renderReading: function() {
    var data = Storage.getReadingData();
    var reading = data.books.filter(function(b) { return b.status === '在读'; });
    var finished = data.books.filter(function(b) { return b.status === '已读'; });
    var want = data.books.filter(function(b) { return b.status === '想读'; });
    var h = '<div class="window-header"><div class="window-title">\u{1F4DA} 读书记录</div>';
    h += '<button class="btn btn-primary btn-sm" onclick="App.showBookModal()">+ 添加</button></div>';
    h += '<div class="stat-grid">';
    h += '<div class="stat-card"><div class="stat-icon">\u{1F4D6}</div><div class="stat-value">' + reading.length + '</div><div class="stat-label">在读</div></div>';
    h += '<div class="stat-card"><div class="stat-icon">\u2705</div><div class="stat-value">' + finished.length + '</div><div class="stat-label">已读</div></div>';
    h += '<div class="stat-card"><div class="stat-icon">\u{1F4DA}</div><div class="stat-value">' + data.books.length + '</div><div class="stat-label">总数</div></div>';
    h += '</div>';
    if (reading.length > 0) {
      h += '<div class="card"><div class="card-title">\u{1F4D6} 在读</div>';
      reading.forEach(function(b) {
        var pct = b.totalPages > 0 ? Math.round(b.currentPage / b.totalPages * 100) : 0;
        h += '<div class="book-item" onclick="App.showBookDetailModal(\'' + b.id + '\')">';
        h += '<div class="book-title">' + App._esc(b.title) + (b.author ? ' - ' + App._esc(b.author) : '') + '</div>';
        if (b.totalPages > 0) {
          h += '<div style="display:flex;justify-content:space-between;font-size:14px;color:#888;margin:4px 0;"><span>' + b.currentPage + '/' + b.totalPages + '页</span><span>' + pct + '%</span></div>';
          h += '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%;"></div></div>';
        }
        h += '</div>';
      });
      h += '</div>';
    }
    if (finished.length > 0) {
      h += '<div class="card"><div class="card-title">\u2705 已读 (' + finished.length + ')</div>';
      finished.slice(0, 10).forEach(function(b) {
        h += '<div class="book-item-sm" onclick="App.showBookDetailModal(\'' + b.id + '\')">';
        h += '<span>' + App._esc(b.title) + (b.author ? ' - ' + App._esc(b.author) : '') + '</span>';
        if (b.rating > 0) h += ' <span style="color:#FFD700;">' + '\u2605'.repeat(b.rating) + '</span>';
        h += '</div>';
      });
      h += '</div>';
    }
    if (want.length > 0) {
      h += '<div class="card"><div class="card-title">\u{1F4DA} 想读 (' + want.length + ')</div>';
      want.forEach(function(b) {
        h += '<div class="book-item-sm" onclick="App.showBookDetailModal(\'' + b.id + '\')">';
        h += '<span>' + App._esc(b.title) + (b.author ? ' - ' + App._esc(b.author) : '') + '</span></div>';
      });
      h += '</div>';
    }
    if (data.books.length === 0) {
      h += '<div class="empty-state"><div class="empty-icon">\u{1F4DA}</div><div class="empty-text">暂无书籍记录</div></div>';
    }
    return h;
  },
  showBookModal: function() {
    var h = '<div class="modal-title">添加书籍</div><div class="modal-body">';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">书名</label><input type="text" class="input-field" id="bkTitle" placeholder="书名..."></div>';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">作者</label><input type="text" class="input-field" id="bkAuthor" placeholder="作者..."></div>';
    h += '<div style="display:flex;gap:10px;margin-bottom:12px;"><div style="flex:1;"><label class="modal-label">分类</label><input type="text" class="input-field" id="bkCategory" placeholder="分类"></div>';
    h += '<div style="flex:1;"><label class="modal-label">总页数</label><input type="number" class="input-field" id="bkPages" placeholder="页数" min="0"></div></div>';
    h += '<div><label class="modal-label">状态</label><select class="input-field" id="bkStatus"><option value="想读">想读</option><option value="在读">在读</option><option value="已读">已读</option></select></div>';
    h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.saveBook()">添加</button></div>';
    this.showModal(h);
  },
  saveBook: function() {
    var title = document.getElementById('bkTitle').value.trim();
    if (!title) { this.showToast('请输入书名'); return; }
    var status = document.getElementById('bkStatus').value;
    var book = Storage.addBook({
      title: title, author: document.getElementById('bkAuthor').value.trim(),
      category: document.getElementById('bkCategory').value.trim(),
      totalPages: document.getElementById('bkPages').value, status: status
    });
    if (status === '在读') book.startDate = Storage.today();
    if (status === '已读') book.finishDate = Storage.today();
    Storage.updateBook(book.id, { startDate: book.startDate, finishDate: book.finishDate });
    this.closeModal(); this.render(); this.showToast('已添加');
  },
  showBookDetailModal: function(id) {
    var data = Storage.getReadingData();
    var b = data.books.find(function(x) { return x.id === id; });
    if (!b) return;
    var h = '<div class="modal-title">\u{1F4D6} ' + this._esc(b.title) + '</div><div class="modal-body">';
    h += '<div style="margin-bottom:10px;font-size:15px;color:#666;">' + (b.author ? '作者: ' + this._esc(b.author) + '<br>' : '') + (b.category ? '分类: ' + this._esc(b.category) + '<br>' : '') + '状态: <b>' + b.status + '</b><br>';
    if (b.totalPages > 0) h += '进度: ' + b.currentPage + '/' + b.totalPages + '页</div>';
    else h += '</div>';
    if (b.status === '在读' && b.totalPages > 0) {
      h += '<div style="margin-bottom:12px;"><label class="modal-label">当前页数</label><input type="number" class="input-field" id="bkPage" value="' + b.currentPage + '" min="0" max="' + b.totalPages + '"></div>';
    }
    h += '<div style="margin-bottom:12px;"><label class="modal-label">状态</label><select class="input-field" id="bkStat"><option value="想读">想读</option><option value="在读"' + (b.status === '在读' ? ' selected' : '') + '>在读</option><option value="已读"' + (b.status === '已读' ? ' selected' : '') + '>已读</option></select></div>';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">评分 (1-5)</label><input type="number" class="input-field" id="bkRating" value="' + b.rating + '" min="0" max="5"></div>';
    h += '<div><label class="modal-label">笔记</label><textarea class="input-field" id="bkNotes" style="min-height:80px;">' + this._esc(b.notes || '') + '</textarea></div>';
    h += '</div><div class="modal-footer"><button class="btn btn-danger" onclick="App.deleteBook(\'' + id + '\')">删除</button><button class="btn btn-outline" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.saveBookDetail(\'' + id + '\')">保存</button></div>';
    this.showModal(h);
  },
  saveBookDetail: function(id) {
    var updates = {};
    var stat = document.getElementById('bkStat');
    var page = document.getElementById('bkPage');
    var rating = document.getElementById('bkRating');
    var notes = document.getElementById('bkNotes');
    if (stat) updates.status = stat.value;
    if (page) updates.currentPage = parseInt(page.value) || 0;
    if (rating) updates.rating = parseInt(rating.value) || 0;
    if (notes) updates.notes = notes.value.trim();
    if (updates.status === '已读' && !Storage.getReadingData().books.find(function(x) { return x.id === id; }).finishDate) {
      updates.finishDate = Storage.today();
    }
    if (updates.status === '在读' && !Storage.getReadingData().books.find(function(x) { return x.id === id; }).startDate) {
      updates.startDate = Storage.today();
    }
    Storage.updateBook(id, updates);
    this.closeModal(); this.render(); this.showToast('已保存');
  },
  deleteBook: function(id) {
    Storage.deleteBook(id); this.closeModal(); this.render(); this.showToast('已删除');
  },

  // ===== Window: Exercise (运动锻炼) =====
  renderExercise: function() {
    var data = Storage.getExerciseData();
    var weekCount = Storage.getExerciseWeekCount();
    var goal = data.weeklyGoal;
    var pct = goal > 0 ? Math.min(100, Math.round(weekCount / goal * 100)) : 0;
    var h = '<div class="window-header"><div class="window-title">\u{1F4AA} 运动锻炼</div>';
    h += '<button class="btn btn-primary btn-sm" onclick="App.showExerciseModal()">+ 打卡</button></div>';
    h += '<div class="stat-grid">';
    h += '<div class="stat-card"><div class="stat-icon">\u{1F4AA}</div><div class="stat-value">' + weekCount + '/' + goal + '</div><div class="stat-label">本周次数</div></div>';
    h += '<div class="stat-card"><div class="stat-icon">\u{1F4DD}</div><div class="stat-value">' + data.records.length + '</div><div class="stat-label">总记录</div></div>';
    h += '</div>';
    if (weekCount > 0) {
      h += '<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;font-size:15px;color:#888;margin-bottom:4px;"><span>本周目标</span><span>' + pct + '%</span></div>';
      h += '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%;"></div></div></div>';
    }
    h += '<div class="card"><div class="card-title">\u{1F4CB} 运动记录</div>';
    var recent = data.records.slice().reverse().slice(0, 20);
    if (recent.length === 0) {
      h += '<div class="empty-state-sm"><div class="empty-text">暂无运动记录</div></div>';
    } else {
      h += '<div class="table-wrap"><table class="data-table"><thead><tr><th>日期</th><th>类型</th><th>时长</th><th>强度</th><th></th></tr></thead><tbody>';
      recent.forEach(function(r) {
        var intColor = r.intensity === '高' ? '#FF6B6B' : r.intensity === '低' ? '#8BC34A' : '#FF9800';
        h += '<tr><td>' + r.date + '</td><td><span class="tag tag-mint">' + r.type + '</span></td>';
        h += '<td style="font-weight:700;">' + r.duration + 'min</td>';
        h += '<td style="color:' + intColor + ';">' + r.intensity + '</td>';
        h += '<td><button class="btn-icon-sm" onclick="App.deleteExerciseRecord(\'' + r.id + '\')">\u00D7</button></td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div>';
    return h;
  },
  showExerciseModal: function() {
    var types = ['跑步', '游泳', '健身', '骑行', '瑜伽', '球类', '其他'];
    var h = '<div class="modal-title">\u{1F4AA} 运动打卡</div><div class="modal-body">';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">运动类型</label><select class="input-field" id="exType">';
    types.forEach(function(t) { h += '<option value="' + t + '">' + t + '</option>'; });
    h += '</select></div>';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">时长 (分钟)</label><input type="number" class="input-field" id="exDuration" value="30" min="1"></div>';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">强度</label><select class="input-field" id="exIntensity"><option>低</option><option selected>中等</option><option>高</option></select></div>';
    h += '<div><label class="modal-label">备注</label><input type="text" class="input-field" id="exNotes" placeholder="可选..."></div>';
    h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.saveExerciseRecord()">保存</button></div>';
    this.showModal(h);
  },
  saveExerciseRecord: function() {
    var duration = document.getElementById('exDuration').value;
    if (!duration || parseInt(duration) <= 0) { this.showToast('请输入有效时长'); return; }
    Storage.addExerciseRecord({
      type: document.getElementById('exType').value,
      duration: duration, intensity: document.getElementById('exIntensity').value,
      notes: document.getElementById('exNotes').value.trim()
    });
    this.closeModal(); this.render(); this.showToast('已打卡 ' + duration + ' 分钟');
  },
  deleteExerciseRecord: function(id) {
    Storage.deleteExerciseRecord(id); this.render(); this.showToast('已删除');
  },

  // ===== Window: Inspiration (每日灵感) =====
  renderInspiration: function() {
    var list = Storage.getInspirations();
    var h = '<div class="window-header"><div class="window-title">\u{1F4A1} 每日灵感</div>';
    h += '<button class="btn btn-primary btn-sm" onclick="App.showInspirationModal()">+ 记录</button></div>';
    h += '<div class="stat-grid">';
    h += '<div class="stat-card"><div class="stat-icon">\u{1F4A1}</div><div class="stat-value">' + list.length + '</div><div class="stat-label">总灵感</div></div>';
    h += '<div class="stat-card"><div class="stat-icon">\u2B50</div><div class="stat-value">' + list.filter(function(x) { return x.favorited; }).length + '</div><div class="stat-label">收藏</div></div>';
    h += '</div>';
    if (list.length === 0) {
      h += '<div class="empty-state"><div class="empty-icon">\u{1F4A1}</div><div class="empty-text">暂无灵感记录<br>随时记录闪念</div></div>';
    } else {
      list.forEach(function(item) {
        h += '<div class="inspiration-item' + (item.favorited ? ' favorited' : '') + '">';
        h += '<div class="inspiration-text">' + App._esc(item.text) + '</div>';
        h += '<div class="inspiration-meta">';
        h += '<span class="tag tag-lavender">' + App._esc(item.source) + '</span>';
        h += '<span style="color:#B0B0B0;">' + item.date + '</span>';
        h += '</div>';
        h += '<div class="inspiration-actions">';
        h += '<button class="btn-icon-sm ' + (item.favorited ? 'btn-icon-yellow' : '') + '" onclick="App.toggleInspirationFav(\'' + item.id + '\')">' + (item.favorited ? '\u2B50' : '\u2606') + '</button>';
        h += '<button class="btn-icon-sm" onclick="App.deleteInspiration(\'' + item.id + '\')">\u{1F5D1}\uFE0F</button>';
        h += '</div></div>';
      });
    }
    return h;
  },
  showInspirationModal: function() {
    var h = '<div class="modal-title">\u{1F4A1} 记录灵感</div><div class="modal-body">';
    h += '<div><label class="modal-label">灵感内容</label><textarea class="input-field" id="inspText" placeholder="记录你的闪念..." style="min-height:100px;"></textarea></div>';
    h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.saveInspiration()">保存</button></div>';
    this.showModal(h);
  },
  saveInspiration: function() {
    var text = document.getElementById('inspText').value.trim();
    if (!text) { this.showToast('请输入灵感内容'); return; }
    Storage.addInspiration(text, '手动');
    this.closeModal(); this.render(); this.showToast('已记录');
  },
  toggleInspirationFav: function(id) {
    Storage.toggleInspirationFavorite(id); this.render();
  },
  deleteInspiration: function(id) {
    Storage.deleteInspiration(id); this.render(); this.showToast('已删除');
  },
  // ===== Settings Modal =====
  showSettingsModal: function() {
    var settings = Storage.get(Storage.KEYS.SETTINGS) || {};
    var size = Storage.getStorageSize();
    var next = Scheduler.getNextRun();
    var h = '<div class="modal-title">⚙️ 设置</div><div class="modal-body">';
    h += '<div class="setting-group"><div class="setting-group-title">📊 数据管理</div>';
    h += '<div class="setting-item"><span class="setting-label">存储占用</span><span class="setting-value">' + size + ' KB</span></div>';
    h += '<div class="setting-item" onclick="App.exportData()"><span class="setting-label">📤 导出全部数据</span><span class="setting-value">点击导出</span></div>';
    h += '<div class="setting-item" onclick="App.importData()"><span class="setting-label">📥 导入数据</span><span class="setting-value">点击导入</span></div>';
    h += '<div class="setting-item" onclick="App.confirmClear()"><span class="setting-label">🗑️ 清空全部数据</span><span class="setting-value" style="color:#FF9AA2;">危险操作</span></div>';
    h += '</div>';
    h += '<div class="setting-group"><div class="setting-group-title">⏰ 定时任务</div>';
    if (next.length > 0) {
      next.forEach(function(n) {
        var d = n.time;
        var s = (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        h += '<div class="setting-item"><span class="setting-label">' + n.name + '</span><span class="setting-value">下次: ' + s + '</span></div>';
      });
    }
    h += '<div class="setting-item" onclick="App.testScheduler()"><span class="setting-label">🧪 手动测试调度</span><span class="setting-value">点击执行</span></div>';
    h += '</div>';
    h += '<div class="setting-group"><div class="setting-group-title">ℹ️ 关于</div>';
    h += '<div class="setting-item"><span class="setting-label">应用版本</span><span class="setting-value">v2.0.0</span></div>';
    h += '<div class="setting-item"><span class="setting-label">创建日期</span><span class="setting-value">' + (settings.createdDate || '-') + '</span></div>';
    h += '<div class="setting-item"><span class="setting-label">数据存储</span><span class="setting-value">本地持久化</span></div>';
    h += '</div>';
    h += '<div style="text-align:center;padding:12px;color:#B0B0B0;font-size:14px;">🐰 个人效率工作台 · 米菲兔风格</div>';
    h += '</div><div class="modal-footer"><button class="btn btn-primary" onclick="App.closeModal()">关闭</button></div>';
    this.showModal(h);
  },
  // ===== Window: History Today (历史上的今天) =====
  renderHistoryToday: function() {
    var self = this;
    var today = Storage.today();
    var stored = Storage.getHistoryToday(today);
    var webFetched = Storage.isHistoryWebFetched(today);
    var categoryLabels = { tech: '科技', movie: '电影', music: '音乐', science: '科学', culture: '文化', history: '历史' };
    var categoryColors = { tech: '#5BA4E5', movie: '#FF9AA2', music: '#C9B6F0', science: '#95E1A3', culture: '#FFB347', history: '#C9B6F0' };

    var h = '<div class="window-header"><div class="window-title">📜 历史上的今天</div>';
    h += '<button class="btn btn-primary btn-sm" onclick="App.fetchHistoryFromWeb(false)">🔄 刷新</button></div>';

    var now = new Date();
    h += '<div class="history-date-banner">' + (now.getMonth() + 1) + '月' + now.getDate() + '日 · ' + today + '</div>';

    var allEntries = (stored && stored.entries) ? stored.entries : [];
    if (allEntries.length > 0) {
      allEntries.forEach(function(e) {
        var catLabel = categoryLabels[e.category] || '其他';
        var catColor = categoryColors[e.category] || '#888';
        h += '<div class="history-card history-main">';
        h += '<div class="history-cat-tag" style="background:' + catColor + '20;color:' + catColor + ';">' + catLabel + '</div>';
        if (e.year) h += '<div class="history-year">' + self._esc(e.year) + '</div>';
        h += '<div class="history-title">' + self._esc(e.title) + '</div>';
        h += '<div class="history-story">' + self._esc(e.story) + '</div>';
        h += '</div>';
      });
    } else if (!webFetched) {
      h += '<div class="loading-state"><div class="loading-icon">⏳</div><div style="margin-top:8px;color:#999;">正在从网络获取数据…</div></div>';
    } else {
      h += '<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">暂无数据</div></div>';
    }

    // 每天首次打开自动从网络获取
    if (!webFetched) {
      this.fetchHistoryFromWeb(true);
    }

    var sourceLabel = webFetched ? '✅ 已联网获取' : '⏳ 加载中…';
    h += '<div class="history-footer">共 ' + allEntries.length + ' 条 · ' + sourceLabel + '</div>';
    return h;
  },
  fetchHistoryFromWeb: function(silent) {
    var self = this;
    var today = Storage.today();
    var mm = today.substring(5, 7);
    var dd = today.substring(8, 10);
    if (!silent) this.showToast('\u{1F504} \u6B63\u5728\u83B7\u53D6\u2026');
    // Use Baidu Baike "Events on History" API (Chinese, CORS-supported, not blocked)
    var apiUrl = 'https://baike.baidu.com/cms/home/eventsOnHistory/' + mm + '.json';
    fetch(apiUrl).then(function(res) { return res.json(); }).then(function(data) {
      var dateKey = mm + dd;
      var monthData = data[mm] || {};
      var events = monthData[dateKey] || [];
      if (events.length > 0) {
        self._processHistoryEvents(events, today, silent);
      } else {
        self._fallbackHistoryLocal(today, silent);
      }
    }).catch(function(err) {
      console.log('[History] Baidu Baike API error:', err);
      self._fallbackHistoryLocal(today, silent);
    });
  },
  _processHistoryEvents: function(events, today, silent) {
    var self = this;
    var entries = [];
    var catKeywords = {
      tech: ['计算机','互联网','软件','手机','科技','电子','机器人','人工智能','太空','航天','火箭','卫星','专利','发明','computer','internet','software','tech','space','nasa','rocket','patent','invent'],
      movie: ['电影','奥斯卡','演员','导演','film','movie','cinema','oscar','actor','director'],
      music: ['音乐','专辑','歌曲','乐队','演唱会','格莱美','music','album','song','band','concert','grammy'],
      science: ['科学','发现','物理','化学','生物','基因','原子','量子','诺贝尔','science','discover','physics','biology','nobel'],
      culture: ['文化','艺术','文学','绘画','建筑','culture','art','literature','painting']
    };
    events.forEach(function(ev) {
      if (entries.length >= 8) return;
      var rawTitle = ev.title || '';
      // Strip HTML tags from title
      var text = rawTitle.replace(/<[^>]+>/g, '');
      if (text.length < 5) return;
      var cat = 'history';
      for (var key in catKeywords) {
        for (var i = 0; i < catKeywords[key].length; i++) {
          if (text.toLowerCase().indexOf(catKeywords[key][i].toLowerCase()) !== -1) { cat = key; break; }
        }
        if (cat !== 'history') break;
      }
      var typeLabel = '';
      if (ev.type === 'birth') typeLabel = '出生';
      else if (ev.type === 'death') typeLabel = '逝世';
      entries.push({
        title: text.length > 80 ? text.substring(0, 80) + '…' : text,
        year: ev.year ? String(ev.year) : '',
        category: cat,
        story: text + (typeLabel ? '（' + typeLabel + '）' : ''),
        source: 'web'
      });
    });
    if (entries.length === 0) {
      self._fallbackHistoryLocal(today, silent);
      return;
    }
    Storage.replaceHistoryEntries(today, entries);
    self.render();
    if (!silent) self.showToast('✅ 获取到 ' + entries.length + ' 条历史事件');
  },
  _fallbackHistoryLocal: function(today, silent) {
    var self = this;
    var localEntry = HistoryTodayDB.getLocalEntry(today);
    var randomEntry = HistoryTodayDB.getRandomEntry();
    var entry = localEntry || randomEntry;
    var entries = [];
    if (entry) entries.push(Object.assign({ source: 'local' }, entry));
    Storage.replaceHistoryEntries(today, entries);
    self.render();
    if (!silent) self.showToast('⚠️ 网络获取失败，使用本地数据');
  },

  // ===== Window: Daily Why (每天一个为什么) =====
  renderDailyWhy: function() {
    var self = this;
    var today = Storage.today();
    var stored = Storage.getDailyWhy(today);
    var webFetched = Storage.isDailyWhyWebFetched(today);

    var h = '<div class="window-header"><div class="window-title">❓ 每天一个为什么</div>';
    h += '<button class="btn btn-primary btn-sm" onclick="App.refreshDailyWhy()">🎲 换一个</button></div>';

    if (stored && stored.entry) {
      var e = stored.entry;
      var categoryColors = { '科学': '#5BA4E5', '生活': '#FFB347', '历史': '#C9B6F0', '自然': '#95E1A3', '食物': '#FF9AA2', '文化': '#FFD93D', '动物': '#FF6B6B', '人体': '#95E1A3', '百科': '#5BA4E5' };
      var catColor = categoryColors[e.category] || '#888';
      h += '<div class="why-card">';
      h += '<div class="why-cat-tag" style="background:' + catColor + '20;color:' + catColor + ';">' + self._esc(e.category) + '</div>';
      h += '<div class="why-question">' + self._esc(e.question) + '</div>';
      h += '<div class="why-answer">' + self._esc(e.answer).replace(/\n/g, '<br>') + '</div>';
      if (e.source) h += '<div class="why-source">📡 来源：' + self._esc(e.source) + '</div>';
      h += '</div>';
    } else if (!webFetched) {
      h += '<div class="loading-state"><div class="loading-icon">⏳</div><div style="margin-top:8px;color:#999;">正在从网络获取数据…</div></div>';
    } else {
      h += '<div class="empty-state"><div class="empty-icon">❓</div><div class="empty-text">暂无内容</div></div>';
    }

    // 每天首次打开自动从网络获取
    if (!webFetched) {
      this.fetchDailyWhyFromWeb(true);
    }

    var sourceLabel = webFetched ? '✅ 已联网获取' : '⏳ 加载中…';
    h += '<div class="why-footer">' + sourceLabel + ' · 点击「换一个」获取新内容</div>';
    return h;
  },
  fetchDailyWhyFromWeb: function(silent) {
    var self = this;
    var today = Storage.today();
    if (!silent) this.showToast('\u{1F504} \u6B63\u5728\u83B7\u53D6\u2026');
    // Use Hitokoto API directly (Wikipedia is blocked in China)
    self._fetchDailyWhyFromHitokoto(today, silent);
  },
  _fetchDailyWhyFromHitokoto: function(today, silent) {
    var self = this;
    var url = 'https://v1.hitokoto.cn/?c=d&c=i&c=k';
    fetch(url).then(function(res) { return res.json(); }).then(function(data) {
      if (data && data.hitokoto) {
        var entry = {
          id: 'hito_' + Date.now(),
          question: '你知道这句话吗？',
          answer: data.hitokoto + (data.from ? '\n—— ' + data.from : ''),
          category: '文化',
          source: '一言'
        };
        Storage.saveDailyWhyWebEntry(today, entry);
        self.render();
        if (!silent) self.showToast('✅ 已获取新内容');
      } else {
        self._fallbackDailyWhyLocal(today, silent);
      }
    }).catch(function() {
      self._fallbackDailyWhyLocal(today, silent);
    });
  },
  _fallbackDailyWhyLocal: function(today, silent) {
    var self = this;
    var seenIds = Storage.getDailyWhySeenIds();
    var entry = DailyWhyDB.getUnseen(seenIds);
    if (!entry) entry = DailyWhyDB.getUnseen([]);
    if (entry) {
      Storage.saveDailyWhyWebEntry(today, entry);
    }
    self.render();
    if (!silent) self.showToast('⚠️ 网络获取失败，使用本地题库');
  },
  refreshDailyWhy: function() {
    this.fetchDailyWhyFromWeb(false);
  },

  // ===== Modal & Toast =====
  showModal: function(html) {
    var c = document.getElementById('modalContainer');
    var ct = document.getElementById('modalContent');
    if (c && ct) { ct.innerHTML = html; c.style.display = 'flex'; }
  },
  closeModal: function() {
    var c = document.getElementById('modalContainer');
    if (c) c.style.display = 'none';
  },
  showAlert: function(text) {
    var bar = document.getElementById('alertBar');
    var span = document.getElementById('alertText');
    if (bar && span) { span.textContent = text; bar.style.display = 'flex'; }
  },
  hideAlert: function() {
    var bar = document.getElementById('alertBar');
    if (bar) bar.style.display = 'none';
  },
  showToast: function(text) {
    var ex = document.querySelector('.toast');
    if (ex) ex.remove();
    var t = document.createElement('div');
    t.className = 'toast'; t.textContent = text;
    document.body.appendChild(t);
    setTimeout(function() { t.remove(); }, 2500);
  }
};

document.addEventListener('DOMContentLoaded', function() { App.init(); });
