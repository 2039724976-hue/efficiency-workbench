var App = {
  currentWindow: 'dailyPlan',
  isPC: false,
  pcRightTopTab: 'workHours',
  pcRightBottomTab: 'reading',
  windows: [
    { id: 'dailyPlan', icon: '\u{1F4CB}', label: '\u6BCF\u65E5\u8BA1\u5212', group: 'left' },
    { id: 'workHours', icon: '\u23F0', label: '\u5DE5\u65F6\u7EDF\u8BA1', group: 'rightTop' },
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
    // \u5DE5\u65F6\u6307\u4EE4\u5FEB\u6377\u6309\u94AE
    h += '<div class="cmd-quick-actions">';
    h += '<div class="cmd-quick-btn" style="background:#E8F4FD;color:#5BA4E5;" onclick="App.quickFill(\'/\u6253\u5361\')"><span style="font-size:24px;">\u{1F4CD}</span>\u6253\u5361</div>';
    h += '<div class="cmd-quick-btn" style="background:#D4F5DC;color:#2A8B3A;" onclick="App.quickFill(\'/\u5F53\u65E5\u5DE5\u65F6\')"><span style="font-size:24px;">\u{1F4D0}</span>\u5F53\u65E5\u5DE5\u65F6</div>';
    h += '<div class="cmd-quick-btn" style="background:#FFDDE1;color:#C44A52;" onclick="App.quickFill(\'/\u8C03\u4F11\u4F7F\u7528\')"><span style="font-size:24px;">\u{1F4AC}</span>\u8C03\u4F11\u4F7F\u7528</div>';
    h += '<div class="cmd-quick-btn" style="background:#FFF3B0;color:#8A6D00;" onclick="App.quickFill(\'/\u6708\u5EA6\u7ED3\u7B97\')"><span style="font-size:24px;">\u{1F504}</span>\u6708\u5EA6\u7ED3\u7B97</div>';
    h += '<div class="cmd-quick-btn" style="background:#FFDDE1;color:#C44A52;" onclick="App.quickFill(\'/\u91CD\u7F6E\u5F53\u6708\')"><span style="font-size:24px;">\u{1F5D1}\uFE0F</span>\u91CD\u7F6E\u5F53\u6708</div>';
    h += '<div class="cmd-quick-btn" style="background:#EDE5FA;color:#7B5DB0;" onclick="App.quickFill(\'/\u5BFC\u51FA\u53F0\u8D26\')"><span style="font-size:24px;">\u{1F4E4}</span>\u5BFC\u51FA\u53F0\u8D26</div>';
    h += '</div>';
    // \u65F6\u653F\u70ED\u70B9\u6307\u4EE4\u5FEB\u6377\u6309\u94AE
    h += '<div class="cmd-quick-actions">';
    h += '<div class="cmd-quick-btn" style="background:#E8F4FD;color:#5BA4E5;" onclick="App.quickFill(\'/\u4ECA\u65E5\u7B80\u62A5\')"><span style="font-size:24px;">\u{1F4F0}</span>\u4ECA\u65E5\u7B80\u62A5</div>';
    h += '<div class="cmd-quick-btn" style="background:#EDE5FA;color:#7B5DB0;" onclick="App.quickFill(\'/\u672C\u5468\u6C47\u603B\')"><span style="font-size:24px;">\u{1F4C5}</span>\u672C\u5468\u6C47\u603B</div>';
    h += '<div class="cmd-quick-btn" style="background:#FFF3B0;color:#8A6D00;" onclick="App.quickFill(\'/\u6536\u85CF\u70ED\u70B9\')"><span style="font-size:24px;">\u2B50</span>\u6536\u85CF\u70ED\u70B9</div>';
    h += '<div class="cmd-quick-btn" style="background:#D4F5DC;color:#2A8B3A;" onclick="App.quickFill(\'/\u540C\u6B65\u7075\u611F\')"><span style="font-size:24px;">\u{1F4A1}</span>\u540C\u6B65\u7075\u611F</div>';
    h += '<div class="cmd-quick-btn" style="background:#FFDDE1;color:#C44A52;" onclick="App.quickFill(\'/\u5BFC\u51FA\u884C\u4E1A\u89C2\u70B9\')"><span style="font-size:24px;">\u{1F4E4}</span>\u5BFC\u51FA\u89C2\u70B9</div>';
    h += '</div>';
    // \u6307\u4EE4\u683C\u5F0F\u8BF4\u660E
    h += '<div class="card"><div class="card-title">\u{1F4D6} \u6307\u4EE4\u683C\u5F0F</div><div style="font-size:15px;line-height:2;color:#888;">';
    h += '<b style="color:#5BA4E5;">\u8BA1\u5212\u6307\u4EE4</b><br>';
    h += '/今日规划 \u2014 \u6253\u5F00\u4ECA\u65E5\u8BA1\u5212\u89C6\u56FE<br>';
    h += '/顺延待办 \u2014 \u624B\u52A8\u89E6\u53D1\u987A\u5EF6\u903B\u8F91<br>';
    h += '/新增任务 [标题] \u2014 \u5FEB\u901F\u65B0\u589E\u4ECA\u65E5\u5F85\u529E<br>';
    h += '/清空已完成 \u2014 \u6E05\u9664\u4ECA\u65E5\u5DF2\u5B8C\u6210\u4EFB\u52A1<br><br>';
    h += '<b style="color:#FF9AA2;">\u5DE5\u65F6\u6307\u4EE4</b><br>';
    h += '/打卡 \u2014 \u65F6\u95F4\u6BB5\u6253\u5361\u5F55\u5165<br>';
    h += '/当日工时 \u2014 \u76F4\u63A5\u586B\u5199\u5F53\u65E5\u6709\u6548\u5DE5\u65F6<br>';
    h += '/调休使用 \u2014 \u767B\u8BB0\u6D88\u8017\u8C03\u4F11<br>';
    h += '/月度结算 \u2014 \u6267\u884C\u5F53\u6708\u5DE5\u65F6\u7ED3\u7B97<br>';
    h += '/重置当月 \u2014 \u6E05\u7A7A\u5F53\u6708\u6253\u5361\u6570\u636E<br>';
    h += '/导出台账 \u2014 \u8F93\u51FA\u53EF\u590D\u5236Excel\u683C\u5F0F\u53F0\u8D26<br><br>';
    h += '<b style="color:#FFB347;">\u8D44\u8BAF\u6307\u4EE4</b><br>';
    h += '/今日简报 \u2014 \u624B\u52A8\u751F\u6210\u5F53\u65E5\u8D44\u8BAF\u7B80\u62A5<br>';
    h += '/本周汇总 \u2014 \u751F\u6210\u672C\u5468\u8D44\u8BAF\u6C47\u603B<br>';
    h += '/收藏热点 \u2014 \u67E5\u770B\u6536\u85CF\u5E93<br>';
    h += '/同步灵感 \u2014 \u63D0\u793A\u540C\u6B65\u70ED\u70B9\u611F\u609F<br>';
    h += '/导出行业观点 \u2014 \u5BFC\u51FA\u6536\u85CF\u884C\u4E1A\u89C2\u70B9\u6587\u672C<br><br>';
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
    // ===== \u5DE5\u65F6\u6307\u4EE4 =====
    if (type === '/\u6253\u5361') {
      this.switchWindow('workHours');
      this.showClockInModal();
      return '\u{1F4CD} \u8BF7\u5728\u5F39\u7A97\u4E2D\u586B\u5199\u6253\u5361\u65F6\u95F4';
    }
    if (type === '/\u5F53\u65E5\u5DE5\u65F6') {
      this.switchWindow('workHours');
      this.showDirectHoursModal();
      return '\u{1F4D0} \u8BF7\u5728\u5F39\u7A97\u4E2D\u586B\u5199\u5DE5\u65F6';
    }
    if (type === '/\u8C03\u4F11\u4F7F\u7528') {
      this.switchWindow('workHours');
      this.showCompUseModal();
      return '\u{1F4AC} \u8BF7\u5728\u5F39\u7A97\u4E2D\u586B\u5199\u8C03\u4F11\u4F7F\u7528';
    }
    if (type === '/\u6708\u5EA6\u7ED3\u7B97') {
      this.switchWindow('workHours');
      var sResult = Storage.settleMonth(Storage.getMonthKey(new Date()));
      var sMsg = '\u2705 \u7ED3\u7B97' + sResult.count + '\u6761 | \u8C03\u4F11\u4F59\u989D: ' + sResult.balance.toFixed(2) + 'h';
      if (sResult.warning) sMsg = '\u26A0\uFE0F \u8C03\u4F11\u4E0D\u8DB3! ' + sMsg;
      return sMsg;
    }
    if (type === '/\u91CD\u7F6E\u5F53\u6708') {
      this.switchWindow('workHours');
      this.confirmResetMonth();
      return '\u8BF7\u786E\u8BA4\u91CD\u7F6E\u64CD\u4F5C';
    }
    if (type === '/\u5BFC\u51FA\u53F0\u8D26') {
      this.switchWindow('workHours');
      this.doExportLedger();
      return '\u{1F4E4} \u53F0\u8D26\u5DF2\u751F\u6210';
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
    // ===== \u539F\u6709\u6307\u4EE4 =====
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
    return '\u26A0\uFE0F \u672A\u77E5\u6307\u4EE4: ' + type + '\u3002\u53EF\u7528: /今日规划 /顺延待办 /打卡 /当日工时 /调休使用 /月度结算 /导出台账';
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
  // ===== Window: Work Hours (工时统计) =====
  renderWorkHours: function() {
    var today = Storage.today();
    var monthKey = Storage.getMonthKey(new Date());
    var md = Storage.getMonthData(monthKey);
    var ct = Storage.getCompTime();
    var summary = Storage.getMonthSummary(monthKey);
    var h = '<div class="window-header"><div class="window-title">\u23F0 \u5DE5\u65F6\u7EDF\u8BA1</div>';
    h += '<div style="display:flex;gap:6px;">';
    h += '<button class="btn-icon-sm" onclick="App.showClockInModal()" title="\u6253\u5361">\u{1F4CD}</button>';
    h += '<button class="btn-icon-sm" onclick="App.showDirectHoursModal()" title="\u5F53\u65E5\u5DE5\u65F6">\u{1F4D0}</button>';
    h += '<button class="btn-icon-sm" onclick="App.showCompUseModal()" title="\u8C03\u4F11\u4F7F\u7528">\u{1F4AC}</button>';
    h += '</div></div>';
    // 调休余额预警
    if (ct.currentBalance < 0) {
      h += '<div class="wh-alert">\u26A0\uFE0F \u8C03\u4F11\u4F59\u989D\u4E0D\u8DB3\uFF01\u5F53\u524D\u4F59\u989D: ' + ct.currentBalance.toFixed(2) + 'h</div>';
    } else if (ct.currentBalance < 8) {
      h += '<div class="wh-warning">\u26A0\uFE0F \u8C03\u4F11\u4F59\u989D\u504F\u4F4E: ' + ct.currentBalance.toFixed(2) + 'h</div>';
    }
    // 统计卡片
    h += '<div class="stat-grid">';
    h += '<div class="stat-card"><div class="stat-icon">\u{1F4AC}</div><div class="stat-value">' + ct.currentBalance.toFixed(1) + 'h</div><div class="stat-label">\u8C03\u4F11\u4F59\u989D</div></div>';
    h += '<div class="stat-card"><div class="stat-icon">\u{1F4C5}</div><div class="stat-value">' + md.workdays + '\u5929</div><div class="stat-label">\u5E94\u51FA\u52E4\u5929\u6570</div></div>';
    h += '<div class="stat-card"><div class="stat-icon">\u{1F4CB}</div><div class="stat-value">' + summary.clockDays + '\u5929</div><div class="stat-label">\u5DF2\u6253\u5361\u5929\u6570</div></div>';
    h += '<div class="stat-card"><div class="stat-icon">\u{1F550}</div><div class="stat-value">' + summary.totalEffective.toFixed(1) + 'h</div><div class="stat-label">\u6709\u6548\u5DE5\u65F6</div></div>';
    h += '</div>';
    // 月度汇总
    h += '<div class="card"><div class="card-title">\u{1F4CA} ' + monthKey + ' \u6708\u5EA6\u6C47\u603B</div>';
    h += '<div class="wh-summary-grid">';
    h += '<div class="wh-summary-item"><span class="wh-summary-label">\u6807\u51C6\u5DE5\u65F6</span><span class="wh-summary-value">' + summary.standardHours + 'h</span></div>';
    h += '<div class="wh-summary-item"><span class="wh-summary-label">\u6709\u6548\u5DE5\u65F6</span><span class="wh-summary-value">' + summary.totalEffective.toFixed(1) + 'h</span></div>';
    h += '<div class="wh-summary-item"><span class="wh-summary-label">\u52A0\u73ED\u65F6\u957F</span><span class="wh-summary-value" style="color:#2A8B3A;">+' + summary.totalOvertime.toFixed(1) + 'h</span></div>';
    h += '<div class="wh-summary-item"><span class="wh-summary-label">\u5DE5\u65F6\u7F3A\u53E3</span><span class="wh-summary-value" style="color:#C44A52;">-' + summary.totalDeficit.toFixed(1) + 'h</span></div>';
    h += '</div>';
    h += '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">';
    h += '<button class="btn btn-sm btn-outline" onclick="App.showWorkdaysModal()">\u{1F4C5} \u4FEE\u6539\u5E94\u51FA\u52E4</button>';
    h += '<button class="btn btn-sm btn-yellow" onclick="App.doMonthSettle()">\u{1F504} \u6708\u5EA6\u7ED3\u7B97</button>';
    h += '<button class="btn btn-sm btn-outline" onclick="App.doExportLedger()">\u{1F4E4} \u5BFC\u51FA\u53F0\u8D26</button>';
    h += '<button class="btn btn-sm btn-danger" onclick="App.confirmResetMonth()">\u{1F5D1}\uFE0F \u91CD\u7F6E\u5F53\u6708</button>';
    h += '</div></div>';
    // 打卡明细表
    h += '<div class="card"><div class="card-title">\u{1F4CB} \u6253\u5361\u660E\u7EC6</div>';
    if (md.records.length === 0) {
      h += '<div class="empty-state-sm"><div class="empty-text">\u672C\u6708\u8FD8\u6CA1\u6709\u6253\u5361\u8BB0\u5F55<br>\u70B9\u51FB\u53F3\u4E0A\u89D2\u6253\u5361\u6216\u586B\u5199\u5DE5\u65F6</div></div>';
    } else {
      h += '<div class="table-wrap"><table class="data-table wh-table"><thead><tr><th>\u65E5\u671F</th><th>\u7C7B\u578B</th><th>\u6253\u5361</th><th>\u5DE5\u65F6</th><th>\u72B6\u6001</th><th>\u64CD\u4F5C</th></tr></thead><tbody>';
      var self = this;
      md.records.slice().reverse().forEach(function(r) {
        var dt = r.dayType === 'workday' ? '<span class="tag tag-blue">\u5DE5\u4F5C\u65E5</span>' : r.dayType === 'weekend' ? '<span class="tag tag-lavender">\u5468\u672B</span>' : '<span class="tag tag-pink">\u8282\u5047\u65E5</span>';
        var clk = r.clockIn && r.clockOut ? r.clockIn + '-' + r.clockOut : '<span style="color:#B0B0B0;">\u76F4\u63A5\u586B\u5199</span>';
        var stl = r.settled ? '<span class="tag tag-mint">\u5DF2\u7ED3\u7B97</span>' : '<span class="tag tag-yellow">\u672A\u7ED3\u7B97</span>';
        h += '<tr><td>' + r.date + '</td><td>' + dt + '</td><td>' + clk + '</td>';
        h += '<td style="font-weight:700;">' + r.effectiveHours + 'h</td><td>' + stl + '</td>';
        h += '<td><button class="btn btn-sm btn-danger" onclick="App.deleteClockRecord(\'' + r.date + '\')">\u5220\u9664</button></td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div>';
    // 调休流水
    h += '<div class="card"><div class="card-title">\u{1F4AC} \u8C03\u4F11\u6D41\u6C34</div>';
    var monthTxns = ct.transactions.filter(function(t) { return t.date.startsWith(monthKey); });
    if (monthTxns.length === 0) {
      h += '<div class="empty-state-sm"><div class="empty-text">\u672C\u6708\u65E0\u8C03\u4F11\u6D41\u6C34</div></div>';
    } else {
      h += '<div class="table-wrap"><table class="data-table wh-table"><thead><tr><th>\u65E5\u671F</th><th>\u7C7B\u578B</th><th>\u65F6\u957F</th><th>\u4F59\u989D</th><th>\u539F\u56E0</th></tr></thead><tbody>';
      monthTxns.slice().reverse().forEach(function(t) {
        var tp = t.type === 'earn' ? '<span class="tag tag-mint">\u83B7\u5F97</span>' : '<span class="tag tag-pink">\u6D88\u8017</span>';
        var hrs = t.type === 'earn' ? '+' + t.hours + 'h' : '-' + t.hours + 'h';
        var color = t.type === 'earn' ? '#2A8B3A' : '#C44A52';
        h += '<tr><td>' + t.date + '</td><td>' + tp + '</td>';
        h += '<td style="font-weight:700;color:' + color + ';">' + hrs + '</td>';
        h += '<td>' + t.balanceAfter.toFixed(2) + 'h</td>';
        h += '<td>' + self._esc(t.reason) + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div>';
    // 基础参数说明
    h += '<div class="card"><div class="card-title">\u2139\uFE0F \u57FA\u7840\u53C2\u6570</div>';
    h += '<div style="font-size:15px;line-height:2;color:#888;">';
    h += '\u521D\u59CB\u8C03\u4F11\u5E93\u5B58: <b style="color:#5BA4E5;">' + ct.initialBalance.toFixed(2) + 'h</b><br>';
    h += '\u6807\u51C6\u4F5C\u606F: <b>08:30-17:30</b> \u5348\u4F111h<br>';
    h += '\u5DE5\u4F5C\u65E5\u57FA\u51C6: <b>8h/\u5929</b><br>';
    h += '\u5DE5\u4F5C\u65E5\u8D85\u51FA8h\u2192\u8BA1\u5165\u8C03\u4F11<br>';
    h += '\u5DE5\u4F5C\u65E5\u4E0D\u8DB38h\u2192\u6D88\u8017\u8C03\u4F11<br>';
    h += '\u5468\u672B/\u8282\u5047\u65E5\u51FA\u52E4\u2192\u5168\u90E8\u8BA1\u5165\u8C03\u4F11</div></div>';
    return h;
  },
  // 打卡弹窗
  showClockInModal: function() {
    var today = Storage.today();
    var h = '<div class="modal-title">\u{1F4CD} \u65F6\u95F4\u6BB5\u6253\u5361</div><div class="modal-body">';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">\u65E5\u671F</label><input type="date" class="input-field" id="clkDate" value="' + today + '"></div>';
    h += '<div style="display:flex;gap:10px;margin-bottom:12px;"><div style="flex:1;"><label class="modal-label">\u4E0A\u73ED\u6253\u5361</label><input type="time" class="input-field" id="clkIn" value="08:30"></div>';
    h += '<div style="flex:1;"><label class="modal-label">\u4E0B\u73ED\u6253\u5361</label><input type="time" class="input-field" id="clkOut" value="17:30"></div></div>';
    h += '<div id="clkPreview" style="padding:10px;background:#E8F4FD;border-radius:8px;margin-bottom:12px;font-size:16px;color:#5BA4E5;text-align:center;">\u6709\u6548\u5DE5\u65F6: 8.00h</div>';
    h += '<div><label class="modal-label">\u5907\u6CE8</label><input type="text" class="input-field" id="clkNote" placeholder="\u53EF\u9009..."></div>';
    h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">\u53D6\u6D88</button><button class="btn btn-primary" onclick="App.saveClockIn()">\u4FDD\u5B58</button></div>';
    this.showModal(h);
    var self = this;
    setTimeout(function() {
      var upd = function() {
        var d = document.getElementById('clkDate').value;
        var ci = document.getElementById('clkIn').value;
        var co = document.getElementById('clkOut').value;
        if (d && ci && co) {
          var hrs = Storage._calcEffectiveHours(ci, co, d);
          var pv = document.getElementById('clkPreview');
          if (pv) pv.textContent = '\u6709\u6548\u5DE5\u65F6: ' + hrs + 'h';
        }
      };
      ['clkDate','clkIn','clkOut'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('change', upd);
      });
    }, 100);
  },
  saveClockIn: function() {
    var date = document.getElementById('clkDate').value;
    var ci = document.getElementById('clkIn').value;
    var co = document.getElementById('clkOut').value;
    var note = document.getElementById('clkNote').value.trim();
    if (!date || !ci || !co) { this.showToast('\u26A0\uFE0F \u8BF7\u586B\u5199\u65E5\u671F\u548C\u6253\u5361\u65F6\u95F4'); return; }
    Storage.addClockRecord(date, ci, co, note);
    this.closeModal(); this.render(); this.showToast('\u2705 \u6253\u5361\u5DF2\u4FDD\u5B58');
  },
  // 直接填写工时弹窗
  showDirectHoursModal: function() {
    var today = Storage.today();
    var h = '<div class="modal-title">\u{1F4D0} \u586B\u5199\u5F53\u65E5\u5DE5\u65F6</div><div class="modal-body">';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">\u65E5\u671F</label><input type="date" class="input-field" id="dhDate" value="' + today + '"></div>';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">\u6709\u6548\u5DE5\u65F6 (\u5C0F\u65F6)</label><input type="number" class="input-field" id="dhHours" placeholder="8.0" step="0.25" value="8"></div>';
    h += '<div><label class="modal-label">\u5907\u6CE8</label><input type="text" class="input-field" id="dhNote" placeholder="\u53EF\u9009..."></div>';
    h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">\u53D6\u6D88</button><button class="btn btn-primary" onclick="App.saveDirectHours()">\u4FDD\u5B58</button></div>';
    this.showModal(h);
  },
  saveDirectHours: function() {
    var date = document.getElementById('dhDate').value;
    var hours = parseFloat(document.getElementById('dhHours').value);
    var note = document.getElementById('dhNote').value.trim();
    if (!date || isNaN(hours) || hours < 0) { this.showToast('\u26A0\uFE0F \u8BF7\u586B\u5199\u6709\u6548\u6570\u636E'); return; }
    Storage.setDirectHours(date, hours, note);
    this.closeModal(); this.render(); this.showToast('\u2705 \u5DE5\u65F6\u5DF2\u4FDD\u5B58');
  },
  // 调休使用弹窗
  showCompUseModal: function() {
    var today = Storage.today();
    var ct = Storage.getCompTime();
    var h = '<div class="modal-title">\u{1F4AC} \u767B\u8BB0\u8C03\u4F11\u4F7F\u7528</div><div class="modal-body">';
    h += '<div style="padding:10px;background:#E8F4FD;border-radius:8px;margin-bottom:12px;font-size:16px;color:#5BA4E5;text-align:center;">\u5F53\u524D\u8C03\u4F11\u4F59\u989D: ' + ct.currentBalance.toFixed(2) + 'h</div>';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">\u65E5\u671F</label><input type="date" class="input-field" id="cuDate" value="' + today + '"></div>';
    h += '<div style="margin-bottom:12px;"><label class="modal-label">\u6D88\u8017\u65F6\u957F (\u5C0F\u65F6)</label><input type="number" class="input-field" id="cuHours" placeholder="4.0" step="0.25"></div>';
    h += '<div><label class="modal-label">\u539F\u56E0</label><input type="text" class="input-field" id="cuReason" placeholder="\u5982: \u4E8B\u5047\u8C03\u4F11..."></div>';
    h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">\u53D6\u6D88</button><button class="btn btn-primary" onclick="App.saveCompUse()">\u4FDD\u5B58</button></div>';
    this.showModal(h);
  },
  saveCompUse: function() {
    var date = document.getElementById('cuDate').value;
    var hours = parseFloat(document.getElementById('cuHours').value);
    var reason = document.getElementById('cuReason').value.trim();
    if (!date || isNaN(hours) || hours <= 0) { this.showToast('\u26A0\uFE0F \u8BF7\u586B\u5199\u6709\u6548\u6570\u636E'); return; }
    var newBalance = Storage.useCompTime(hours, reason, date);
    this.closeModal(); this.render();
    if (newBalance < 0) {
      this.showToast('\u2705 \u5DF2\u767B\u8BB0 | \u26A0\uFE0F \u8C03\u4F11\u4F59\u989D\u4E0D\u8DB3! \u5F53\u524D: ' + newBalance.toFixed(2) + 'h');
    } else {
      this.showToast('\u2705 \u5DF2\u767B\u8BB0 | \u4F59\u989D: ' + newBalance.toFixed(2) + 'h');
    }
  },
  // 修改应出勤天数弹窗
  showWorkdaysModal: function() {
    var monthKey = Storage.getMonthKey(new Date());
    var md = Storage.getMonthData(monthKey);
    var h = '<div class="modal-title">\u{1F4C5} \u4FEE\u6539\u5E94\u51FA\u52E4\u5929\u6570</div><div class="modal-body">';
    h += '<div style="padding:10px;background:#FFF3B0;border-radius:8px;margin-bottom:12px;font-size:15px;color:#8A6D00;">\u5F53\u524D\u7CFB\u7EDF\u8BA1\u7B97: ' + md.workdays + '\u5929 (\u6807\u51C6\u5DE5\u65F6 ' + md.standardHours + 'h)\u3002\u5982\u8282\u5047\u65E5\u6570\u636E\u5F02\u5E38\uFF0C\u53EF\u624B\u52A8\u4FEE\u6539\u3002</div>';
    h += '<div><label class="modal-label">\u5E94\u51FA\u52E4\u5DE5\u4F5C\u65E5\u5929\u6570</label><input type="number" class="input-field" id="wdInput" value="' + md.workdays + '" min="0" max="31"></div>';
    h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">\u53D6\u6D88</button><button class="btn btn-primary" onclick="App.saveWorkdays()">\u4FDD\u5B58</button></div>';
    this.showModal(h);
  },
  saveWorkdays: function() {
    var days = parseInt(document.getElementById('wdInput').value);
    if (isNaN(days) || days < 0 || days > 31) { this.showToast('\u26A0\uFE0F \u8BF7\u8F93\u5165\u6709\u6548\u5929\u6570 (0-31)'); return; }
    var monthKey = Storage.getMonthKey(new Date());
    Storage.setManualWorkdays(monthKey, days);
    this.closeModal(); this.render(); this.showToast('\u2705 \u5DF2\u4FEE\u6539\u4E3A ' + days + ' \u5929');
  },
  // 月度结算
  doMonthSettle: function() {
    var monthKey = Storage.getMonthKey(new Date());
    var result = Storage.settleMonth(monthKey);
    this.render();
    var msg = '\u2705 \u6708\u5EA6\u7ED3\u7B97\u5B8C\u6210: \u7ED3\u7B97' + result.count + '\u6761\u8BB0\u5F55 | \u8C03\u4F11\u4F59\u989D: ' + result.balance.toFixed(2) + 'h';
    if (result.warning) msg = '\u26A0\uFE0F \u8C03\u4F91\u4F59\u989D\u4E0D\u8DB3! ' + msg;
    this.showToast(msg);
  },
  // 导出台账
  doExportLedger: function() {
    var monthKey = Storage.getMonthKey(new Date());
    var text = Storage.exportLedger(monthKey);
    var h = '<div class="modal-title">\u{1F4E4} \u5BFC\u51FA\u53F0\u8D26</div><div class="modal-body">';
    h += '<textarea class="input-field" id="exportText" style="min-height:300px;font-family:monospace;font-size:14px;white-space:pre;" readonly>' + this._esc(text) + '</textarea>';
    h += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">\u5173\u95ED</button><button class="btn btn-primary" onclick="App.copyExport()">\u590D\u5236</button></div>';
    this.showModal(h);
  },
  copyExport: function() {
    var ta = document.getElementById('exportText');
    if (ta) { ta.select(); document.execCommand('copy'); this.showToast('\u2705 \u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F'); }
  },
  // 重置当月
  confirmResetMonth: function() {
    var monthKey = Storage.getMonthKey(new Date());
    var h = '<div class="modal-title" style="color:#FF9AA2;">\u26A0\uFE0F \u786E\u8BA4\u91CD\u7F6E ' + monthKey + ' \u6253\u5361\u6570\u636E\uFF1F</div>';
    h += '<div class="modal-body" style="font-size:17px;line-height:1.6;">\u6B64\u64CD\u4F5C\u5C06\u6E05\u7A7A\u5F53\u6708\u6240\u6709\u6253\u5361\u8BB0\u5F55\uFF0C\u4E0D\u5F71\u54CD\u5386\u53F2\u6708\u4EFD\u548C\u8C03\u4F11\u6D41\u6C34\u3002</div>';
    h += '<div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">\u53D6\u6D88</button><button class="btn btn-danger" onclick="App.doResetMonth()">\u786E\u8BA4\u91CD\u7F6E</button></div>';
    this.showModal(h);
  },
  doResetMonth: function() {
    var monthKey = Storage.getMonthKey(new Date());
    Storage.resetMonth(monthKey);
    this.closeModal(); this.render(); this.showToast('\u2705 \u5DF2\u91CD\u7F6E\u5F53\u6708\u6253\u5361\u6570\u636E');
  },
  deleteClockRecord: function(date) { Storage.deleteClockRecord(date); this.render(); this.showToast('\u5DF2\u5220\u9664'); },
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

    // RSS feeds for each section - fetched via rss2json.com API (handles CORS)
    var feeds = {
      macro: [
        'http://www.chinadaily.com.cn/rss/business_rss.xml',
        'https://feeds.bbci.co.uk/news/business/rss.xml'
      ],
      ai: [
        'http://www.chinadaily.com.cn/rss/scitech_rss.xml',
        'https://techcrunch.com/feed/'
      ],
      expo: [
        'http://www.chinadaily.com.cn/rss/world_rss.xml',
        'https://feeds.bbci.co.uk/news/technology/rss.xml'
      ],
      livelihood: [
        'http://www.chinadaily.com.cn/rss/china_rss.xml',
        'https://feeds.bbci.co.uk/news/world/asia/china/rss.xml'
      ]
    };

    var rss2jsonBase = 'https://api.rss2json.com/v1/api.json?rss_url=';
    var allPromises = [];

    Object.keys(feeds).forEach(function(section) {
      feeds[section].forEach(function(feedUrl) {
        var apiUrl = rss2jsonBase + encodeURIComponent(feedUrl) + '&count=6';
        var p = fetch(apiUrl).then(function(res) { return res.json(); }).then(function(data) {
          var items = [];
          if (data && data.status === 'ok' && data.items) {
            var feedTitle = (data.feed && data.feed.title) ? data.feed.title : '';
            data.items.forEach(function(item) {
              var desc = item.description || item.content || '';
              desc = desc.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, '').replace(/\s+/g, ' ').trim();
              if (desc.length > 300) desc = desc.substring(0, 300) + '...';
              items.push({
                id: 'web_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8),
                title: (item.title || '').trim(),
                summary: desc,
                source: feedTitle,
                link: item.link || '',
                impact: '',
                thought: '',
                favorited: false,
                fromWeb: true,
                createdAt: Date.now()
              });
            });
          }
          return { section: section, items: items };
        }).catch(function(err) {
          console.log('[News] Feed error:', feedUrl, err);
          return { section: section, items: [] };
        });
        allPromises.push(p);
      });
    });

    Promise.all(allPromises).then(function(results) {
      var sections = { macro: [], ai: [], expo: [], livelihood: [] };
      var seen = {};
      results.forEach(function(r) {
        r.items.forEach(function(item) {
          var key = item.title;
          if (key && !seen[key] && sections[r.section].length < 6) {
            seen[key] = true;
            sections[r.section].push(item);
          }
        });
      });
      Storage.saveNewsBriefingFromWeb(today, sections);
      self.render();
      var total = sections.macro.length + sections.ai.length + sections.expo.length + sections.livelihood.length;
      if (total > 0) {
        if (!silent) self.showToast('\u2705 \u5DF2\u83B7\u53D6 ' + total + ' \u6761\u65F6\u653F\u8D44\u8BAF');
      } else {
        if (!silent) self.showToast('\u26A0\uFE0F \u8D44\u8BAF\u83B7\u53D6\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5');
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
  renderEnglish: function() {
    var self = this;
    var data = Storage.getEnglishData();
    var todayMin = Storage.getEnglishTodayMinutes();
    var streak = Storage.getEnglishStreak();
    var goal = data.dailyGoal;
    var pct = goal > 0 ? Math.min(100, Math.round(todayMin / goal * 100)) : 0;
    var today = Storage.today();
    var wordData = Storage.getDailyWords(today);
    var wordsFetched = Storage.isDailyWordsFetched(today);

    var h = '<div class="window-header"><div class="window-title">\u{1F524} 英语学习</div>';
    h += '<button class="btn btn-primary btn-sm" onclick="App.showEnglishModal()">+ 打卡</button></div>';
    h += '<div class="stat-grid">';
    h += '<div class="stat-card"><div class="stat-icon">\u{1F4CA}</div><div class="stat-value">' + todayMin + '/' + goal + '</div><div class="stat-label">今日分钟</div></div>';
    h += '<div class="stat-card"><div class="stat-icon">\u{1F525}</div><div class="stat-value">' + streak + '</div><div class="stat-label">连续天数</div></div>';
    h += '<div class="stat-card"><div class="stat-icon">\u{1F4DD}</div><div class="stat-value">' + data.records.length + '</div><div class="stat-label">总记录</div></div>';
    h += '</div>';
    if (todayMin > 0) {
      h += '<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;font-size:15px;color:#888;margin-bottom:4px;"><span>今日目标</span><span>' + pct + '%</span></div>';
      h += '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%;"></div></div></div>';
    }

    // ===== 每日单词板块 =====
    h += '<div class="card"><div class="card-title">\u{1F4D8} 每日20词';
    h += '<button class="btn btn-primary btn-sm" style="float:right;font-size:12px;padding:2px 8px;" onclick="App.fetchDailyWords(false)">\u{1F504} 换一批</button>';
    h += '</div>';
    if (wordData && wordData.words && wordData.words.length > 0) {
      h += '<div class="word-list">';
      wordData.words.forEach(function(w, i) {
        var posShort = w.pos ? w.pos.replace('noun','n.').replace('verb','v.').replace('adjective','adj.').replace('adverb','adv.').replace('pronoun','pron.').replace('preposition','prep.').replace('conjunction','conj.') : '';
        h += '<div class="word-card" onclick="App.toggleWordDetail(this)">';
        h += '<div class="word-header">';
        h += '<span class="word-num">' + (i + 1) + '</span>';
        h += '<span class="word-spell">' + self._esc(w.word) + '</span>';
        if (posShort) h += '<span class="word-pos">' + self._esc(posShort) + '</span>';
        if (w.meaning) h += '<span class="word-meaning">' + self._esc(w.meaning) + '</span>';
        h += '<span class="word-expand">\u25BC</span>';
        h += '</div>';
        h += '<div class="word-detail"><div class="word-detail-inner">';
        h += '<div class="word-section"><div class="word-section-title">\u2728 高频搭配</div>';
        if (w.collocations && w.collocations.length > 0) {
          h += '<div class="word-collocations">';
          w.collocations.forEach(function(c) { h += '<span class="word-collocation">' + self._esc(c) + '</span>'; });
          h += '</div>';
        } else {
          h += '<div class="word-empty">暂无搭配数据</div>';
        }
        h += '</div>';
        h += '<div class="word-section"><div class="word-section-title">\u{1F4DD} 实用例句</div>';
        if (w.example) {
          h += '<div class="word-example">' + self._esc(w.example) + '</div>';
          if (w.exampleZh) h += '<div class="word-example-zh">' + self._esc(w.exampleZh) + '</div>';
        } else {
          h += '<div class="word-empty">暂无例句</div>';
        }
        h += '</div>';
        h += '<div class="word-section"><div class="word-section-title">\u26A0\uFE0F 易混提示</div>';
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
    } else if (!wordsFetched) {
      h += '<div class="loading-state"><div class="loading-icon">\u23F3</div><div style="margin-top:8px;color:#999;">\u6B63\u5728\u4ECE\u7F51\u7EDC\u83B7\u53D6\u5355\u8BCD\u2026</div></div>';
    } else {
      h += '<div class="empty-state-sm"><div class="empty-text">\u6682\u65E0\u5355\u8BCD\u6570\u636E</div></div>';
    }
    h += '</div>';

    // 每天首次打开自动获取
    if (!wordsFetched) {
      this.fetchDailyWords(true);
    }

    h += '<div class="card"><div class="card-title">\u{1F4CB} 学习记录</div>';
    var recent = data.records.slice().reverse().slice(0, 20);
    if (recent.length === 0) {
      h += '<div class="empty-state-sm"><div class="empty-text">暂无学习记录<br>点击 + 打卡 开始</div></div>';
    } else {
      h += '<div class="table-wrap"><table class="data-table"><thead><tr><th>日期</th><th>类型</th><th>时长</th><th>内容</th><th></th></tr></thead><tbody>';
      recent.forEach(function(r) {
        h += '<tr><td>' + r.date + '</td><td><span class="tag tag-blue">' + r.type + '</span></td>';
        h += '<td style="font-weight:700;">' + r.duration + 'min</td>';
        h += '<td>' + App._esc(r.content || r.notes || '') + '</td>';
        h += '<td><button class="btn-icon-sm" onclick="App.deleteEnglishRecord(\'' + r.id + '\')">\u00D7</button></td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div>';
    return h;
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
    if (!silent) this.showToast('🔄 正在获取…');
    // 先尝试中文维基百科
    var zhUrl = 'https://zh.wikipedia.org/api/rest_v1/feed/onthisday/events/' + mm + '/' + dd;
    fetch(zhUrl).then(function(res) { return res.json(); }).then(function(data) {
      if (data && data.events && data.events.length > 0) {
        self._processHistoryEvents(data.events, today, silent);
      } else {
        self._fetchHistoryFromEn(today, silent);
      }
    }).catch(function() {
      self._fetchHistoryFromEn(today, silent);
    });
  },
  _fetchHistoryFromEn: function(today, silent) {
    var self = this;
    var mm = today.substring(5, 7);
    var dd = today.substring(8, 10);
    var enUrl = 'https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/' + mm + '/' + dd;
    fetch(enUrl).then(function(res) { return res.json(); }).then(function(data) {
      if (data && data.events && data.events.length > 0) {
        self._processHistoryEvents(data.events, today, silent);
      } else {
        self._fallbackHistoryLocal(today, silent);
      }
    }).catch(function() {
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
      var text = ev.text || '';
      if (text.length < 15) return;
      var cat = 'history';
      for (var key in catKeywords) {
        for (var i = 0; i < catKeywords[key].length; i++) {
          if (text.toLowerCase().indexOf(catKeywords[key][i].toLowerCase()) !== -1) { cat = key; break; }
        }
        if (cat !== 'history') break;
      }
      entries.push({
        title: text.length > 80 ? text.substring(0, 80) + '…' : text,
        year: ev.year ? String(ev.year) : '',
        category: cat,
        story: text,
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
    if (!silent) this.showToast('🔄 正在获取…');
    // 优先：中文维基百科随机条目
    var wikiUrl = 'https://zh.wikipedia.org/api/rest_v1/page/random/summary';
    fetch(wikiUrl).then(function(res) { return res.json(); }).then(function(data) {
      if (data && data.title && data.extract && data.extract.length > 30) {
        var entry = self._formatWikiEntry(data);
        Storage.saveDailyWhyWebEntry(today, entry);
        self.render();
        if (!silent) self.showToast('✅ 已获取新内容');
      } else {
        self._fetchDailyWhyFromHitokoto(today, silent);
      }
    }).catch(function() {
      self._fetchDailyWhyFromHitokoto(today, silent);
    });
  },
  _formatWikiEntry: function(data) {
    var title = data.title || '未知';
    var extract = data.extract || '';
    var description = data.description || '';
    var category = '百科';
    var catMap = {
      '科学': ['物理','化学','生物','天文','数学','医学','基因','相对论','量子'],
      '历史': ['历史','战争','朝代','帝国','革命','古'],
      '自然': ['自然','地理','动物','植物','生态','气候','海洋'],
      '文化': ['文化','艺术','文学','音乐','电影','宗教','哲学','节日'],
      '生活': ['食物','烹饪','交通','建筑','体育','游戏'],
      '动物': ['动物','哺乳','鸟类','鱼类','昆虫','宠物'],
      '人体': ['人体','大脑','基因','细胞','免疫','神经']
    };
    var searchText = (title + ' ' + description + ' ' + extract).toLowerCase();
    for (var cat in catMap) {
      for (var i = 0; i < catMap[cat].length; i++) {
        if (searchText.indexOf(catMap[cat][i]) !== -1) { category = cat; break; }
      }
      if (category !== '百科') break;
    }
    var source = '维基百科';
    if (data.content_urls && data.content_urls.desktop) source = data.content_urls.desktop.page;
    return {
      id: 'wiki_' + Date.now(),
      question: '你知道吗？关于「' + title + '」',
      answer: extract,
      category: category,
      source: source
    };
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
