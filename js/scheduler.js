/* 定时调度引擎 - Scheduler */
/* 每日00:05、23:40，每周日22点、23点，每月月末23点 */

var Scheduler = {
  tasks: [],

  init: function() {
    this._setupTasks();
    console.log('[Scheduler] init');
    this.checkAndRun();
    var self = this;
    this.checkInterval = setInterval(function() { self.checkAndRun(); }, 30000);
  },

  _setupTasks: function() {
    this.tasks = [
      {
        id: 'daily_init',
        name: '每日初始化(自动顺延)',
        schedule: { type: 'daily', time: '00:05' },
        lastRun: null,
        action: function() {
          try {
            var result = Storage.rolloverTodos();
            Storage.addSchedulerLog('每日初始化', 'success', result.message);
            return '自动顺延完成: ' + result.message;
          } catch (error) {
            Storage.addSchedulerLog('每日初始化', 'error', error.message);
            throw error;
          }
        }
      },
      {
        id: 'daily_summary',
        name: '每日总结',
        schedule: { type: 'daily', time: '23:40' },
        lastRun: null,
        action: function() {
          var today = Storage.today();
          var plan = Storage.getPlan(today);
          var tasks = plan.todayTodos;
          var done = tasks.filter(function(t) { return t.done; }).length;
          var total = tasks.length;
          var rate = total > 0 ? Math.round(done / total * 100) : 0;
          var expenses = (Storage.get(Storage.KEYS.EXPENSES) || []).filter(function(e) { return e.date === today; });
          var totalExpense = expenses.reduce(function(sum, e) { return sum + e.amount; }, 0);
          var rolled = tasks.filter(function(t) { return t.source === 'auto_rollover'; }).length;
          var summary = today + ' 每日总结 - 完成任务: ' + done + '/' + total + ' (' + rate + '%), 顺延任务: ' + rolled + ', 今日支出: ' + totalExpense.toFixed(2);
          Storage.addNote({ title: '每日总结 ' + today, content: summary, date: today });
          Storage.addSchedulerLog('每日总结', 'success', '完成率' + rate + '%');
          return summary;
        }
      },
      {
        id: 'weekly_summary',
        name: '周总结',
        schedule: { type: 'weekly', day: 0, time: '22:00' },
        lastRun: null,
        action: function() {
          var today = new Date();
          var weekKey = Storage.getWeekKey(today);
          var tasks = Storage.get(Storage.KEYS.TASKS) || [];
          var expenses = Storage.get(Storage.KEYS.EXPENSES) || [];
          var notes = Storage.get(Storage.KEYS.NOTES) || [];
          var startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          var endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          var startStr = Storage.formatDate(startOfWeek);
          var endStr = Storage.formatDate(endOfWeek);
          var weekTasks = tasks.filter(function(t) { return t.date >= startStr && t.date <= endStr; });
          var weekExpenses = expenses.filter(function(e) { return e.date >= startStr && e.date <= endStr; });
          var weekNotes = notes.filter(function(n) { return n.date >= startStr && n.date <= endStr; });
          var totalExpense = weekExpenses.reduce(function(sum, e) { return sum + e.amount; }, 0);
          var catStats = {};
          weekExpenses.forEach(function(e) { catStats[e.category] = (catStats[e.category] || 0) + e.amount; });
          var catText = Object.keys(catStats).map(function(c) { return c + ': ' + catStats[c].toFixed(2); }).join(', ');
          var summary = '周总结 ' + startStr + ' ~ ' + endStr + ' - 任务数: ' + weekTasks.length + ', 总支出: ' + totalExpense.toFixed(2) + ', 备忘录: ' + weekNotes.length + '条. 支出明细: ' + (catText || '无');
          Storage.addNote({ title: '周总结 ' + weekKey, content: summary, date: Storage.today() });
          Storage.addSchedulerLog('周总结', 'success', '任务' + weekTasks.length);
          return summary;
        }
      },
      {
        id: 'weekly_archive',
        name: '周归档',
        schedule: { type: 'weekly', day: 0, time: '23:00' },
        lastRun: null,
        action: function() {
          var today = new Date();
          var weekKey = Storage.getWeekKey(today);
          var result = Storage.archiveWeek(weekKey);
          Storage.addSchedulerLog('周归档', 'success', '归档' + result.tasks + '任务');
          return '周归档完成: ' + result.tasks + '条任务, ' + result.expenses + '条支出已归档到 ' + weekKey;
        }
      },
      {
        id: 'monthly_archive',
        name: '月末归档',
        schedule: { type: 'monthly_end', time: '23:00' },
        lastRun: null,
        action: function() {
          var today = new Date();
          var year = today.getFullYear();
          var month = today.getMonth() + 1;
          var monthKey = year + '-' + String(month).padStart(2, '0');
          var result = Storage.archiveMonth(monthKey);
          var summary = '月度归档 ' + monthKey + ' - 任务: ' + result.tasks + '条, 支出: ' + result.expenses + '条, 备忘: ' + result.notes + '条. 数据已安全归档。';
          Storage.addNote({ title: '月度归档 ' + monthKey, content: summary, date: Storage.today() });
          Storage.addSchedulerLog('月末归档', 'success', '归档' + result.tasks + '任务');
          return summary;
        }
      },
      {
        id: 'daily_workhour_settle',
        name: '每日工时结算',
        schedule: { type: 'daily', time: '23:55' },
        lastRun: null,
        action: function() {
          var today = Storage.today();
          var result = Storage.settleDay(today);
          var msg = '';
          if (result.settled) {
            msg = '工时结算: ' + result.message + ' | 调休余额: ' + result.newBalance.toFixed(2) + 'h';
            if (result.warning) {
              msg += ' [调休余额不足!]';
              if (typeof App !== 'undefined' && App.showAlert) {
                App.showAlert('调休余额不足! 当前余额: ' + result.newBalance.toFixed(2) + 'h');
              }
            }
          } else {
            msg = '今日无待结算打卡记录';
          }
          Storage.addSchedulerLog('每日工时结算', 'success', msg);
          return msg;
        }
      },
      {
        id: 'daily_news_fetch',
        name: '每日资讯拉取',
        schedule: { type: 'daily', time: '08:00' },
        lastRun: null,
        action: function() {
          try {
            var today = Storage.today();
            Storage.createNewsBriefing(today);
            Storage.addSchedulerLog('每日资讯拉取', 'success', '已生成 ' + today + ' 简报模板');
            return '已自动生成今日资讯简报模板';
          } catch (error) {
            Storage.addSchedulerLog('每日资讯拉取', 'error', error.message);
            throw error;
          }
        }
      }
    ];
  },

  checkInterval: null,
  lastCheckMinute: '',

  checkAndRun: function() {
    var now = new Date();
    var cm = now.getFullYear() + '-' + now.getMonth() + '-' + now.getDate() + '-' + now.getDay() + '-' + now.getHours() + ':' + now.getMinutes();
    if (this.lastCheckMinute === cm) return;
    var hh = String(now.getHours()).padStart(2, '0');
    var mm = String(now.getMinutes()).padStart(2, '0');
    var ct = hh + ':' + mm;
    var cd = now.getDay();
    var cdate = now.getDate();
    var lastDay = Storage.getLastDayOfMonth(now.getFullYear(), now.getMonth() + 1);
    var self = this;
    this.tasks.forEach(function(task) {
      if (task.lastRun === cm) return;
      var run = false;
      if (task.schedule.type === 'daily' && ct === task.schedule.time) run = true;
      if (task.schedule.type === 'weekly' && cd === task.schedule.day && ct === task.schedule.time) run = true;
      if (task.schedule.type === 'monthly_end' && cdate === lastDay && ct === task.schedule.time) run = true;
      if (run) self.runTask(task, cm);
    });
    this.lastCheckMinute = cm;
  },

  runTask: function(task, timeKey) {
    console.log('[Scheduler] run:', task.name);
    try {
      var result = task.action();
      task.lastRun = timeKey;
      console.log('[Scheduler] ok:', task.name);
      if (typeof App !== 'undefined' && App.showToast) App.showToast('\u2705 ' + task.name + '\u5DF2\u5B8C\u6210');
      return result;
    } catch (error) {
      console.error('[Scheduler] fail:', task.name, error);
      Storage.addSchedulerLog(task.name, 'error', error.message);
      task.lastRun = timeKey;
      if (typeof App !== 'undefined' && App.showAlert) {
        var msg = '\u3010\u81EA\u52A8\u987A\u5EF6\u4EFB\u52A1\u6267\u884C\u5931\u8D25\u3011' + error.message + '\u3002\u53EF\u6267\u884C\u6307\u4EE4 /顺延待办 \u624B\u52A8\u89E6\u53D1\u3002';
        App.showAlert(msg);
      }
      return null;
    }
  },

  trigger: function(taskId) {
    var task = this.tasks.find(function(t) { return t.id === taskId; });
    if (task) return this.runTask(task, 'manual-' + Date.now());
    return null;
  },

  getNextRun: function() {
    var now = new Date();
    var upcoming = [];
    var self = this;
    this.tasks.forEach(function(task) {
      var next = self._calcNextRun(task, now);
      if (next) upcoming.push({ name: task.name, time: next, id: task.id });
    });
    upcoming.sort(function(a, b) { return a.time - b.time; });
    return upcoming;
  },

  _calcNextRun: function(task, from) {
    var now = new Date(from);
    var parts = task.schedule.time.split(':');
    var th = parseInt(parts[0]);
    var tm = parseInt(parts[1]);
    if (task.schedule.type === 'daily') {
      var n = new Date(now);
      n.setHours(th, tm, 0, 0);
      if (n <= now) n.setDate(n.getDate() + 1);
      return n;
    }
    if (task.schedule.type === 'weekly') {
      var nw = new Date(now);
      var td = task.schedule.day;
      var du = (td - now.getDay() + 7) % 7;
      nw.setDate(now.getDate() + du);
      nw.setHours(th, tm, 0, 0);
      if (nw <= now) nw.setDate(nw.getDate() + 7);
      return nw;
    }
    if (task.schedule.type === 'monthly_end') {
      var nm = new Date(now);
      var ld = Storage.getLastDayOfMonth(nm.getFullYear(), nm.getMonth() + 1);
      nm.setDate(ld);
      nm.setHours(th, tm, 0, 0);
      if (nm <= now) {
        nm.setMonth(nm.getMonth() + 1);
        var nld = Storage.getLastDayOfMonth(nm.getFullYear(), nm.getMonth() + 1);
        nm.setDate(nld);
      }
      return nm;
    }
    return null;
  }
};
