/* ============ 工时打卡 APP 前端 ============ */
'use strict';
var C = window.WorkHourCore;

var App = {
  state: null,
  ym: null,

  // ---------- 初始化 ----------
  init: function () {
    this.ym = C.todayStr().substring(0, 7);
    this.load();
  },
  load: function () {
    var self = this;
    this.api('GET', '/api/state?ym=' + this.ym).then(function (r) {
      if (r.code !== 0) return self.toast(r.msg, true);
      self.state = r.data;
      self.render();
    }).catch(function (e) { self.toast('本地数据处理失败：' + e.message, true); });
  },
  api: function (method, url, body) {
    return WHDB.call(method, url, body);
  },

  prevMonth: function () { this.shiftMonth(-1); },
  nextMonth: function () { this.shiftMonth(1); },
  shiftMonth: function (n) {
    var p = this.ym.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1 + n, 1);
    this.ym = d.getFullYear() + '-' + C.pad2(d.getMonth() + 1);
    this.load();
  },

  // ---------- 渲染 ----------
  render: function () {
    var s = this.state;
    if (!s) return;
    document.getElementById('ymText').textContent = s.ym;
    var chip = document.getElementById('balanceChip');
    chip.textContent = '调休 ' + s.stats.balance.toFixed(2) + 'h';
    chip.className = 'balance-chip' + (s.stats.balance < 0 ? ' neg' : '');
    var strip = document.getElementById('alertStrip');
    strip.className = 'alert-strip';
    strip.style.display = 'none';
    if (s.warnings && s.warnings.length) {
      var w = s.warnings[0];
      strip.className = 'alert-strip show ' + w.level;
      strip.innerHTML = (w.level === 'error' ? '🚨 ' : '⚠️ ') + this.esc(w.text);
    }
    var main = document.getElementById('main');
    var isPC = window.innerWidth >= 1020;
    main.innerHTML = isPC ? this.renderPC(s) : this.renderMobile(s);
  },
  renderMobile: function (s) {
    var h = '';
    h += this.cardActions(s);
    h += this.cardSummary(s);
    h += this.cardPunch(s);
    h += this.cardFlow(s);
    h += this.cardTrip(s);
    h += this.cardLeave(s);
    return h;
  },
  renderPC: function (s) {
    // 三栏：左=打卡台账 中=流水+出差 右=汇总+调休休假
    var left = this.cardActions(s) + this.cardPunch(s);
    var mid = this.cardFlow(s) + this.cardTrip(s);
    var right = this.cardSummary(s) + this.cardLeave(s);
    return '<div class="pc-col">' + left + '</div><div class="pc-col">' + mid + '</div><div class="pc-col">' + right + '</div>';
  },

  cardActions: function () {
    var h = '<div class="card"><div class="card-title">⚡ 快捷操作</div>';
    h += '<div class="action-row">';
    h += '<button class="btn btn-primary" onclick="App.modalPunch()">📍 打卡</button>';
    h += '<button class="btn btn-blue" onclick="App.modalDirect()">📝 录工时</button>';
    h += '<button class="btn btn-purple" onclick="App.modalLeave()">🏖 调休休假</button>';
    h += '<button class="btn btn-green" onclick="App.modalTrip()">✈️ 新增出差</button>';
    h += '<button class="btn btn-orange" onclick="App.modalCompUse()">💨 调休使用</button>';
    h += '<button class="btn" onclick="App.settle()">🧮 月度结算</button>';
    h += '<button class="btn" onclick="App.exportLedger()">📤 导出台账</button>';
    h += '<button class="btn" onclick="App.modalBackup()">💾 备份/恢复</button>';
    h += '<button class="btn btn-red" onclick="App.resetMonth()">🗑 重置当月</button>';
    h += '</div></div>';
    return h;
  },

  cardSummary: function (s) {
    var st = s.stats;
    var h = '<div class="card"><div class="card-title">📊 月度汇总 <span class="sub">' + s.ym + (s.stats.settled ? ' · 已结算' : '') + '</span></div>';
    h += '<div class="stat-grid">';
    h += this.statItem('应出勤工作日', s.workdays + '<small>天</small>', 'hl-blue') +
      this.statItem('月度标准工时', s.stdHours.toFixed(2) + '<small>h</small>', 'hl-blue') +
      this.statItem('累计有效工时', st.effTotal.toFixed(2) + '<small>h</small>', '') +
      this.statItem('当前调休库存', st.balance.toFixed(2) + '<small>h</small>', st.balance < 0 ? 'hl-red' : 'hl-green') +
      this.statItem('当月出差总天数', st.tripDays + '<small>天</small>', 'hl-orange') +
      this.statItem('当月加班入账', st.over.toFixed(2) + '<small>h</small>', 'hl-green') +
      this.statItem('当月调休休假', st.leaveDays + '<small>天</small> · ' + st.leaveTotalHours.toFixed(2) + '<small>h</small>', 'hl-orange') +
      this.statItem('当月缺口抵扣', Math.abs(st.gap).toFixed(2) + '<small>h</small>', st.gap < 0 ? 'hl-red' : '');
    h += '</div>';
    h += '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">';
    h += '<button class="btn btn-sm" onclick="App.modalWorkdays()">✏️ ' + (s.workdaysOverride ? '已手动覆盖应出勤天数' : '手动修改应出勤天数') + '</button>';
    h += '<button class="btn btn-sm" onclick="App.settle()">🧮 执行月度结算</button>';
    h += '</div></div>';
    return h;
  },

  statItem: function (k, v, cls) {
    return '<div class="stat-item ' + (cls || '') + '"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>';
  },

  cardPunch: function (s) {
    var self = this;
    var h = '<div class="card"><div class="card-title">📍 打卡台账 <span class="sub">' + s.punches.length + ' 条</span></div>';
    if (!s.punches.length) { h += '<div class="empty">本月暂无打卡记录<br>点击「打卡」或输入 /打卡 开始记录</div>'; h += '</div>'; return h; }
    h += '<div class="table-wrap"><table class="data"><thead><tr><th>日期</th><th>类型</th><th>上班</th><th>下班</th><th>午休扣</th><th>有效工时</th><th>备注</th><th></th></tr></thead><tbody>';
    s.punches.forEach(function (r) {
      var t = C.dayType(r.date, s.calendar);
      var trip = null;
      s.trips.forEach(function (tp) { if (r.date >= tp.start && r.date <= tp.end) trip = tp; });
      h += '<tr><td class="num">' + r.date + '</td><td>';
      h += '<span class="tag ' + (t.holiday ? 'holiday' : t.weekend ? 'weekend' : 'work') + '">' + t.name + '</span>';
      if (trip) h += ' <span class="tag trip">✈ 出差</span>';
      if (r.crossDay) h += ' <span class="tag cross">跨零点</span>';
      if (r.mode === 'direct') h += ' <span class="tag settled">手动</span>';
      h += '</td>';
      h += '<td class="num">' + (r.inTime || '—') + '</td>';
      h += '<td class="num">' + (r.crossDay ? '次日' : '') + (r.outTime || '—') + '</td>';
      h += '<td class="num">' + (r.lunchDeduct ? (r.lunchDeduct / 60).toFixed(2) + 'h' : '—') + '</td>';
      var cls = Number(r.effHours) >= 8 ? 'pos' : (Number(r.effHours) > 0 && Number(r.effHours) < 8 ? 'neg' : '');
      h += '<td class="num ' + cls + '">' + Number(r.effHours).toFixed(2) + 'h</td>';
      h += '<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;">' + self.esc(r.note || '') + '</td>';
      h += '<td><button class="btn btn-sm btn-red" onclick="App.delPunch(\'' + r.id + '\')">删</button></td></tr>';
    });
    h += '</tbody></table></div></div>';
    return h;
  },

  cardFlow: function (s) {
    var self = this;
    var h = '<div class="card"><div class="card-title">💰 调休流水 <span class="sub">初始 96.00h · 当前 ' + s.stats.balance.toFixed(2) + 'h</span></div>';
    if (!s.flows.length) { h += '<div class="empty">暂无流水</div></div>'; return h; }
    h += '<div class="table-wrap"><table class="data"><thead><tr><th>日期</th><th>类型</th><th>小时</th><th>原因</th></tr></thead><tbody>';
    var typeMap = { over: '加班入账', gap: '缺口抵扣', weekend: '周末/节假日', leave: '休假抵扣', manualUse: '手动消耗', init: '初始库存' };
    s.flows.forEach(function (t) {
      var hv = Number(t.hours);
      var delBtn = t.type === 'manualUse'
        ? '<button class="btn btn-sm btn-red" onclick="App.delCompUse(\'' + t.id + '\')">删</button>'
        : '';
      h += '<tr><td class="num">' + t.date + '</td><td>' + (typeMap[t.type] || t.type) + '</td>';
      h += '<td class="num ' + (hv > 0 ? 'pos' : 'neg') + '">' + (hv > 0 ? '+' : '') + hv.toFixed(2) + '</td>';
      h += '<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;">' + self.esc(t.reason || '') + '</td>';
      h += '<td>' + delBtn + '</td></tr>';
    });
    h += '</tbody></table></div></div>';
    return h;
  },

  cardTrip: function (s) {
    var h = '<div class="card"><div class="card-title">✈️ 出差记录 <span class="sub">当月 ' + s.stats.tripDays + ' 天</span></div>';
    if (!s.trips.length) { h += '<div class="empty">暂无出差记录</div></div>'; return h; }
    h += '<div class="table-wrap"><table class="data"><thead><tr><th>开始</th><th>结束</th><th>天数</th><th>类型</th><th>备注</th><th></th></tr></thead><tbody>';
    s.trips.forEach(function (t) {
      h += '<tr><td class="num">' + t.start + '</td><td class="num">' + t.end + '</td><td class="num">' + t.days + '天</td>';
      h += '<td><span class="tag ' + (t.type === '外地出差' ? 'holiday' : 'trip') + '">' + t.type + '</span></td>';
      h += '<td>' + App.esc(t.note || '') + '</td>';
      h += '<td><button class="btn btn-sm btn-red" onclick="App.delTrip(\'' + t.id + '\')">删</button></td></tr>';
    });
    h += '</tbody></table></div></div>';
    return h;
  },

  cardLeave: function (s) {
    var h = '<div class="card"><div class="card-title">🏖 调休休假记录 <span class="sub">当月 ' + s.stats.leaveDays + ' 天 · ' + s.stats.leaveTotalHours.toFixed(2) + 'h</span></div>';
    if (!s.leaves.length) { h += '<div class="empty">暂无调休休假记录</div></div>'; return h; }
    h += '<div class="table-wrap"><table class="data"><thead><tr><th>日期</th><th>类型</th><th>时长</th><th>事由</th><th></th></tr></thead><tbody>';
    s.leaves.forEach(function (r) {
      h += '<tr><td class="num">' + r.date + '</td><td><span class="tag leave">' + r.typeLabel + '</span>' + (r.forced ? ' <span class="tag weekend">强制</span>' : '') + '</td>';
      h += '<td class="num neg">-' + Number(r.hours).toFixed(2) + 'h</td>';
      h += '<td>' + App.esc(r.reason || '') + '</td>';
      h += '<td><button class="btn btn-sm btn-red" onclick="App.delLeave(\'' + r.id + '\')">删</button></td></tr>';
    });
    h += '</tbody></table></div></div>';
    return h;
  },

  // ---------- 弹窗 ----------
  modal: function (title, bodyHtml, actionsHtml) {
    var box = document.getElementById('modalBox');
    var h = '<div class="modal-head"><h3>' + title + '</h3><button class="modal-close" onclick="App.closeModal()">✕</button></div>';
    h += bodyHtml;
    if (actionsHtml) h += '<div class="modal-actions">' + actionsHtml + '</div>';
    box.innerHTML = h;
    document.getElementById('modalMask').style.display = 'flex';
  },
  closeModal: function () { document.getElementById('modalMask').style.display = 'none'; },

  modalPunch: function (preset) {
    preset = preset || {};
    var today = C.todayStr();
    var h = '';
    h += '<div class="form-row"><label>上班日期（工时归属日）</label><input type="date" id="mDate" value="' + (preset.date || today) + '"></div>';
    h += '<div class="form-cols"><div class="form-row"><label>上班时间</label><input type="time" id="mIn" value="' + (preset.inTime || '08:30') + '"></div>';
    h += '<div class="form-row"><label>下班时间</label><input type="time" id="mOut" value="' + (preset.outTime || '17:30') + '"></div></div>';
    h += '<div class="form-row"><div class="inline-check"><input type="checkbox" id="mCross"><label for="mCross" style="margin:0">下班跨零点（次日凌晨下班，工时计入上班当日）</label></div></div>';
    h += '<div class="form-row"><label>备注（加班/陪客户事由）</label><input type="text" id="mNote" placeholder="如：陪客户验收" value="' + this.esc(preset.note || '') + '"></div>';
    h += '<div class="calc-preview" id="mPreview">实时预览：填写时间后自动计算</div>';
    this.modal('📍 时间段打卡', h,
      '<button class="btn" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.savePunch()">保存打卡</button>');
    if (preset.cross) document.getElementById('mCross').checked = true;
    var self = this;
    ['mIn', 'mOut', 'mDate', 'mCross'].forEach(function (id) {
      var el = document.getElementById(id);
      el.addEventListener('change', function () { self.previewPunch(); });
      el.addEventListener('input', function () { self.previewPunch(); });
    });
    this.previewPunch();
  },
  previewPunch: function () {
    var d = document.getElementById('mDate').value;
    var i = document.getElementById('mIn').value;
    var o = document.getElementById('mOut').value;
    var cross = document.getElementById('mCross').checked;
    var box = document.getElementById('mPreview');
    if (!d || !i || !o) { box.textContent = '请完整填写日期与时间'; return; }
    var inMin = C.hmToMin(i), outMin = C.hmToMin(o);
    // 下班早于上班且未勾选跨零点 → 自动帮用户勾上（可手动取消）
    if (outMin < inMin && !cross) {
      document.getElementById('mCross').checked = true;
      cross = true;
    }
    if (!cross && outMin === inMin) {
      box.innerHTML = '⚠️ 上班与下班时间相同，请检查';
      return;
    }
    var calc = C.calcPunch(d, i, o, this.state.calendar, this.state.cfg);
    var t = calc.dayType;
    box.innerHTML = '当日类型：<b>' + t.name + '</b> ｜ 时长 <b>' + (calc.durMin / 60).toFixed(2) + 'h</b>' +
      (calc.lunchDeductMin ? ' ｜ 扣午休 <b>' + (calc.lunchDeductMin / 60).toFixed(2) + 'h</b>' : ' ｜ 不扣午休') +
      ' ｜ 有效工时 <b>' + calc.effHours.toFixed(2) + 'h</b>' +
      (calc.crossDay ? ' ｜ 跨零点 ✔（工时计入上班当日）' : '');
  },
  savePunch: function () {
    var b = {
      date: document.getElementById('mDate').value,
      inTime: document.getElementById('mIn').value,
      outTime: document.getElementById('mOut').value,
      cross: document.getElementById('mCross').checked,
      note: document.getElementById('mNote').value
    };
    if (b.cross && C.hmToMin(b.outTime) > C.hmToMin(b.inTime)) {
      if (!confirm('已勾选跨零点，但下班时间晚于上班时间（同日）。仍按同日保存吗？\n确定=同日保存，取消=返回修改')) return;
    }
    var self = this;
    this.api('POST', '/api/punch', b).then(function (r) {
      if (r.code !== 0) return self.toast(r.msg, true);
      self.closeModal(); self.toast(r.msg); self.ym = b.date.substring(0, 7); self.load();
    });
  },

  modalDirect: function (preset) {
    preset = preset || {};
    var h = '';
    h += '<div class="form-row"><label>日期</label><input type="date" id="dDate" value="' + (preset.date || C.todayStr()) + '"></div>';
    h += '<div class="form-row"><label>当日有效工时（小时，支持小数）</label><input type="number" id="dHours" step="0.01" min="0" max="24" placeholder="如 7.75" value="' + (preset.hours || '') + '">';
    h += '<div class="hint">工作日 8h 为基准，超出部分入调休库存，不足部分消耗调休库存；周末/节假日全额入账</div></div>';
    h += '<div class="form-row"><label>备注</label><input type="text" id="dNote" value="' + this.esc(preset.note || '') + '"></div>';
    this.modal('📝 直接填写工时', h,
      '<button class="btn" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.saveDirect()">保存</button>');
  },
  saveDirect: function () {
    var b = {
      date: document.getElementById('dDate').value,
      hours: Number(document.getElementById('dHours').value),
      note: document.getElementById('dNote').value
    };
    var self = this;
    this.api('POST', '/api/direct', b).then(function (r) {
      if (r.code !== 0) return self.toast(r.msg, true);
      self.closeModal(); self.toast(r.msg); self.ym = b.date.substring(0, 7); self.load();
    });
  },

  modalLeave: function (preset) {
    preset = preset || {};
    var h = '';
    h += '<div class="form-row"><label>调休日期</label><input type="date" id="lDate" value="' + (preset.date || C.todayStr()) + '"></div>';
    h += '<div class="form-row"><label>登记方式</label><div class="seg" id="lType">';
    h += '<button type="button" class="on" data-v="hour" onclick="App.leaveType(\'hour\')">按小时</button>';
    h += '<button type="button" data-v="half" onclick="App.leaveType(\'half\')">半天 4h</button>';
    h += '<button type="button" data-v="full" onclick="App.leaveType(\'full\')">全天 8h</button></div></div>';
    h += '<div class="form-row" id="lHoursRow"><label>调休小时数（支持小数）</label><input type="number" id="lHours" step="0.01" min="0" placeholder="如 2.5"></div>';
    h += '<div class="form-row"><label>事由</label><input type="text" id="lReason" placeholder="如：家中有事" value="' + this.esc(preset.reason || '') + '"></div>';
    h += '<div class="form-row"><label>备注</label><input type="text" id="lNote"></div>';
    h += '<div class="calc-preview">当前调休库存：<b>' + this.state.stats.balance.toFixed(2) + 'h</b> ｜ 休假日不录入打卡，不产生工时缺口</div>';
    this.modal('🏖 登记调休休假', h,
      '<button class="btn" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.saveLeave()">登记</button>');
  },
  leaveType: function (v) {
    var seg = document.getElementById('lType');
    seg.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === v); });
    document.getElementById('lHoursRow').style.display = v === 'hour' ? '' : 'none';
  },
  saveLeave: function (force) {
    var b = {
      date: document.getElementById('lDate').value,
      type: document.querySelector('#lType button.on').getAttribute('data-v'),
      hours: Number(document.getElementById('lHours').value),
      reason: document.getElementById('lReason').value,
      note: document.getElementById('lNote').value,
      force: !!force
    };
    var self = this;
    this.api('POST', '/api/leave', b).then(function (r) {
      if (r.code !== 0) {
        if (r.insufficient) {
          if (confirm(r.msg + '\n\n是否强制登记？（登记后余额为负，页面将全局预警）')) self.saveLeave(true);
          return;
        }
        return self.toast(r.msg, true);
      }
      self.closeModal(); self.toast(r.msg); self.ym = b.date.substring(0, 7); self.load();
    });
  },

  modalCompUse: function () {
    var h = '';
    h += '<div class="form-row"><label>消耗调休小时数（支持小数）</label><input type="number" id="cHours" step="0.01" min="0" placeholder="如 2.5"></div>';
    h += '<div class="form-row"><label>事由</label><input type="text" id="cReason" placeholder="如：月度结算抵扣"></div>';
    h += '<div class="calc-preview">当前调休库存：<b>' + this.state.stats.balance.toFixed(2) + 'h</b><br>手动消耗仅扣库存，不绑定具体休假日期</div>';
    this.modal('💨 手动调休使用', h,
      '<button class="btn" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.saveCompUse()">登记</button>');
  },
  saveCompUse: function (force) {
    var b = { hours: Number(document.getElementById('cHours').value), reason: document.getElementById('cReason').value, force: !!force };
    var self = this;
    this.api('POST', '/api/comp/use', b).then(function (r) {
      if (r.code !== 0) {
        if (r.msg.indexOf('不足') >= 0) {
          if (confirm(r.msg + '\n\n是否强制登记？')) self.saveCompUse(true);
          return;
        }
        return self.toast(r.msg, true);
      }
      self.closeModal(); self.toast(r.msg); self.load();
    });
  },

  modalTrip: function (preset) {
    preset = preset || {};
    var h = '';
    h += '<div class="form-cols"><div class="form-row"><label>开始日期</label><input type="date" id="tStart" value="' + (preset.start || C.todayStr()) + '"></div>';
    h += '<div class="form-row"><label>结束日期</label><input type="date" id="tEnd" value="' + (preset.end || C.todayStr()) + '"></div></div>';
    h += '<div class="form-row"><label>出差类型</label><div class="seg" id="tType">';
    h += '<button type="button" class="on" data-v="市内出差" onclick="App.tripType(\'市内出差\')">市内出差</button>';
    h += '<button type="button" data-v="外地出差" onclick="App.tripType(\'外地出差\')">外地出差</button></div></div>';
    h += '<div class="form-row"><label>备注</label><input type="text" id="tNote" value="' + this.esc(preset.note || '') + '"></div>';
    h += '<div class="calc-preview" id="tPreview">天数自动计算（含起止当日）</div>';
    this.modal('✈️ 新增出差', h,
      '<button class="btn" onclick="App.closeModal()">取消</button><button class="btn btn-green" onclick="App.saveTrip()">保存</button>');
    var self = this;
    ['tStart', 'tEnd'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', function () { self.previewTrip(); });
    });
    this.previewTrip();
  },
  tripType: function (v) {
    var seg = document.getElementById('tType');
    seg.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === v); });
  },
  previewTrip: function () {
    var s = document.getElementById('tStart').value, e = document.getElementById('tEnd').value;
    var box = document.getElementById('tPreview');
    if (!s || !e) { box.textContent = '请选择起止日期'; return; }
    if (e < s) { box.textContent = '⚠️ 结束日期早于开始日期'; return; }
    var days = Math.round((C.parseDate(e) - C.parseDate(s)) / 86400000) + 1;
    box.innerHTML = '出差天数：<b>' + days + ' 天</b>（含起止当日）';
  },
  saveTrip: function () {
    var b = {
      start: document.getElementById('tStart').value,
      end: document.getElementById('tEnd').value,
      type: document.querySelector('#tType button.on').getAttribute('data-v'),
      note: document.getElementById('tNote').value
    };
    var self = this;
    this.api('POST', '/api/trip', b).then(function (r) {
      if (r.code !== 0) return self.toast(r.msg, true);
      self.closeModal(); self.toast(r.msg); self.load();
    });
  },

  modalWorkdays: function () {
    var s = this.state;
    var auto = C.countWorkdays(s.ym, s.calendar);
    var h = '';
    h += '<div class="form-row"><label>当月应出勤工作日（系统自动：' + auto + ' 天）</label>';
    h += '<input type="number" id="wDays" min="0" max="31" value="' + s.workdays + '"></div>';
    h += '<div class="hint" style="font-size:14px;color:var(--text2);">日历/节假日数据异常时可手动覆盖；输入 -1 恢复自动计算。月度标准工时 = 应出勤天数 × 8h</div>';
    this.modal('✏️ 修改应出勤天数', h,
      '<button class="btn" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="App.saveWorkdays()">保存</button>');
  },
  saveWorkdays: function () {
    var b = { ym: this.ym, workdays: Number(document.getElementById('wDays').value) };
    var self = this;
    this.api('POST', '/api/workdays', b).then(function (r) {
      if (r.code !== 0) return self.toast(r.msg, true);
      self.closeModal(); self.toast('已更新应出勤天数'); self.load();
    });
  },

  settle: function () {
    var self = this;
    if (!confirm('执行 ' + this.ym + ' 月度结算？\n\n· 结算本月所有已过日期的打卡差额并更新调休库存\n· 未打卡的工作日（非休假/出差）按每天 -8h 计缺口')) return;
    this.api('POST', '/api/settle', { ym: this.ym }).then(function (r) {
      if (r.code !== 0) return self.toast(r.msg, true);
      var d = r.data;
      self.toast('月结完成：补漏 ' + d.backfilled.length + ' 天，缺勤缺口 ' + d.missing.length + ' 天，余额 ' + d.balance.toFixed(2) + 'h');
      self.load();
    });
  },

  resetMonth: function () {
    var self = this;
    if (!confirm('⚠️ 确认清空 ' + this.ym + ' 当月的打卡、出差、调休休假数据及当月流水？\n\n· 历史月份数据不受影响\n· 该操作不可撤销，建议先「导出台账」备份')) return;
    if (!confirm('二次确认：真的要清空 ' + this.ym + ' 的当月数据吗？')) return;
    this.api('POST', '/api/resetMonth', { ym: this.ym }).then(function (r) {
      if (r.code !== 0) return self.toast(r.msg, true);
      self.toast(r.msg); self.load();
    });
  },

  // ---------- 备份 / 恢复 ----------
  modalBackup: function () {
    var h = '';
    h += '<div class="form-row"><div class="calc-preview">数据保存在本机浏览器（localStorage）。换手机、清缓存前请先备份！</div></div>';
    h += '<div class="form-row"><label>① 备份：下载完整数据 JSON 文件</label>';
    h += '<button class="btn btn-primary" onclick="App.backupDownload()">⬇️ 下载备份文件</button></div>';
    h += '<div class="form-row"><label>② 恢复：选择之前下载的备份文件</label>';
    h += '<input type="file" id="bkFile" accept=".json,application/json" style="width:100%;min-height:44px;">';
    h += '<button class="btn btn-orange" onclick="App.backupRestore()">⬆️ 从文件恢复（覆盖现有数据）</button></div>';
    this.modal('💾 备份 / 恢复', h,
      '<button class="btn" onclick="App.closeModal()">关闭</button>');
  },
  backupDownload: function () {
    try {
      var text = WHDB.dump();
      var blob = new Blob([text], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'workhour-backup-' + C.todayStr() + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      this.toast('备份文件已开始下载');
    } catch (e) { this.toast('备份失败：' + e.message, true); }
  },
  backupRestore: function () {
    var self = this;
    var f = document.getElementById('bkFile').files[0];
    if (!f) return this.toast('请先选择备份文件', true);
    if (!confirm('恢复将覆盖当前全部数据，确定继续？')) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        WHDB.restore(reader.result);
        self.closeModal(); self.toast('数据已恢复'); self.load();
      } catch (e) { self.toast('恢复失败：文件格式不对（' + e.message + '）', true); }
    };
    reader.readAsText(f, 'utf-8');
  },

  exportLedger: function () {
    var self = this;
    this.api('GET', '/api/export?ym=' + this.ym).then(function (r) {
      if (r.code !== 0) return self.toast(r.msg, true);
      var h = '<div class="form-row"><label>台账文本（TSV 格式，可直接粘贴到 Excel）</label>';
      h += '<textarea class="export-text" id="expText" readonly>' + self.esc(r.data.text) + '</textarea></div>';
      self.modal('📤 导出台账 · ' + self.ym, h,
        '<button class="btn" onclick="App.closeModal()">关闭</button><button class="btn btn-primary" onclick="App.copyExport()">📋 复制全部</button>');
    });
  },
  copyExport: function () {
    var ta = document.getElementById('expText');
    ta.select(); ta.setSelectionRange(0, 99999999);
    var okBtn = document.querySelector('.modal-actions .btn-primary');
    try {
      navigator.clipboard.writeText(ta.value).then(function () { App.toast('已复制到剪贴板，可直接粘贴到 Excel'); })
        .catch(function () { document.execCommand('copy'); App.toast('已复制到剪贴板'); });
    } catch (e) { document.execCommand('copy'); this.toast('已复制到剪贴板'); }
  },

  // ---------- 删除 ----------
  delPunch: function (id) {
    var self = this;
    if (!confirm('删除该打卡记录？相关调休流水将同步回滚。')) return;
    this.api('POST', '/api/punch/delete', { id: id }).then(function (r) {
      if (r.code !== 0) return self.toast(r.msg, true);
      self.toast(r.msg); self.load();
    });
  },
  delCompUse: function (id) {
    var self = this;
    if (!confirm('删除这条手动调休消耗记录？对应小时数会原数返还到调休库存。')) return;
    this.api('POST', '/api/comp/delete', { id: id }).then(function (r) {
      if (r.code !== 0) return self.toast(r.msg, true);
      self.toast(r.msg); self.load();
    });
  },
  delLeave: function (id) {
    var self = this;
    if (!confirm('删除该调休休假记录？已扣调休将回滚到库存。')) return;
    this.api('POST', '/api/leave/delete', { id: id }).then(function (r) {
      if (r.code !== 0) return self.toast(r.msg, true);
      self.toast(r.msg); self.load();
    });
  },
  delTrip: function (id) {
    var self = this;
    if (!confirm('删除该出差记录？')) return;
    this.api('POST', '/api/trip/delete', { id: id }).then(function (r) {
      if (r.code !== 0) return self.toast(r.msg, true);
      self.toast(r.msg); self.load();
    });
  },

  // ---------- 快捷指令 ----------
  runQuick: function () {
    var input = document.getElementById('quickInput');
    var raw = input.value.trim();
    if (!raw) return;
    input.value = '';
    var parts = raw.split(/\s+/);
    var cmd = parts[0].toLowerCase();
    var args = parts.slice(1);
    switch (cmd) {
      case '/打卡': return this.cmdPunch(args);
      case '/当日工时': return this.cmdDirect(args);
      case '/调休使用': return this.cmdLeave(args);
      case '/新增出差': return this.modalTrip();
      case '/月度结算': return this.settle();
      case '/重置当月': return this.resetMonth();
      case '/导出台账': return this.exportLedger();
      default: this.toast('未知指令：' + cmd + '。可用：/打卡 /当日工时 /调休使用 /新增出差 /月度结算 /重置当月 /导出台账', true);
    }
  },
  // /打卡 [日期] [上班HH:MM] [下班HH:MM] [备注...]  日期可省略默认今天
  cmdPunch: function (a) {
    var p = { date: C.todayStr(), inTime: '08:30', outTime: '17:30', note: '', cross: false };
    var i = 0;
    if (a[0] && /^\d{4}-\d{2}-\d{2}$/.test(a[0])) { p.date = a[0]; i = 1; }
    if (a[i] && /^\d{1,2}:\d{2}$/.test(a[i])) { p.inTime = a[i]; i++; }
    if (a[i] && /^\d{1,2}:\d{2}$/.test(a[i])) { p.outTime = a[i]; i++; }
    if (C.hmToMin(p.outTime) < C.hmToMin(p.inTime)) p.cross = true; // 下班早于上班 → 自动按跨零点预勾选
    p.note = a.slice(i).join(' ');
    this.modalPunch(p);
  },
  // /当日工时 [日期] [小时数] [备注...]
  cmdDirect: function (a) {
    var p = { date: C.todayStr(), hours: '', note: '' };
    var i = 0;
    if (a[0] && /^\d{4}-\d{2}-\d{2}$/.test(a[0])) { p.date = a[0]; i = 1; }
    if (a[i] && /^\d+(\.\d+)?$/.test(a[i])) { p.hours = a[i]; i++; }
    p.note = a.slice(i).join(' ');
    this.modalDirect(p);
  },
  // /调休使用 [小时|半天|全天] [日期]
  cmdLeave: function (a) {
    this.modalLeave();
    var v = 'hour';
    if (a[0] === '半天' || a[0] === 'half') v = 'half';
    if (a[0] === '全天' || a[0] === 'full') v = 'full';
    this.leaveType(v);
    if (v === 'hour' && a[0] && /^\d+(\.\d+)?$/.test(a[0])) document.getElementById('lHours').value = a[0];
    if (a[1] && /^\d{4}-\d{2}-\d{2}$/.test(a[1])) document.getElementById('lDate').value = a[1];
    else if (a[0] && /^\d{4}-\d{2}-\d{2}$/.test(a[0])) document.getElementById('lDate').value = a[0];
  },

  // ---------- 工具 ----------
  esc: function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },
  toast: function (msg, isErr) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.className = isErr ? 'err' : '';
    t.style.display = 'block';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(function () { t.style.display = 'none'; }, isErr ? 5000 : 3000);
  }
};

window.addEventListener('resize', function () {
  clearTimeout(App._resizeTimer);
  App._resizeTimer = setTimeout(function () { App.render(); }, 150);
});
document.getElementById('modalMask').addEventListener('click', function (e) {
  if (e.target === this) App.closeModal();
});
App.init();
