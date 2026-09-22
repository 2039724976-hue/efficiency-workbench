/* ============ 工时打卡 APP · 纯前端数据层 ============ */
/* 移植自 Node 版 server.js：localStorage 存储，打开时自动补结算 */
'use strict';
var WHDB = (function () {
  var Core = window.WorkHourCore;
  var LS_KEY = 'wh_db_v1';

  // ---------- 存储 ----------
  var db = null;
  function blank() {
    return {
      settings: { initialBalanceHours: 96, workStart: '08:30', workEnd: '17:30', lunchStart: '12:00', lunchEnd: '13:00', lunchHours: 1, baseHours: 8, halfLeaveHours: 4, fullLeaveHours: 8, autoSettleTime: '23:55', autoSettleEnabled: true, gapOnMissingWorkday: true },
      holidays: { years: {} },
      punch: { records: [] },
      flow: { transactions: [] },
      summary: { months: {} },
      trip: { records: [] },
      leave: { records: [] }
    };
  }
  function persist() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(db)); }
    catch (e) { console.error('[WHDB] 保存失败', e); }
  }
  function init() {
    if (db) return;
    var raw = null;
    try { raw = localStorage.getItem(LS_KEY); } catch (e) {}
    if (raw) {
      try { db = JSON.parse(raw); } catch (e) { db = null; }
    }
    if (!db) {
      db = blank();
      if (window.WH_SEED) {
        // 首次使用：导入种子快照
        ['settings', 'holidays', 'punch', 'flow', 'summary', 'trip', 'leave'].forEach(function (k) {
          if (window.WH_SEED[k]) db[k] = window.WH_SEED[k];
        });
      }
      persist();
    }
    // 打开即补结算：结算所有已过未结算日期（替代 Node 版 23:55 定时任务）
    try { settleBackfill(); } catch (e) { console.error('[WHDB] 补结算异常', e); }
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function nowStr() {
    var d = new Date();
    return Core.fmt(d) + ' ' + Core.pad2(d.getHours()) + ':' + Core.pad2(d.getMinutes()) + ':' + Core.pad2(d.getSeconds());
  }

  // ---------- 参数与日历 ----------
  function cfg() {
    var s = db.settings || {};
    return {
      lunchStart: s.lunchStart || '12:00',
      lunchEnd: s.lunchEnd || '13:00',
      lunchHours: s.lunchHours || 1,
      baseHours: s.baseHours || 8,
      initial: s.initialBalanceHours || 96
    };
  }
  function calendarFor(year) {
    var h = db.holidays || { years: {} };
    var y = h.years && h.years[String(year)];
    return y ? y : { holidays: [], makeupWorkdays: [] };
  }
  function calendarKnown(year) {
    var h = db.holidays || { years: {} };
    return !!(h.years && h.years[String(year)]);
  }

  // ---------- 流水 ----------
  function flowTx(date, type, hours, refId, reason) {
    var tx = { id: uid(), date: date, type: type, hours: Core.r2(hours), refId: refId || '', reason: reason || '', createdAt: nowStr() };
    db.flow.transactions.push(tx);
    persist();
    return tx;
  }
  function removeTxByRef(refId) {
    var before = db.flow.transactions.length;
    db.flow.transactions = db.flow.transactions.filter(function (t) { return t.refId !== refId; });
    persist();
    return before - db.flow.transactions.length;
  }
  function balance() {
    var c = cfg();
    return Core.r2(db.flow.transactions.reduce(function (s, t) { return s + Number(t.hours || 0); }, c.initial));
  }

  // ---------- 查询 ----------
  function punchByDate(date) {
    for (var i = 0; i < db.punch.records.length; i++) if (db.punch.records[i].date === date) return db.punch.records[i];
    return null;
  }
  function leaveOn(date) { return db.leave.records.filter(function (r) { return r.date === date; }); }
  function leaveHoursOn(date) {
    return Core.r2(leaveOn(date).reduce(function (s, r) { return s + Number(r.hours || 0); }, 0));
  }
  function tripOn(date) {
    for (var i = 0; i < db.trip.records.length; i++) {
      var t = db.trip.records[i];
      if (Core.dateCmp(date, t.start) >= 0 && Core.dateCmp(date, t.end) <= 0) return t;
    }
    return null;
  }
  function tripDaysInMonth(ym) {
    var set = {};
    db.trip.records.forEach(function (t) {
      var d = Core.dateCmp(t.start, ym + '-01') < 0 ? ym + '-01' : t.start;
      var end = Core.dateCmp(t.end, Core.endOfMonth(ym)) > 0 ? Core.endOfMonth(ym) : t.end;
      while (Core.dateCmp(d, end) <= 0) { set[d] = 1; d = Core.addDays(d, 1); }
    });
    return Object.keys(set).length;
  }

  // ---------- 结算 ----------
  function settleDay(date) {
    var c = cfg();
    var cal = calendarFor(Number(date.substring(0, 4)));
    var rec = punchByDate(date);
    var leaveH = leaveHoursOn(date);
    var trip = tripOn(date);
    var res = Core.settleDayResult(date, rec, leaveH > 0 || (leaveOn(date).length > 0 && !rec), !!trip, cal, c.baseHours);
    var refId = 'day:' + date;
    for (var i = 0; i < db.flow.transactions.length; i++) {
      if (db.flow.transactions[i].refId === refId) return { skipped: true, res: res };
    }
    var kind = res.kind, hours = res.hours;
    if (rec && leaveH > 0 && res.kind === 'gap') { kind = 'weekend'; hours = Core.r2(Number(rec.effHours)); }
    if (kind === 'over') flowTx(date, 'over', hours, refId, res.reason + (rec && rec.crossDay ? '(跨零点)' : ''));
    else if (kind === 'gap') flowTx(date, 'gap', hours, refId, res.reason);
    else if (kind === 'weekend') flowTx(date, 'weekend', hours, refId, res.reason);
    else if (kind === 'missing') return { missing: true, res: res };
    if (rec) { rec.settled = true; persist(); }
    return { done: true, res: res };
  }
  function settleMissing(ym) {
    var c = cfg();
    var cal = calendarFor(Number(ym.substring(0, 4)));
    var days = Core.daysInMonth(ym);
    var missing = [];
    for (var d = 1; d <= days; d++) {
      var date = ym + '-' + Core.pad2(d);
      if (date >= Core.todayStr()) break;
      if (!Core.dayType(date, cal).workday) continue;
      if (punchByDate(date)) continue;
      if (leaveOn(date).length > 0) continue;
      if (tripOn(date)) continue;
      var refId = 'day:' + date;
      var has = db.flow.transactions.some(function (t) { return t.refId === refId; });
      if (has) continue;
      flowTx(date, 'gap', -c.baseHours, refId, '未出勤缺口(月结)');
      missing.push(date);
    }
    return missing;
  }
  function settleBackfill() {
    var done = [];
    db.punch.records.forEach(function (r) {
      if (r.settled) return;
      if (r.date >= Core.todayStr()) return;
      var out = settleDay(r.date);
      if (out.done) done.push(r.date);
    });
    return done;
  }
  function settleMonth(ym) {
    var out = settleBackfill();
    var days = Core.daysInMonth(ym);
    for (var d = 1; d <= days; d++) {
      var date = ym + '-' + Core.pad2(d);
      if (date >= Core.todayStr()) break;
      settleDay(date);
    }
    var missing = settleMissing(ym);
    db.summary.months[ym] = db.summary.months[ym] || {};
    db.summary.months[ym].settled = true;
    db.summary.months[ym].settledAt = nowStr();
    persist();
    return { backfilled: out, missing: missing };
  }

  // ---------- 汇总 ----------
  function monthState(ym) {
    var c = cfg();
    var year = Number(ym.substring(0, 4));
    var cal = calendarFor(year);
    var known = calendarKnown(year);
    var mCfg = db.summary.months[ym] || {};
    var workdays = (mCfg.workdaysOverride != null) ? mCfg.workdaysOverride : Core.countWorkdays(ym, cal);
    var stdHours = Core.r2(workdays * c.baseHours);

    var punches = db.punch.records.filter(function (r) { return r.date.indexOf(ym) === 0; })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var leaves = db.leave.records.filter(function (r) { return r.date.indexOf(ym) === 0; })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var trips = db.trip.records.filter(function (t) { return !(t.end < ym + '-01' || t.start > Core.endOfMonth(ym)); })
      .sort(function (a, b) { return a.start < b.start ? 1 : -1; });
    var flows = db.flow.transactions.filter(function (t) { return t.date.indexOf(ym) === 0; })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; });

    var effTotal = 0, over = 0, gap = 0, weekend = 0;
    punches.forEach(function (r) { effTotal = Core.r2(effTotal + Number(r.effHours || 0)); });
    flows.forEach(function (t) {
      if (t.type === 'over') over = Core.r2(over + t.hours);
      if (t.type === 'gap') gap = Core.r2(gap + t.hours);
      if (t.type === 'weekend') weekend = Core.r2(weekend + t.hours);
    });
    var leaveTotalHours = Core.r2(leaves.reduce(function (s, r) { return s + Number(r.hours || 0); }, 0));
    var bal = balance();
    return {
      ym: ym, calendarKnown: known, workdays: workdays, stdHours: stdHours, workdaysOverride: mCfg.workdaysOverride != null,
      calendar: cal, cfg: c,
      punches: punches, leaves: leaves, trips: trips, flows: flows,
      stats: {
        effTotal: effTotal, over: over, gap: gap, weekend: weekend,
        leaveDays: leaves.length, leaveTotalHours: leaveTotalHours,
        tripDays: tripDaysInMonth(ym), balance: bal,
        monthFlow: 0, settled: !!(mCfg.settled)
      },
      warnings: buildWarnings(bal, known)
    };
  }
  function buildWarnings(bal, calKnown) {
    var w = [];
    if (bal < 0) w.push({ level: 'error', text: '调休库存不足！当前余额 ' + bal.toFixed(2) + 'h，请尽快补足或调整休假安排' });
    if (!calKnown) w.push({ level: 'warn', text: '节假日数据表未覆盖当前年份，仅按周末判断工作日' });
    return w;
  }

  // ---------- API（与 Node 版同构） ----------
  function ok(data, msg) { return { code: 0, msg: msg || 'ok', data: data }; }
  function fail(msg, extra) { return extra ? Object.assign({ code: 1, msg: msg }, extra) : { code: 1, msg: msg }; }

  var api = {
    'GET /api/state': function (q) { return ok(monthState(q.ym || Core.todayStr().substring(0, 7))); },
    'GET /api/balance': function () { return ok({ balance: balance() }); },

    'POST /api/punch': function (b) {
      var date = String(b.date || '').trim();
      var inTime = String(b.inTime || '').trim();
      var outTime = String(b.outTime || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail('上班日期格式应为 YYYY-MM-DD');
      if (!/^\d{1,2}:\d{2}$/.test(inTime) || !/^\d{1,2}:\d{2}$/.test(outTime)) return fail('时间格式应为 HH:MM，例如 09:05');
      var c = cfg();
      var cal = calendarFor(Number(date.substring(0, 4)));
      var crossFlag = b.cross === true;
      var calc = Core.calcPunch(date, inTime, outTime, cal, c);
      if (!crossFlag && calc.outMin <= calc.inMin) {
        return fail('下班时间不能早于或等于上班时间（同日期打卡）。若下班在次日凌晨，请勾选「跨零点」后重试');
      }
      var old = punchByDate(date);
      if (old) removeTxByRef('day:' + date);
      var rec = {
        id: old ? old.id : uid(), date: date, mode: 'time',
        inTime: Core.pad2(Number(inTime.split(':')[0])) + ':' + Core.pad2(Number(inTime.split(':')[1])),
        outTime: Core.pad2(Number(outTime.split(':')[0])) + ':' + Core.pad2(Number(outTime.split(':')[1])),
        crossDay: calc.crossDay, lunchDeduct: calc.lunchDeductMin,
        effHours: calc.effHours, note: String(b.note || '').trim(),
        tripId: b.tripId || '', createdAt: nowStr(), settled: false
      };
      db.punch.records = db.punch.records.filter(function (r) { return r.date !== date; });
      db.punch.records.push(rec);
      persist();
      if (date < Core.todayStr()) settleDay(date);
      return ok({ rec: rec, effHours: calc.effHours, crossDay: calc.crossDay, balance: balance() },
        calc.crossDay ? '打卡成功（跨零点，工时计入 ' + date + '）' : '打卡成功');
    },
    'POST /api/direct': function (b) {
      var date = String(b.date || '').trim();
      var hours = Number(b.hours);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail('日期格式应为 YYYY-MM-DD');
      if (!(hours >= 0 && hours <= 24)) return fail('有效工时应在 0~24h 之间');
      var old = punchByDate(date);
      if (old) removeTxByRef('day:' + date);
      var rec = {
        id: old ? old.id : uid(), date: date, mode: 'direct',
        effHours: Core.r2(hours), note: String(b.note || '').trim(),
        tripId: b.tripId || '', createdAt: nowStr(), settled: false
      };
      db.punch.records = db.punch.records.filter(function (r) { return r.date !== date; });
      db.punch.records.push(rec);
      persist();
      if (date < Core.todayStr()) settleDay(date);
      return ok({ rec: rec, balance: balance() }, '已录入当日工时 ' + Core.r2(hours) + 'h');
    },
    'POST /api/punch/delete': function (b) {
      var rec = null;
      db.punch.records.forEach(function (r) { if (r.id === b.id) rec = r; });
      if (!rec) return fail('记录不存在');
      removeTxByRef('day:' + rec.date);
      db.punch.records = db.punch.records.filter(function (r) { return r.id !== b.id; });
      persist();
      return ok({ balance: balance() }, '已删除 ' + rec.date + ' 的打卡记录及相关流水');
    },
    'POST /api/comp/use': function (b) {
      var hours = Number(b.hours);
      if (!(hours > 0)) return fail('请填写大于 0 的调休小时数');
      var bal = balance();
      if (bal < hours && !b.force) return fail('调休库存不足（当前 ' + bal.toFixed(2) + 'h），如需强制登记请确认 force');
      var tx = flowTx(b.date || Core.todayStr(), 'manualUse', -Core.r2(hours), 'manual:' + uid(), b.reason || '手动调休消耗');
      return ok({ tx: tx, balance: balance() }, '已登记调休消耗 ' + Core.r2(hours) + 'h，余额 ' + balance().toFixed(2) + 'h');
    },
    'POST /api/comp/delete': function (b) {
      var tx = null;
      db.flow.transactions.forEach(function (t) { if (t.id === b.id) tx = t; });
      if (!tx) return fail('流水不存在');
      if (tx.type !== 'manualUse') return fail('仅支持删除「手动调休消耗」流水，其他类型请删除对应打卡/休假记录');
      db.flow.transactions = db.flow.transactions.filter(function (t) { return t.id !== b.id; });
      persist();
      return ok({ balance: balance() }, '已删除该手动调休消耗记录，余额已恢复 ' + balance().toFixed(2) + 'h');
    },
    'POST /api/leave': function (b) {
      var date = String(b.date || '').trim();
      var type = b.type;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail('调休日期格式应为 YYYY-MM-DD');
      var hours = 0, typeLabel = '';
      if (type === 'half') { hours = cfg().baseHours / 2; typeLabel = '半天调休'; }
      else if (type === 'full') { hours = cfg().baseHours; typeLabel = '全天调休'; }
      else if (type === 'hour') {
        hours = Number(b.hours);
        if (!(hours > 0)) return fail('请填写大于 0 的调休小时数');
        typeLabel = '按小时调休';
      } else return fail('调休类型应为 hour / half / full');
      hours = Core.r2(hours);
      var bal = balance();
      var insufficient = bal < hours;
      if (insufficient && !b.force) {
        return fail('调休库存不足（当前 ' + bal.toFixed(2) + 'h，本次需 ' + hours.toFixed(2) + 'h）。可选择"强制登记"，登记后余额为负并触发全局预警', { insufficient: true, bal: bal, hours: hours });
      }
      var rec = {
        id: uid(), date: date, type: type, typeLabel: typeLabel, hours: hours,
        reason: String(b.reason || '').trim(), note: String(b.note || '').trim(),
        forced: insufficient, createdAt: nowStr()
      };
      db.leave.records.push(rec);
      persist();
      flowTx(date, 'leave', -hours, 'leave:' + rec.id, typeLabel + (rec.reason ? '：' + rec.reason : ''));
      return ok({ rec: rec, balance: balance(), insufficient: insufficient }, '已登记' + typeLabel + ' ' + hours.toFixed(2) + 'h，余额 ' + balance().toFixed(2) + 'h');
    },
    'POST /api/leave/delete': function (b) {
      var rec = null;
      db.leave.records.forEach(function (r) { if (r.id === b.id) rec = r; });
      if (!rec) return fail('记录不存在');
      removeTxByRef('leave:' + rec.id);
      db.leave.records = db.leave.records.filter(function (r) { return r.id !== b.id; });
      persist();
      return ok({ balance: balance() }, '已删除 ' + rec.date + ' 的调休休假记录并回滚流水');
    },
    'POST /api/trip': function (b) {
      var start = String(b.start || '').trim(), end = String(b.end || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return fail('日期格式应为 YYYY-MM-DD');
      if (end < start) return fail('结束日期不能早于开始日期');
      var days = Math.round((Core.parseDate(end) - Core.parseDate(start)) / 86400000) + 1;
      if (!(b.type === '市内出差' || b.type === '外地出差')) return fail('出差类型应为 市内出差 / 外地出差');
      var rec = { id: uid(), start: start, end: end, days: days, type: b.type, note: String(b.note || '').trim(), createdAt: nowStr() };
      db.trip.records.push(rec);
      persist();
      return ok({ rec: rec }, '已登记出差 ' + start + ' ~ ' + end + '，共 ' + days + ' 天');
    },
    'POST /api/trip/update': function (b) {
      var rec = null;
      db.trip.records.forEach(function (r) { if (r.id === b.id) rec = r; });
      if (!rec) return fail('记录不存在');
      if (b.start && b.end) {
        if (b.end < b.start) return fail('结束日期不能早于开始日期');
        rec.start = b.start; rec.end = b.end;
        rec.days = Math.round((Core.parseDate(b.end) - Core.parseDate(b.start)) / 86400000) + 1;
      }
      if (b.type === '市内出差' || b.type === '外地出差') rec.type = b.type;
      if (b.note !== undefined) rec.note = String(b.note).trim();
      persist();
      return ok({ rec: rec }, '出差记录已更新');
    },
    'POST /api/trip/delete': function (b) {
      if (!db.trip.records.some(function (r) { return r.id === b.id; })) return fail('记录不存在');
      db.trip.records = db.trip.records.filter(function (r) { return r.id !== b.id; });
      persist();
      return ok({}, '出差记录已删除');
    },
    'POST /api/punch/bindTrip': function (b) {
      var rec = null;
      db.punch.records.forEach(function (r) { if (r.id === b.id) rec = r; });
      if (!rec) return fail('打卡记录不存在');
      rec.tripId = b.tripId || '';
      persist();
      return ok({}, '已更新出差绑定');
    },
    'POST /api/settle': function (b) {
      var ym = String(b.ym || '').trim();
      if (!/^\d{4}-\d{2}$/.test(ym)) return fail('月份格式应为 YYYY-MM');
      var r = settleMonth(ym);
      return ok(Object.assign({ balance: balance() }, r), '月度结算完成');
    },
    'POST /api/resetMonth': function (b) {
      var ym = String(b.ym || '').trim();
      if (!/^\d{4}-\d{2}$/.test(ym)) return fail('月份格式应为 YYYY-MM');
      var removed = {};
      removed.punch = db.punch.records.filter(function (r) { return r.date.indexOf(ym) === 0; }).length;
      db.punch.records = db.punch.records.filter(function (r) { return r.date.indexOf(ym) !== 0; });
      removed.leave = db.leave.records.filter(function (r) { return r.date.indexOf(ym) === 0; }).length;
      db.leave.records = db.leave.records.filter(function (r) { return r.date.indexOf(ym) !== 0; });
      removed.trip = db.trip.records.filter(function (t) { return !(t.end < ym + '-01' || t.start > Core.endOfMonth(ym)); }).length;
      db.trip.records = db.trip.records.filter(function (t) { return t.end < ym + '-01' || t.start > Core.endOfMonth(ym); });
      removed.flow = db.flow.transactions.filter(function (t) { return t.date.indexOf(ym) === 0 && t.type !== 'init'; }).length;
      db.flow.transactions = db.flow.transactions.filter(function (t) { return t.date.indexOf(ym) !== 0 || t.type === 'init'; });
      if (db.summary.months[ym]) delete db.summary.months[ym];
      persist();
      return ok({ removed: removed, balance: balance() }, '已清空 ' + ym + ' 数据（历史月份不受影响）');
    },
    'POST /api/workdays': function (b) {
      var ym = String(b.ym || '').trim();
      var days = Number(b.workdays);
      if (!/^\d{4}-\d{2}$/.test(ym)) return fail('月份格式应为 YYYY-MM');
      if (!(days === -1 || (days >= 0 && days <= 31))) return fail('应出勤天数应在 0~31 之间（-1 表示恢复自动计算）');
      db.summary.months[ym] = db.summary.months[ym] || {};
      if (days < 0) delete db.summary.months[ym].workdaysOverride;
      else db.summary.months[ym].workdaysOverride = days;
      persist();
      return ok(monthState(ym), '已更新应出勤天数');
    },
    'GET /api/export': function (q) {
      var ym = (q.ym || Core.todayStr()).substring(0, 7);
      var st = monthState(ym);
      var L = [];
      var esc = function (s) { return String(s == null ? '' : s).replace(/\t/g, ' ').replace(/\n/g, ' '); };
      L.push('=== 工时打卡台账导出（' + ym + '）===');
      L.push('');
      L.push('【打卡台账】');
      L.push(['日期', '星期', '日类型', '方式', '上班', '下班', '跨零点', '午休扣除(h)', '有效工时(h)', '当日出差', '备注'].join('\t'));
      st.punches.forEach(function (r) {
        var dt = Core.dayType(r.date, calendarFor(Number(r.date.substring(0, 4))));
        var wd = '周' + '日一二三四五六'.charAt(Core.weekday(r.date));
        var t = tripOn(r.date);
        L.push([r.date, wd, dt.name, r.mode === 'time' ? '时间段' : '手动', r.inTime || '-', (r.crossDay ? '次日' : '') + (r.outTime || '-'), r.crossDay ? '是' : '否', (r.lunchDeduct / 60).toFixed(2), Number(r.effHours).toFixed(2), t ? '✈ ' + t.type : '', esc(r.note)].join('\t'));
      });
      L.push('');
      L.push('【调休流水】');
      L.push(['日期', '类型', '小时数', '余额', '原因', '时间'].join('\t'));
      var bal = cfg().initial;
      st.flows.forEach(function (t) {
        bal = Core.r2(bal + Number(t.hours || 0));
        L.push([t.date, t.type, Number(t.hours).toFixed(2), bal.toFixed(2), esc(t.reason), t.createdAt].join('\t'));
      });
      L.push('');
      L.push('【出差记录】');
      L.push(['开始日期', '结束日期', '天数', '类型', '备注'].join('\t'));
      st.trips.forEach(function (t) { L.push([t.start, t.end, t.days, t.type, esc(t.note)].join('\t')); });
      L.push('');
      L.push('【调休休假记录】');
      L.push(['调休日期', '类型', '时长(h)', '事由', '备注'].join('\t'));
      st.leaves.forEach(function (r) { L.push([r.date, r.typeLabel, Number(r.hours).toFixed(2), esc(r.reason), esc(r.note)].join('\t')); });
      L.push('');
      L.push('【月度汇总】');
      L.push('应出勤工作日\t' + st.workdays);
      L.push('月度标准工时(h)\t' + st.stdHours.toFixed(2));
      L.push('累计有效工时(h)\t' + st.stats.effTotal.toFixed(2));
      L.push('当月出差天数\t' + st.stats.tripDays);
      L.push('当月调休休假天数\t' + st.stats.leaveDays);
      L.push('当月调休休假时长(h)\t' + st.stats.leaveTotalHours.toFixed(2));
      L.push('当前调休库存(h)\t' + st.stats.balance.toFixed(2));
      return ok({ text: L.join('\n'), ym: ym });
    }
  };

  // ---------- 对外：调用入口 ----------
  function call(method, url, body) {
    init();
    var qm = url.split('?');
    var path = qm[0];
    var q = {};
    if (qm[1]) {
      qm[1].split('&').forEach(function (kv) {
        var p = kv.split('=');
        q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
      });
    }
    var key = method + ' ' + path;
    var handler = api[key];
    if (!handler) return Promise.resolve({ code: 1, msg: '未知接口：' + key });
    try {
      return Promise.resolve(handler(body || {}, q));
    } catch (e) {
      return Promise.resolve({ code: 1, msg: '内部错误：' + e.message });
    }
  }

  // ---------- 备份 / 恢复 ----------
  function dump() {
    init();
    return JSON.stringify({ exportedAt: nowStr(), version: 1, db: db }, null, 2);
  }
  function restore(json) {
    var obj = JSON.parse(json);
    var d = obj.db || obj;
    var b = blank();
    ['settings', 'holidays', 'punch', 'flow', 'summary', 'trip', 'leave'].forEach(function (k) {
      if (d[k]) b[k] = d[k];
    });
    db = b;
    persist();
    return true;
  }

  return { call: call, dump: dump, restore: restore, init: init };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = WHDB; // Node 测试用
