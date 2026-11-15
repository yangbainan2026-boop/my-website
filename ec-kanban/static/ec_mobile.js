
// 数据时间显示成「月-日 时:分」

/* 手机版：竖向长页面，全部板块完整展示，30 秒自动刷新 */

const $ = (s) => document.querySelector(s);
const charts = {};
const T = { cyan: '#00e5d0', blue: '#2f9bff', yellow: '#ffd54a', orange: '#ff9f6b', purple: '#7b6bff', text: '#8fb8d8', grid: 'rgba(72,150,230,.16)' };

function tickClock() {
  const d = new Date();
  $('#mClock').textContent = d.toLocaleTimeString('zh-CN', { hour12: false }).slice(0, 5);
}
tickClock();
setInterval(tickClock, 1000);

// 客户阶段漏斗
function funnelOption(d) {
  const colors = [T.cyan, '#38d0ff', T.blue, T.purple, T.orange];
  return {
    series: [{
      type: 'funnel', left: '2%', right: '2%', top: 8, bottom: 4,
      minSize: '30%', maxSize: '100%', sort: 'descending', gap: 4,
      label: { show: true, position: 'inside', color: '#04162c', fontSize: 11, fontWeight: 500, formatter: '{b} {c}' },
      itemStyle: { borderColor: '#07142e', borderWidth: 2 },
      data: d.map((x, i) => ({ name: x.name, value: x.value, itemStyle: { color: colors[i % colors.length] } })),
    }],
  };
}

// 入库渠道 TOP 6（渠道名去掉「7_」这类前缀）
function channelOption(d) {
  const clean = (n) => String(n).replace(/^\d+_/, '');
  return {
    grid: { left: 88, right: 66, top: 6, bottom: 4 },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category', data: d.map((x) => clean(x.name)).reverse(),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: T.text, fontSize: 10, width: 84, overflow: 'truncate' },
    },
    series: [{
      type: 'bar', barWidth: 11,
      data: d.map((x) => ({ value: x.value, ratio: x.ratio })).reverse(),
      itemStyle: {
        borderRadius: [0, 5, 5, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#0057b8' }, { offset: 1, color: T.cyan }]),
      },
      label: { show: true, position: 'right', color: T.yellow, fontSize: 10, formatter: (p) => `${p.value} · ${p.data.ratio}%` },
    }],
  };
}

// 两组核心指标对比
function compareOption(d) {
  return {
    legend: { data: d.series.map((s) => s.name), top: 2, right: 2, itemWidth: 8, itemHeight: 6, textStyle: { color: T.text, fontSize: 9 } },
    grid: { left: 34, right: 6, top: 30, bottom: 40 },
    xAxis: {
      type: 'category', data: d.items,
      axisLine: { lineStyle: { color: 'rgba(72,150,230,.40)' } }, axisTick: { show: false },
      axisLabel: { color: T.text, fontSize: 9, interval: 0, rotate: 24 },
    },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: T.grid } }, axisLabel: { color: '#6d96bd', fontSize: 9 } },
    series: d.series.map((s, i) => ({
      name: s.name, type: 'bar', barMaxWidth: 12, data: s.values,
      itemStyle: {
        borderRadius: [3, 3, 0, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: i === 0 ? T.cyan : T.yellow },
          { offset: 1, color: i === 0 ? '#0066c8' : '#a86a10' },
        ]),
      },
      label: { show: true, position: 'top', fontSize: 8, color: i === 0 ? T.cyan : T.yellow, formatter: (p) => p.value.toLocaleString() },
    })),
  };
}

// 17 项能力雷达
function radarOption(d) {
  return {
    legend: { data: d.series.map((s) => s.name), top: 2, right: 2, itemWidth: 8, itemHeight: 6, textStyle: { color: T.text, fontSize: 9 } },
    radar: {
      indicator: d.indicators, center: ['50%', '56%'], radius: '58%', splitNumber: 3,
      axisName: { color: T.text, fontSize: 8 },
      splitLine: { lineStyle: { color: 'rgba(72,150,230,.20)' } },
      splitArea: { areaStyle: { color: ['rgba(0,120,200,.04)', 'rgba(0,120,200,.10)'] } },
      axisLine: { lineStyle: { color: 'rgba(72,150,230,.28)' } },
    },
    series: [{
      type: 'radar', symbolSize: 2,
      data: d.series.map((s, i) => ({
        name: s.name, value: s.values,
        lineStyle: { width: 1.5, color: i === 0 ? T.cyan : T.yellow },
        itemStyle: { color: i === 0 ? T.cyan : T.yellow },
        areaStyle: { color: i === 0 ? 'rgba(0,229,208,.18)' : 'rgba(255,213,74,.14)' },
      })),
    }],
  };
}

// 排名：入库 → 联系 → 通话 → 共享
const RANK_DIMS = [
  { key: 'instock', title: '入库排名' },
  { key: 'contact', title: '联系排名' },
  { key: 'calls', title: '通话排名' },
  { key: 'share', title: '共享排名' },
];
let rankDim = 0;
let rankData = [];

function paintRank() {
  const dim = RANK_DIMS[rankDim];
  const list = rankData.slice().sort((a, b) => b[dim.key] - a[dim.key]).slice(0, 8);
  const max = list.length ? list[0][dim.key] || 1 : 1;
  $('#mRankTitle').textContent = dim.title;
  $('#mRankList').innerHTML = list.map((r, i) => `
    <div class="m-rank-row" style="--w:${(r[dim.key] / max) * 100}%">
      <span class="rk-no">${i + 1}</span>
      <span class="rk-name">${r.name}</span>
      <span class="rk-group">${r.group}</span>
      <span class="rk-val">${r[dim.key]}</span>
    </div>`).join('');
}

setInterval(() => {
  if (!rankData.length) return;
  const box = $('#mRankList');
  box.style.opacity = '0';
  setTimeout(() => {
    rankDim = (rankDim + 1) % RANK_DIMS.length;
    paintRank();
    box.style.opacity = '1';
  }, 220);
}, 5000);

// 顶部汇总
let firstPaint = true;

function renderKpi(table) {
  const val = (n) => table.total[table.columns.indexOf(n)] || 0;
  const map = { instock: val('入库数'), contact: val('联系客户数'), follow: val('跟进记录数'), calls: val('通话次数'), calltime: val('通话时长'), share: val('共享客户数') };
  document.querySelectorAll('[data-kpi]').forEach((el) => {
    el.textContent = (map[el.dataset.kpi] || 0).toLocaleString('zh-CN');
  });
  firstPaint = false;
}

// 四大板块表格：总体 → 分组 → 个人 → 平均，横向滚动看全部指标
function renderTable(t) {
  // 平均行固定保留 1 位小数，与桌面版口径一致
  const fmt = (v, oneDecimal) => (oneDecimal
    ? Number(v).toFixed(1)
    : Number(v).toLocaleString('zh-CN'));

  const cells = (values, marks, oneDecimal) => values.map((v, i) => {
    const mk = marks && marks[i] ? ` class="cell-${marks[i]}"` : '';
    return `<td${mk}>${fmt(v, oneDecimal)}</td>`;
  }).join('');

  const head = `<thead><tr><th>项目</th>${t.columns.map((c) => `<th>${c}</th>`).join('')}</tr></thead>`;
  const span = t.columns.length + 1;
  const section = (no, title) => `<tr class="m-section"><td colspan="${span}">${no} ${title}</td></tr>`;

  const totalRow = `<tr class="m-total"><td>全部合计</td>${cells(t.total)}</tr>`;
  const groupRows = t.group_rows.map((r) => `<tr><td>${r.group}</td>${cells(r.values)}</tr>`).join('');
  const personRows = t.persons.map((p) => `<tr><td>${p.name}</td>${cells(p.values, p.marks)}</tr>`).join('');
  const avgRow = `<tr class="m-avg"><td>全员平均</td>${cells(t.average, null, true)}</tr>`;

  $('#mTable').innerHTML = head
    + `<tbody>${section('01', '总体数据')}${totalRow}</tbody>`
    + `<tbody>${section('02', '分组数据')}${groupRows}</tbody>`
    + `<tbody>${section('03', '个人数据')}${personRows}</tbody>`
    + `<tbody>${section('04', '平均数据')}${avgRow}</tbody>`;
}

function render(data) {
  // 数据文件被删除时显示空状态，重新上传后自动恢复
  const mask = document.getElementById('emptyMask');
  if (data.empty) {
    mask.hidden = false;
    return;
  }
  mask.hidden = true;

  $('#mPeriod').textContent = `统计期 ${data.period}`;
  $('#mPeople').textContent = data.table.count;
  renderKpi(data.table);
  rankData = data.activity_rank || [];
  paintRank();
  renderTable(data.table);
  charts.mFunnel.setOption(funnelOption(data.funnel));
  charts.mChannel.setOption(channelOption((data.channels || []).slice(0, 6)));
  charts.mCompare.setOption(compareOption(data.compare));
  charts.mRadar.setOption(radarOption(data.radar));
}

['mFunnel', 'mChannel', 'mCompare', 'mRadar'].forEach((id) => {
  charts[id] = echarts.init(document.getElementById(id));
});

window.addEventListener('resize', () => Object.values(charts).forEach((c) => c.resize()));

const sampleData = JSON.parse(document.getElementById('previewData').textContent);
render(sampleData);
