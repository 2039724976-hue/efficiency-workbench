/**
 * WorkHourCore —— 工时打卡核算引擎（UMD：Node 与浏览器共用）
 * 规则：
 *  - 时间段打卡：上班日期为归属日；HH:MM 分钟级换算；跨零点（下班次日凌晨）out<in 时 +1440 分钟。
 *  - 工作日（含周末调休上班日）且时段覆盖午休区间 → 扣 1 次午休；周末/法定节假日不扣午休。
 *  - 工作日出勤：eff>8h 超出部分入调休库存(over)；eff<8h 缺口抵扣(gap)。
 *  - 周末/法定节假日出勤：全部有效工时直接入调休库存(weekend)。
 *  - 休假日登记时实时扣减库存(leave)；休假日若未打卡则不再产生工时缺口。
 *  - 出差：工作日出差无打卡视为出勤 8h（不产生缺口不入账）；有打卡按打卡核算；周末出差有打卡全额入账。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WorkHourCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  // ---------- 日期工具 ----------
  function fmt(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function todayStr() { return fmt(new Date()); }
  function parseDate(s) {
    var p = String(s).split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function addDays(s, n) {
    var d = parseDate(s); d.setDate(d.getDate() + n); return fmt(d);
  }
  function daysInMonth(ym) {
    var p = ym.split('-').map(Number);
    return new Date(p[0], p[1], 0).getDate();
  }
  function weekday(s) { return parseDate(s).getDay(); } // 0 周日
  function monthOf(s) { return s.substring(0, 7); }
  function dateCmp(a, b) { return a < b ? -1 : (a > b ? 1 : 0); }
  function endOfMonth(ym) { return ym + '-' + pad2(daysInMonth(ym)); }
  function hmToMin(hm) {
    var p = String(hm).split(':').map(Number);
    return p[0] * 60 + (p[1] || 0);
  }
  function minToHm(m) {
    m = ((m % 1440) + 1440) % 1440;
    return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
  }
  function r2(x) { return Math.round(x * 100) / 100; }

  // ---------- 日历：周末 / 法定节假日 / 调休上班日 ----------
  // cal = { holidays:[{start,end,name}], makeupWorkdays:[...] }
  function inRange(s, item) { return dateCmp(s, item.start) >= 0 && dateCmp(s, item.end) <= 0; }
  function isInHolidays(s, cal) {
    if (!cal || !cal.holidays) return false;
    for (var i = 0; i < cal.holidays.length; i++) if (inRange(s, cal.holidays[i])) return true;
    return false;
  }
  function isMakeup(s, cal) {
    if (!cal || !cal.makeupWorkdays) return false;
    return cal.makeupWorkdays.indexOf(s) >= 0;
  }
  function holidayName(s, cal) {
    if (!cal || !cal.holidays) return '节假日';
    for (var i = 0; i < cal.holidays.length; i++) if (inRange(s, cal.holidays[i])) return cal.holidays[i].name || '节假日';
    return '节假日';
  }
  // workday=true 应出勤；holiday=true 法定节假日
  function dayType(s, cal) {
    var wd = weekday(s);
    if (isMakeup(s, cal)) return { workday: true, weekend: false, holiday: false, name: '调休上班' };
    if (isInHolidays(s, cal)) return { workday: false, weekend: wd === 0 || wd === 6, holiday: true, name: holidayName(s, cal) };
    var wk = (wd === 0 || wd === 6);
    return { workday: !wk, weekend: wk, holiday: false, name: wk ? '周末' : '工作日' };
  }

  // 应出勤工作日计数（含调休上班周末、扣除法定节假日工作日）
  function countWorkdays(ym, cal) {
    var n = daysInMonth(ym), c = 0;
    for (var d = 1; d <= n; d++) {
      var s = ym + '-' + pad2(d);
      if (dayType(s, cal).workday) c++;
    }
    return c;
  }

  // ---------- 有效工时 ----------
  // 返回 {inMin,outMin,durMin,crossDay,lunchDeductMin,effHours,dayType}
  function calcPunch(dateStr, inTime, outTime, cal, cfg) {
    var inMin = hmToMin(inTime), outMin = hmToMin(outTime);
    var cross = outMin < inMin; // 下班次日凌晨
    var effOut = outMin + (cross ? 1440 : 0);
    var durMin = effOut - inMin;
    var type = dayType(dateStr, cal);
    var lunchDeductMin = 0;
    if (type.workday) {
      var ls = hmToMin(cfg.lunchStart || '12:00');
      var le = hmToMin(cfg.lunchEnd || '13:00');
      var overlap = Math.max(0, Math.min(effOut, le) - Math.max(inMin, ls));
      if (overlap > 0) lunchDeductMin = Math.min(overlap, (cfg.lunchHours || 1) * 60);
    }
    var effHours = r2(Math.max(0, durMin / 60 - lunchDeductMin / 60));
    return { inMin: inMin, outMin: outMin, durMin: durMin, crossDay: cross, lunchDeductMin: lunchDeductMin, effHours: effHours, dayType: type };
  }

  // ---------- 单日结算结果 ----------
  // 返回 {kind:'over'|'gap'|'weekend'|'none'|'missing', hours, reason}
  function settleDayResult(dateStr, rec, leaveExists, tripCovers, cal, baseHours) {
    var base = baseHours || 8;
    var type = dayType(dateStr, cal);
    if (rec) {
      var eff = Number(rec.effHours || 0);
      if (type.workday) {
        var diff = r2(eff - base);
        if (diff > 0) return { kind: 'over', hours: diff, reason: '工作日加班' };
        if (diff < 0) return { kind: 'gap', hours: diff, reason: '工作日缺口' };
        return { kind: 'none', hours: 0, reason: '满勤' };
      }
      if (eff > 0) return { kind: 'weekend', hours: eff, reason: type.holiday ? '节假日出勤' : '周末出勤' };
      return { kind: 'none', hours: 0, reason: '' };
    }
    // 无打卡
    if (leaveExists) return { kind: 'none', hours: 0, reason: '休假日不核算' };
    if (type.workday && tripCovers) return { kind: 'none', hours: 0, reason: '出差按基准8h' };
    if (type.workday) return { kind: 'missing', hours: 0, reason: '未打卡(月结计缺口)' };
    return { kind: 'none', hours: 0, reason: '' };
  }

  return {
    pad2: pad2, fmt: fmt, todayStr: todayStr, parseDate: parseDate,
    addDays: addDays, daysInMonth: daysInMonth, weekday: weekday, monthOf: monthOf,
    dateCmp: dateCmp, endOfMonth: endOfMonth, hmToMin: hmToMin, minToHm: minToHm, r2: r2,
    dayType: dayType, isInHolidays: isInHolidays, isMakeup: isMakeup, holidayName: holidayName,
    countWorkdays: countWorkdays, calcPunch: calcPunch, settleDayResult: settleDayResult
  };
});
