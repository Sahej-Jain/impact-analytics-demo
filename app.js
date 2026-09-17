/* ============================================================
   BStackBank dashboard — dummy data + hand rolled SVG charts.
   No build step, no dependencies.
   ============================================================ */

const SVG_NS = 'http://www.w3.org/2000/svg';

/* ---------------------------- dummy data ---------------------------- */

const BALANCE_SERIES = {
  '6M': [
    { label: 'Jan', value: 45000 },
    { label: 'Feb', value: 48000 },
    { label: 'Mar', value: 46500 },
    { label: 'Apr', value: 52000 },
    { label: 'May', value: 55000 },
    { label: 'Jun', value: 58540 }
  ],
  '1Y': [
    { label: 'Jan', value: 45000 },
    { label: 'Feb', value: 48000 },
    { label: 'Mar', value: 46500 },
    { label: 'Apr', value: 52000 },
    { label: 'May', value: 55000 },
    { label: 'Jun', value: 58540 },
    { label: 'Jul', value: 57200 },
    { label: 'Aug', value: 59800 },
    { label: 'Sep', value: 61400 },
    { label: 'Oct', value: 60100 },
    { label: 'Nov', value: 63500 },
    { label: 'Dec', value: 66900 }
  ]
};

const TRANSACTIONS = [
  { name: 'Salary Deposit',    date: '2025-01-08', amount:  5500.00 },
  { name: 'Grocery Store',     date: '2025-01-07', amount:   -85.50 },
  { name: 'Electric Bill',     date: '2025-01-06', amount:  -120.00 },
  { name: 'Investment Return', date: '2025-01-05', amount:   450.00 },
  { name: 'Restaurant',        date: '2025-01-04', amount:   -75.25 }
];

const SPENDING = {
  month: [
    { name: 'Food',          value:  850, color: '#8884d8' },
    { name: 'Transport',     value:  420, color: '#82ca9d' },
    { name: 'Shopping',      value:  680, color: '#ffc658' },
    { name: 'Bills',         value: 1200, color: '#ff7300' },
    { name: 'Entertainment', value:  290, color: '#00c49f' }
  ],
  '30d': [
    { name: 'Food',          value:  910, color: '#8884d8' },
    { name: 'Transport',     value:  465, color: '#82ca9d' },
    { name: 'Shopping',      value:  735, color: '#ffc658' },
    { name: 'Bills',         value: 1200, color: '#ff7300' },
    { name: 'Entertainment', value:  340, color: '#00c49f' }
  ]
};

/* ---------------------------- helpers ---------------------------- */

const el = (tag, attrs = {}) => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

const money = n =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const tooltip = document.getElementById('tooltip');

function showTip(evt, html) {
  tooltip.innerHTML = html;
  tooltip.style.left = evt.clientX + 'px';
  tooltip.style.top = evt.clientY + 'px';
  tooltip.classList.add('show');
}
const hideTip = () => tooltip.classList.remove('show');

/* ---------------------------- area chart ---------------------------- */

function renderAreaChart(range) {
  const host = document.getElementById('areaChart');
  host.innerHTML = '';

  const data = BALANCE_SERIES[range];
  const W = 820, H = 300;
  const pad = { top: 16, right: 18, bottom: 32, left: 48 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  // y domain: 0 → next 15k step above the max
  const max = Math.max(...data.map(d => d.value));
  const step = 15000;
  const yMax = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= yMax; v += step) ticks.push(v);

  const x = i => pad.left + (data.length === 1 ? plotW / 2 : (plotW * i) / (data.length - 1));
  const y = v => pad.top + plotH - (v / yMax) * plotH;

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none' });

  // gradient
  const defs = el('defs');
  const grad = el('linearGradient', { id: 'balanceGradient', x1: '0', y1: '0', x2: '0', y2: '1' });
  grad.appendChild(el('stop', { offset: '5%',  'stop-color': '#3b82f6', 'stop-opacity': '0.3' }));
  grad.appendChild(el('stop', { offset: '95%', 'stop-color': '#3b82f6', 'stop-opacity': '0.05' }));
  defs.appendChild(grad);
  svg.appendChild(defs);

  // horizontal grid + y labels
  ticks.forEach(v => {
    svg.appendChild(el('line', {
      class: 'grid-line', x1: pad.left, x2: W - pad.right, y1: y(v), y2: y(v)
    }));
    const t = el('text', {
      class: 'axis-label', x: pad.left - 10, y: y(v) + 4, 'text-anchor': 'end'
    });
    t.textContent = '$' + Math.round(v / 1000) + 'k';
    svg.appendChild(t);
  });

  // vertical grid + x labels
  data.forEach((d, i) => {
    svg.appendChild(el('line', {
      class: 'grid-line', x1: x(i), x2: x(i), y1: pad.top, y2: pad.top + plotH
    }));
    const t = el('text', {
      class: 'axis-label', x: x(i), y: H - 10, 'text-anchor': 'middle'
    });
    t.textContent = d.label;
    svg.appendChild(t);
  });

  // smooth path (Catmull-Rom → cubic bezier, matching the reference's curve)
  const pts = data.map((d, i) => [x(i), y(d.value)]);
  let line = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    line += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6}` +
            ` ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6}` +
            ` ${p2[0]},${p2[1]}`;
  }

  const baseY = pad.top + plotH;
  svg.appendChild(el('path', {
    class: 'area-fill',
    d: `${line} L${pts[pts.length - 1][0]},${baseY} L${pts[0][0]},${baseY} Z`,
    fill: 'url(#balanceGradient)'
  }));
  svg.appendChild(el('path', { class: 'area-line', d: line }));

  // dots + hover targets
  data.forEach((d, i) => {
    svg.appendChild(el('circle', { class: 'area-dot', cx: x(i), cy: y(d.value), r: 4 }));

    const hit = el('circle', { class: 'hit', cx: x(i), cy: y(d.value), r: 16 });
    hit.addEventListener('mousemove', e =>
      showTip(e, `${d.label} 2025<b>${money(d.value)}</b>`));
    hit.addEventListener('mouseleave', hideTip);
    svg.appendChild(hit);
  });

  host.appendChild(svg);
}

/* ---------------------------- transactions ---------------------------- */

function renderTransactions() {
  const list = document.getElementById('txList');
  list.innerHTML = '';

  TRANSACTIONS.forEach(tx => {
    const isIn = tx.amount > 0;
    const li = document.createElement('li');
    li.className = 'tx';
    li.innerHTML = `
      <div class="tx-icon ${isIn ? 'in' : 'out'}">
        <svg viewBox="0 0 24 24">
          ${isIn
            ? '<path d="M7 17L17 7"/><path d="M8 7h9v9"/>'
            : '<path d="M7 7l10 10"/><path d="M17 8v9H8"/>'}
        </svg>
      </div>
      <div class="tx-main">
        <div class="tx-name">${tx.name}</div>
        <div class="tx-date">${tx.date}</div>
      </div>
      <div class="tx-right">
        <div class="tx-amt ${isIn ? 'in' : 'out'}">
          ${isIn ? '+' : '-'}${money(Math.abs(tx.amount))}
        </div>
        <div class="tx-tag">${isIn ? 'Received' : 'Spent'}</div>
      </div>`;
    list.appendChild(li);
  });
}

/* ---------------------------- donut ---------------------------- */

function renderDonut(span) {
  const host = document.getElementById('donutChart');
  const list = document.getElementById('catList');
  host.innerHTML = '';
  list.innerHTML = '';

  const data = SPENDING[span];
  const total = data.reduce((s, d) => s + d.value, 0);

  const SIZE = 250, cx = SIZE / 2, cy = SIZE / 2;
  const rOuter = 100, rInner = 56;
  const GAP = 0.012; // radians of padding between slices

  const svg = el('svg', { viewBox: `0 0 ${SIZE} ${SIZE}` });

  // start at 12 o'clock and sweep clockwise
  let angle = -Math.PI / 2;

  data.forEach(d => {
    const sweep = (d.value / total) * Math.PI * 2;
    const a0 = angle + GAP / 2;
    const a1 = angle + sweep - GAP / 2;
    angle += sweep;

    const pt = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    const [x0, y0] = pt(rOuter, a0);
    const [x1, y1] = pt(rOuter, a1);
    const [x2, y2] = pt(rInner, a1);
    const [x3, y3] = pt(rInner, a0);
    const large = a1 - a0 > Math.PI ? 1 : 0;

    const path = el('path', {
      class: 'slice',
      fill: d.color,
      d: `M${x0},${y0} A${rOuter},${rOuter} 0 ${large} 1 ${x1},${y1}` +
         ` L${x2},${y2} A${rInner},${rInner} 0 ${large} 0 ${x3},${y3} Z`
    });

    const pct = ((d.value / total) * 100).toFixed(1);
    path.addEventListener('mousemove', e =>
      showTip(e, `${d.name}<b>$${d.value.toLocaleString()} · ${pct}%</b>`));
    path.addEventListener('mouseleave', hideTip);
    svg.appendChild(path);
  });

  host.appendChild(svg);

  // legend / category rows
  data.forEach(d => {
    const pct = ((d.value / total) * 100).toFixed(1);
    const li = document.createElement('li');
    li.className = 'cat';
    li.innerHTML = `
      <i style="background:${d.color}"></i>
      <span class="cat-name">${d.name}</span>
      <span class="cat-right">
        <span class="cat-amt">$${d.value.toLocaleString()}</span>
        <div class="cat-pct">${pct}%</div>
      </span>`;
    list.appendChild(li);
  });
}

/* ---------------------------- interactions ---------------------------- */

// sidebar collapse
document.getElementById('collapseBtn').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
});

// balance visibility toggle
let balanceVisible = true;
const eyeToggle = document.getElementById('eyeToggle');
const balanceValue = document.getElementById('balanceValue');

eyeToggle.addEventListener('click', () => {
  balanceVisible = !balanceVisible;
  balanceValue.textContent = balanceVisible ? '$58,540.32' : '••••••••';
  eyeToggle.querySelector('span').textContent = balanceVisible ? 'Visible' : 'Hidden';
  eyeToggle.querySelector('svg').innerHTML = balanceVisible
    ? '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>'
    : '<path d="M3 3l18 18"/><path d="M10.6 5.2A10 10 0 0112 5c6.4 0 10 7 10 7a18 18 0 01-2.5 3.4"/>' +
      '<path d="M6.2 6.7A18 18 0 002 12s3.6 7 10 7a10 10 0 003.7-.7"/>';
});

// chart range toggle
document.getElementById('rangeToggle').addEventListener('click', e => {
  const btn = e.target.closest('button[data-range]');
  if (!btn) return;
  document.querySelectorAll('#rangeToggle button').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  renderAreaChart(btn.dataset.range);
});

// spending span toggle
document.getElementById('spendToggle').addEventListener('click', e => {
  const btn = e.target.closest('button[data-span]');
  if (!btn) return;
  document.querySelectorAll('#spendToggle button').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  renderDonut(btn.dataset.span);
});

// sidebar nav highlight (visual only — single page)
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.remove('active');
      const dot = n.querySelector('.nav-dot');
      if (dot) dot.remove();
    });
    item.classList.add('active');
    const dot = document.createElement('span');
    dot.className = 'nav-dot';
    item.appendChild(dot);
  });
});

/* ---------------------------- boot ---------------------------- */

renderAreaChart('1Y');
renderTransactions();
renderDonut('30d');
