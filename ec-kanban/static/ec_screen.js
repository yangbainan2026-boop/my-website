
// 数据时间显示成「月-日 时:分」

/* 有你互动 EC 系统数据大屏：真实数据 + 深色数字化图表 */

const $ = (s) => document.querySelector(s);
const charts = {};

// 1920x1080 画布等比缩放并居中
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

// ===== 数字滚动 =====
function formatNum(v, fmt) {
  if (fmt === 'decimal') return Number(v).toFixed(2);
  return Math.round(v).toLocaleString('zh-CN');
}
function animateNum(el, to, fmt, duration = 1200) {
  const from = Number(el.dataset.current || 0);
  el.dataset.current = to;
  const start = performance.now();
  function frame(now) {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = formatNum(from + (to - from) * (1 - Math.pow(1 - p, 3)), fmt);
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // 兜底：标签页切后台或 rAF 被节流时，保证最终值一定落位
  setTimeout(() => { el.textContent = formatNum(to, fmt); }, duration + 120);
}

// ===== 顶部时钟与图标切换 =====
function tickClock() {
  const d = new Date();
  $('#screenClock').textContent = d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour12: false });
}
tickClock();
setInterval(tickClock, 1000);

const ICONS = [
  '<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
  '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M8 10h8M8 14h5"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4c0 1-1 2-2 2A16 16 0 0 1 3 6c0-1 1-2 2-2z"/></svg>',
  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></svg>',
];
let iconStep = 0;
function switchIcons() {
  document.querySelectorAll('.kpi-icon').forEach((box, i) => {
    box.innerHTML = ICONS[(iconStep + i) % ICONS.length];
  });
  iconStep += 1;
}
switchIcons();
setInterval(switchIcons, 4000);

// ===== 员工明细无缝轮播（悬停暂停） =====
function makeScroll(id, speed) {
  const box = document.getElementById(id);
  let timer = null;
  function start() {
    if (timer) return;
    timer = setInterval(() => {
      if (box.scrollHeight > box.clientHeight) {
        box.scrollTop += 1;
        if (box.scrollTop >= box.scrollHeight / 2) box.scrollTop = 0;
      }
    }, speed);
  }
  function stop() { clearInterval(timer); timer = null; }
  box.addEventListener('mouseenter', stop);
  box.addEventListener('mouseleave', start);
  start();
}
makeScroll('staffScroll', 42);

// ===== 深色图表配色 =====
const T = { cyan: '#00e5d0', blue: '#2f9bff', yellow: '#ffd54a', orange: '#ff9f6b', purple: '#7b6bff', text: '#8fb8d8', light: '#dff4ff', grid: 'rgba(72,150,230,.16)' };
const TIP = {
  backgroundColor: 'rgba(8,20,48,.94)', borderColor: 'rgba(0,229,208,.45)', borderWidth: 1,
  textStyle: { color: '#dff4ff', fontSize: 12 },
  extraCssText: 'box-shadow:0 0 18px rgba(0,180,220,.25);',
};

function compareOption(d) {
  return {
    tooltip: Object.assign({ trigger: 'axis', axisPointer: { type: 'shadow' } }, TIP),
    legend: { data: d.series.map((s) => s.name), top: 6, right: 12, itemWidth: 12, itemHeight: 8, textStyle: { color: T.text, fontSize: 11 } },
    grid: { left: 52, right: 16, top: 38, bottom: 46 },
    xAxis: { type: 'category', data: d.items, axisLine: { lineStyle: { color: 'rgba(72,150,230,.40)' } }, axisTick: { show: false }, axisLabel: { color: T.text, fontSize: 10, interval: 0, rotate: 18 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: T.grid } }, axisLabel: { color: '#6d96bd', fontSize: 10 } },
    series: d.series.map((s, i) => ({
      name: s.name, type: 'bar', barMaxWidth: 18, data: s.values,
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: i === 0 ? T.cyan : T.yellow },
          { offset: 1, color: i === 0 ? '#0066c8' : '#a86a10' },
        ]),
      },
    })),
  };
}

function topOption(d) {
  return {
    grid: { left: 62, right: 48, top: 10, bottom: 10 },
    tooltip: Object.assign({ trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: '{b}: {c} 人' }, TIP),
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', data: d.map((x) => x.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: T.text, fontSize: 11 } },
    series: [{
      type: 'bar', barWidth: 11, data: d.map((x) => x.value),
      itemStyle: { borderRadius: [0, 6, 6, 0], color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#0057b8' }, { offset: 1, color: T.cyan }]) },
      label: { show: true, position: 'right', color: T.cyan, fontSize: 10, formatter: (p) => p.value },
    }],
  };
}

function mixOption(d) {
  return {
    color: [T.cyan, T.blue, T.yellow, T.orange],
    tooltip: Object.assign({ trigger: 'item', formatter: '{b}<br/>{c} 次 ({d}%)' }, TIP),
    legend: { orient: 'vertical', right: 8, top: 'middle', itemWidth: 9, itemHeight: 9, itemGap: 10, textStyle: { color: T.text, fontSize: 11 } },
    series: [{
      type: 'pie', radius: ['45%', '70%'], center: ['34%', '52%'],
      itemStyle: { borderColor: '#0a1636', borderWidth: 2, borderRadius: 4 },
      label: { show: false },
      emphasis: { scale: true, scaleSize: 6, label: { show: true, color: T.light, fontSize: 11, formatter: '{b}\n{d}%' } },
      data: d,
    }],
  };
}

function radarOption(d) {
  return {
    tooltip: Object.assign({ trigger: 'item' }, TIP),
    legend: { data: d.series.map((s) => s.name), top: 6, right: 16, itemWidth: 12, itemHeight: 8, textStyle: { color: T.text, fontSize: 11 } },
    radar: {
      indicator: d.indicators, center: ['50%', '54%'], radius: '64%', splitNumber: 4,
      axisName: { color: T.text, fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(72,150,230,.20)' } },
      splitArea: { areaStyle: { color: ['rgba(0,120,200,.04)', 'rgba(0,120,200,.10)'] } },
      axisLine: { lineStyle: { color: 'rgba(72,150,230,.28)' } },
    },
    series: [{
      type: 'radar', symbolSize: 4,
      data: d.series.map((s, i) => ({
        name: s.name, value: s.values,
        lineStyle: { width: 2, color: i === 0 ? T.cyan : T.yellow, shadowBlur: 8, shadowColor: i === 0 ? T.cyan : T.yellow },
        itemStyle: { color: i === 0 ? T.cyan : T.yellow },
        areaStyle: { color: i === 0 ? 'rgba(0,229,208,.18)' : 'rgba(255,213,74,.15)' },
      })),
    }],
  };
}

function activityOption(d) {
  return {
    tooltip: Object.assign({ trigger: 'axis', axisPointer: { type: 'cross' } }, TIP),
    legend: { data: ['联系客户数', '通话次数'], top: 6, right: 16, itemWidth: 12, itemHeight: 8, textStyle: { color: T.text, fontSize: 11 } },
    grid: { left: 46, right: 46, top: 36, bottom: 56 },
    xAxis: { type: 'category', data: d.names, axisLine: { lineStyle: { color: 'rgba(72,150,230,.40)' } }, axisTick: { show: false }, axisLabel: { color: T.text, fontSize: 10, interval: 0, rotate: 38 } },
    yAxis: [
      { type: 'value', splitLine: { lineStyle: { color: T.grid } }, axisLabel: { color: '#6d96bd', fontSize: 10 } },
      { type: 'value', splitLine: { show: false }, axisLabel: { color: '#6d96bd', fontSize: 10 } },
    ],
    series: [
      { name: '联系客户数', type: 'bar', barMaxWidth: 16, data: d.contact, itemStyle: { borderRadius: [4, 4, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: T.cyan }, { offset: 1, color: '#0066c8' }]) } },
      { name: '通话次数', type: 'line', yAxisIndex: 1, smooth: true, data: d.calls, symbol: 'circle', symbolSize: 6, lineStyle: { width: 2.5, color: T.yellow, shadowBlur: 8, shadowColor: 'rgba(255,213,74,.5)' }, itemStyle: { color: T.yellow, borderColor: '#0a1636', borderWidth: 1 } },
    ],
  };
}

function funnelOption(d) {
  const colors = [T.cyan, '#38d0ff', T.blue, T.purple, T.orange];
  return {
    tooltip: Object.assign({ trigger: 'item', formatter: '{b}: {c}' }, TIP),
    series: [{
      type: 'funnel', left: '10%', top: 10, bottom: 10, width: '80%',
      minSize: '24%', maxSize: '100%', sort: 'descending', gap: 3,
      label: { show: true, position: 'inside', color: '#04162c', fontSize: 11, formatter: '{b}  {c}' },
      itemStyle: { borderColor: '#0a1636', borderWidth: 2 },
      data: d.map((x, i) => ({ name: x.name, value: x.value, itemStyle: { color: colors[i % colors.length] } })),
    }],
  };
}

function shareOption(d) {
  return {
    color: [T.cyan, T.yellow],
    tooltip: Object.assign({ trigger: 'item', formatter: (p) => `${p.seriesName}<br/>${p.name}: ${p.value} (${p.d}%)` }, TIP),
    legend: { data: d.map((x) => x.name), bottom: 4, itemWidth: 10, itemHeight: 8, textStyle: { color: T.text, fontSize: 11 } },
    series: [
      { name: '人数', type: 'pie', radius: ['18%', '36%'], center: ['50%', '45%'], label: { show: false }, itemStyle: { borderColor: '#0a1636', borderWidth: 2 }, data: d.map((x) => ({ name: x.name, value: x.people })) },
      { name: '通话次数', type: 'pie', radius: ['50%', '68%'], center: ['50%', '45%'], label: { show: true, color: T.light, fontSize: 10, formatter: '{b}\n{d}%' }, itemStyle: { borderColor: '#0a1636', borderWidth: 2, borderRadius: 4 }, data: d.map((x) => ({ name: x.name, value: x.calls })) },
    ],
  };
}

// ===== 数据渲染与定时刷新 =====
function render(data) {
  document.querySelectorAll('.kpi-num .num').forEach((el) => animateNum(el, data.kpi[el.dataset.key], el.dataset.fmt));
  $('#peopleInfo').textContent = data.groups.map((g) => `${g} ${data.people[g]} 人`).join(' / ');

  const html = data.staff.map((r) => {
    const cls = (k) => r.marks[k] ? 'cell-' + r.marks[k] : '';
    return `<div class="staff-row"><span>${r.name}</span><span>${r.group}</span><span class="${cls('instock')}">${r.instock}</span><span class="${cls('contact')}">${r.contact}</span><span class="${cls('calls')}">${r.calls}</span></div>`;
  }).join('');
  const top = $('#staffScroll').scrollTop;
  $('#staffList').innerHTML = html + html;
  $('#staffScroll').scrollTop = top;

  charts.compareChart.setOption(compareOption(data.compare));
  charts.topChart.setOption(topOption(data.top_instock));
  charts.mixChart.setOption(mixOption(data.contact_mix));
  charts.radarChart.setOption(radarOption(data.radar));
  charts.activityChart.setOption(activityOption(data.activity));
  charts.funnelChart.setOption(funnelOption(data.funnel));
  charts.shareChart.setOption(shareOption(data.group_share));
}

['compareChart', 'topChart', 'mixChart', 'radarChart', 'activityChart', 'funnelChart', 'shareChart'].forEach((id) => {
  charts[id] = echarts.init(document.getElementById(id));
});
// 追加：数据描述、各组名单、个人平均通话时长（不改动原 render）
function renderExtras(data) {
  $('#insightLines').innerHTML = data.insights.map((x) =>
    `<div class="insight-item ${x.highlight ? 'hl' : ''}">${x.text}</div>`
  ).join('');

  $('#groupRoster').innerHTML = data.groups.map((g) =>
    `<div class="roster-line"><b>${g} · ${data.people[g]} 人</b><span>${data.roster[g].join('、')}</span><em>单次通话均长 ${data.avg_duration.group_call[g]}</em></div>`
  ).join('');

  // 明细行悬停显示个人单次通话均长
  const rows = document.querySelectorAll('#staffList .staff-row');
  const n = data.staff.length;
  for (let i = 0; i < rows.length; i++) {
    const idx = i % n;
    rows[i].title = `${data.staff[idx].name} · 单次通话均长 ${data.avg_duration.staff_call[idx]}`;
  }

  // 入库渠道：全企业口径，逐个展示数值与占比
  const ch = data.channels;
  $('#channelNote').textContent = `${ch.note} · 统计期 ${data.period} · ${ch.count} 个有新增渠道 / 共 ${ch.total} 人 · 与基础指标表入库数口径不同`;
  $('#channelList').innerHTML = ch.items.map((x, i) =>
    `<div class="channel-item ${i < 3 ? 'top' : ''}" title="${x.name}：${x.value} 人，占比 ${x.ratio}%">
       <div class="ch-name">${x.name}</div>
       <div class="ch-data"><b>${x.value}</b><span>人</span><em>${x.ratio}%</em></div>
       <div class="ch-bar"><i style="width:${x.ratio}%"></i></div>
     </div>`
  ).join('');
}


const sampleData = JSON.parse(document.getElementById('previewData').textContent);
render(sampleData);
renderExtras(sampleData);
