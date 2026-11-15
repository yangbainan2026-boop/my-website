
// 数据时间显示成「月-日 时:分」

/* 综合分析看板：上半综合分析，下半分组人员量化 */

const $ = (s) => document.querySelector(s);
const charts = {};

function fitScreen() {
  const el = $('#screen');
  const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  el.style.transform = `translate(${(window.innerWidth - 1920 * scale) / 2}px, ${(window.innerHeight - 1080 * scale) / 2}px) scale(${scale})`;
}
fitScreen();
window.addEventListener('resize', () => {
  fitScreen();
  Object.values(charts).forEach((c) => c.resize());
});

// 两套配色：深色（默认，保持不变）与浅色（品牌蓝）。图表颜色统一从这里取
const LIGHT = !!window.EC_LIGHT;
const T = LIGHT
  ? { cyan: '#0FA8C4', blue: '#2F7BE0', yellow: '#2F5FC4', orange: '#1E2F92', purple: '#5FD4E8', text: '#5C7FA8', light: '#1E3A6E', grid: 'rgba(47,107,208,.12)' }
  : { cyan: '#00e5d0', blue: '#2f9bff', yellow: '#ffd54a', orange: '#ff9f6b', purple: '#7b6bff', text: '#8fb8d8', light: '#dff4ff', grid: 'rgba(72,150,230,.16)' };

// 只有图表里那些零散的硬编码色需要按主题分两套
const C = LIGHT
  ? {
    axis: 'rgba(47,107,208,.35)', axisLabel: '#6B8CB8',
    tipBg: 'rgba(255,255,255,.98)', tipBorder: 'rgba(47,107,208,.35)', tipText: '#1E3A6E',
    tipShadow: '0 6px 20px rgba(31,58,120,.18)',
    barBottom: ['#0B7FA0', '#1E3A8C'],
    radarLine: 'rgba(47,107,208,.20)', radarArea: ['rgba(255,255,255,0)', 'rgba(47,107,208,.05)'],
    radarAxis: 'rgba(47,107,208,.28)',
    radarFill: ['rgba(15,168,196,.18)', 'rgba(47,95,196,.14)'],
    funnelColors: ['#1E2F92', '#2A4CB8', '#2F6BD8', '#1B7FC0', '#1287A8'],
    funnelLabel: '#FFFFFF', funnelBorder: '#FFFFFF',
    channelFrom: '#1E3A8C', channelTo: '#12B8CE',
  }
  : {
    axis: 'rgba(72,150,230,.40)', axisLabel: '#6d96bd',
    tipBg: 'rgba(8,20,48,.94)', tipBorder: 'rgba(0,229,208,.45)', tipText: '#dff4ff',
    tipShadow: '0 0 18px rgba(0,180,220,.25)',
    barBottom: ['#0066c8', '#a86a10'],
    radarLine: 'rgba(72,150,230,.20)', radarArea: ['rgba(0,120,200,.04)', 'rgba(0,120,200,.10)'],
    radarAxis: 'rgba(72,150,230,.28)',
    radarFill: ['rgba(0,229,208,.18)', 'rgba(255,213,74,.14)'],
    funnelColors: ['#00e5d0', '#38d0ff', '#2f9bff', '#7b6bff', '#ff9f6b'],
    funnelLabel: '#04162c', funnelBorder: '#0a1636',
    channelFrom: '#0057b8', channelTo: '#00e5d0',
  };

const TIP = {
  backgroundColor: C.tipBg, borderColor: C.tipBorder, borderWidth: 1,
  textStyle: { color: C.tipText, fontSize: 12 },
  extraCssText: `box-shadow:${C.tipShadow};`,
};

function compareOption(d) {
  return {
    tooltip: Object.assign({ trigger: 'axis', axisPointer: { type: 'shadow' } }, TIP),
    legend: { data: d.series.map((s) => s.name), top: 4, right: 8, itemWidth: 10, itemHeight: 7, textStyle: { color: T.text, fontSize: 10 } },
    grid: { left: 46, right: 12, top: 40, bottom: 40 },
    xAxis: { type: 'category', data: d.items, axisLine: { lineStyle: { color: C.axis } }, axisTick: { show: false }, axisLabel: { color: T.text, fontSize: 10, interval: 0, rotate: 20 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: T.grid } }, axisLabel: { color: C.axisLabel, fontSize: 10 } },
    series: d.series.map((s, i) => ({
      name: s.name, type: 'bar', barMaxWidth: 16, data: s.values,
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: i === 0 ? T.cyan : T.yellow },
          { offset: 1, color: C.barBottom[i] },
        ]),
      },
      // 柱顶直接标数值，两组用各自颜色
      label: {
        show: true, position: 'top', fontSize: 9,
        color: i === 0 ? T.cyan : T.yellow,
        formatter: (p) => p.value.toLocaleString(),
      },
    })),
  };
}

function radarOption(d) {
  return {
    tooltip: Object.assign({ trigger: 'item' }, TIP),
    legend: { data: d.series.map((s) => s.name), top: 4, right: 8, itemWidth: 10, itemHeight: 7, textStyle: { color: T.text, fontSize: 10 } },
    radar: {
      indicator: d.indicators, center: ['50%', '56%'], radius: '62%', splitNumber: 4,
      axisName: { color: T.text, fontSize: 9 },
      splitLine: { lineStyle: { color: C.radarLine } },
      splitArea: { areaStyle: { color: C.radarArea } },
      axisLine: { lineStyle: { color: C.radarAxis } },
    },
    series: [{
      type: 'radar', symbolSize: 3,
      data: d.series.map((s, i) => ({
        name: s.name, value: s.values,
        lineStyle: { width: 2, color: i === 0 ? T.cyan : T.yellow, shadowBlur: 8, shadowColor: i === 0 ? T.cyan : T.yellow },
        itemStyle: { color: i === 0 ? T.cyan : T.yellow },
        areaStyle: { color: C.radarFill[i] },
      })),
    }],
  };
}

function funnelOption(d) {
  const colors = C.funnelColors;
  return {
    tooltip: Object.assign({ trigger: 'item', formatter: '{b}: {c}' }, TIP),
    series: [{
      type: 'funnel', left: '8%', top: 8, bottom: 8, width: '84%',
      minSize: '26%', maxSize: '100%', sort: 'descending', gap: 3,
      label: { show: true, position: 'inside', color: C.funnelLabel, fontSize: 10, formatter: '{b} {c}' },
      itemStyle: { borderColor: C.funnelBorder, borderWidth: 2 },
      data: d.map((x, i) => ({ name: x.name, value: x.value, itemStyle: { color: colors[i % colors.length] } })),
    }],
  };
}

function channelOption(d) {
  return {
    grid: { left: 106, right: 76, top: 6, bottom: 6 },
    tooltip: Object.assign({ trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p) => `${p[0].name}<br/>${p[0].value} 人 · 占比 ${p[0].data.ratio}%` }, TIP),
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', data: d.map((x) => x.name).reverse(), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: T.text, fontSize: 10, width: 100, overflow: 'truncate' } },
    series: [{
      type: 'bar', barWidth: 9,
      data: d.map((x) => ({ value: x.value, ratio: x.ratio })).reverse(),
      itemStyle: { borderRadius: [0, 5, 5, 0], color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: C.channelFrom }, { offset: 1, color: C.channelTo }]) },
      label: { show: true, position: 'right', color: T.yellow, fontSize: 10, formatter: (p) => `${p.value} · ${p.data.ratio}%` },
    }],
  };
}

// 四板块表格：总体 / 平均 / 分组 / 个人，逐列标最高（红）最低（绿）
function renderTable4(t) {
  const cols = t.columns;
  const span = cols.length + 2;

  const head = '<tr><th>组别</th><th>成员</th>' + cols.map((c) => `<th>${c}</th>`).join('') + '</tr>';

  const cells = (arr, marks) => arr.map((v, i) => {
    const m = marks ? marks[i] : '';
    return `<td class="${m ? 'cell-' + m : ''}">${v}</td>`;
  }).join('');

  const section = (no, name, note) =>
    `<tr class="ec4-section"><td colspan="${span}"><b>${no}</b>${name}<span>${note}</span></td></tr>`;

  // 01 总体 / 02 平均：单行汇总，不参与标注
  const totalRow = `<tr class="ec4-total"><td class="ec4-label" colspan="2">全部合计</td>${cells(t.total)}</tr>`;
  const avgRow = `<tr class="ec4-avg"><td class="ec4-label" colspan="2">全员平均</td>${cells(t.average)}</tr>`;

  // 03 分组：两组合计，不做最高/最低填充
  const groupRows = t.group_rows.map((r) =>
    `<tr><td class="ec4-group">${r.group}</td><td class="ec4-name">${r.name}</td>${cells(r.values)}</tr>`
  ).join('');

  // 04 个人：逐人明细，同组组名合并
  const personRows = t.persons.map((r, i) => {
    const prev = t.persons[i - 1];
    const first = !prev || prev.group !== r.group;
    const gCell = first ? `<td class="ec4-group" rowspan="${t.persons.filter((x) => x.group === r.group).length}">${r.group}</td>` : '';
    return `<tr>${gCell}<td class="ec4-name">${r.name}</td>${cells(r.values, r.marks)}</tr>`;
  }).join('');

  // 平均数据放最后一块
  $('#ec4Table').innerHTML =
    `<thead>${head}</thead>` +
    `<tbody>${section('01', '总体数据', `全部 ${t.count} 人 · 17 项指标合计`) + totalRow}</tbody>` +
    `<tbody>${section('02', '分组数据', '两大组合计 · 组间逐列标红绿') + groupRows}</tbody>` +
    `<tbody>${section('03', '个人数据', `${t.count} 名成员明细 · 全表逐列标红绿`) + personRows}</tbody>` +
    `<tbody>${section('04', '平均数据', `全部 ${t.count} 人 · 每项平均，保留 1 位小数`) + avgRow}</tbody>`;
}

// 排名维度轮播：入库 → 联系 → 通话 → 共享，每 5 秒切一次
const RANK_DIMS = [
  { key: 'instock', title: '入库排名', label: '入库' },
  { key: 'contact', title: '联系排名', label: '联系' },
  { key: 'calls', title: '通话排名', label: '通话' },
  { key: 'share', title: '共享排名', label: '共享' },
];
let rankData = [];
let rankDim = 0;

// 按当前维度降序重排，行底进度条按该维度占最大值的比例
function activeDims() {
  // 区间模式下入库数为空，跳过该维度
  const list = RANK_DIMS.filter((d) => rankData.length && rankData[0][d.key] !== null && rankData[0][d.key] !== undefined);
  return list.length ? list : RANK_DIMS;
}

function paintRank() {
  const dims = activeDims();
  const dim = dims[rankDim % dims.length];
  const list = [...rankData].sort((a, b) => b[dim.key] - a[dim.key]);
  const max = Math.max(...list.map((x) => x[dim.key])) || 1;
  $('#rankTitle').textContent = dim.title;
  $('#rankList').innerHTML = list.map((r, i) => {
    const w = (r[dim.key] / max * 100).toFixed(1);
    return `<div class="rank-row" style="--w:${w}%" title="${r.name}（${r.group}）${dim.label} ${r[dim.key]}">
      <span class="rk-no">${i + 1}</span><span>${r.name}</span><span>${r.group}</span>
      <span>${r.instock}</span><span>${r.contact}</span><span>${r.calls}</span><span>${r.share}</span>
    </div>`;
  }).join('');
}

function renderRank(list) {
  rankData = list;
  paintRank();
}

// 每 5 秒切换下一个排名维度，切换时淡出淡入
setInterval(() => {
  if (!rankData.length) return;
  const box = $('#rankList');
  box.style.opacity = '0';
  setTimeout(() => {
    rankDim = (rankDim + 1) % activeDims().length;
    paintRank();
    box.style.opacity = '1';
  }, 220);
}, 5000);

// 顶部核心汇总：直接取四板块表格里的 17 项合计
function renderKpi(table) {
  const val = (n) => {
    const i = table.columns.indexOf(n);
    return i < 0 ? null : table.total[i];
  };
  const map = {
    instock: val('入库数'), contact: val('联系客户数'), follow: val('跟进记录数'),
    calls: val('通话次数'), calltime: val('通话时长'), share: val('共享客户数'),
  };
  const fmt = (v) => Math.round(v).toLocaleString('zh-CN');
  document.querySelectorAll('.kpi-strip b').forEach((el) => {
    const to = map[el.dataset.kpi];
    if (to === null || to === undefined) {   // 该指标在当前区间取不到
      el.textContent = '—';
      el.dataset.cur = 0;
      return;
    }
    const from = Number(el.dataset.cur || 0);
    el.dataset.cur = to;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / 1100, 1);
      el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(() => { el.textContent = fmt(to); }, 1220);
  });
}

function render(data) {
  // 数据文件被删除时先显示空状态，重新上传后下一次轮询会自动恢复
  const mask = document.getElementById('emptyMask');
  if (data.empty) {
    mask.hidden = false;
    return;
  }
  mask.hidden = true;

  $('#boardPeriod').textContent = data.period;
  renderKpi(data.table);
  renderTable4(data.table);
  renderRank(data.activity_rank);

  charts.bCompare.setOption(compareOption(data.compare));
  charts.bRadar.setOption(radarOption(data.radar));
  charts.bFunnel.setOption(funnelOption(data.funnel));
  charts.bChannel.setOption(channelOption(data.channels));
}

['bCompare', 'bRadar', 'bFunnel', 'bChannel'].forEach((id) => {
  charts[id] = echarts.init(document.getElementById(id));
});


const sampleData = JSON.parse(document.getElementById('previewData').textContent);
render(sampleData);
