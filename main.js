let donutChart, barChart;
let historyData = null;

async function loadHistory() {
  try {
    const res = await fetch('history.json', { cache: 'no-store' });
    if (!res.ok) throw new Error("Can't fetch history.json");
    historyData = await res.json();
  } catch (e) {
    console.error(e);
    historyData = null;
  }
}

function getLatestDay() {
  if (!historyData || !historyData.dates || historyData.dates.length === 0) return null;
  const len = historyData.dates.length;
  return {
    counts: Object.fromEntries(
      Object.entries(historyData.series).map(([tech, values]) => [tech, values[len - 1]])
    )
  };
}

function toSortedArrays(obj, topN) {
  const entries = Object.entries(obj)
    .filter(([_, v]) => Number.isFinite(v) && v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
  return {
    labels: entries.map(e => e[0]),
    values: entries.map(e => e[1])
  };
}

function palette(n) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    const hue = Math.round((360 / Math.max(1, n)) * i);
    arr.push(`hsl(${hue} 70% 55%)`);
  }
  return arr;
}

function renderCharts(labels, values) {
  const colors = palette(values.length);
  if (donutChart) donutChart.destroy();
  if (barChart) barChart.destroy();

  const donutCtx = document.getElementById('donutChart');
  donutChart = new Chart(donutCtx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }]
    },
    options: {
      cutout: '60%',
      plugins: {
        legend: { position: 'right' },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.parsed}`
          }
        }
      }
    }
  });

  const barCtx = document.getElementById('barChart');
  barChart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Count', data: values }]
    },
    options: {
      indexAxis: 'y',
      scales: {
        x: { beginAtZero: true, ticks: { precision: 0 } }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.parsed.x}`
          }
        }
      }
    }
  });
}

function drawTimeline() {
  if (!historyData) return;

  const labels = historyData.dates;
  const series = historyData.series;

  const datasets = Object.entries(series).map(([name, points]) => ({
    label: name,
    data: points,
    fill: false,
    tension: 0.2
  }));

  const ctx = document.getElementById('timeline').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        title: { display: true, text: "Technology demand over time" },
        legend: { display: true, position: 'bottom' }
      },
      scales: {
        x: { title: { display: true, text: "Date" } },
        y: { title: { display: true, text: "Mentions per day" }, beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}

function showApproxLastUpdated() {
  const now = new Date();
  const update = new Date();
  update.setUTCHours(8, 10, 0, 0); // 08:10 UTC today

  if (now < update) {
    update.setUTCDate(update.getUTCDate() - 1);
  }

  const diffMs = now - update;
  const diffHrs = Math.floor(diffMs / 3600000);

  document.getElementById("lastUpdated").textContent = `Updated about ${diffHrs} hour${diffHrs !== 1 ? 's' : ''} ago`;
}

async function boot() {
  const topNInput = document.getElementById('topN');
  const reloadBtn = document.getElementById('reload');

  await loadHistory();
  const latest = getLatestDay();
  if (!latest) return;

  showApproxLastUpdated();

  const render = () => {
    const n = Math.max(3, Math.min(30, parseInt(topNInput.value || '15', 10)));
    const { labels, values } = toSortedArrays(latest.counts, n);
    renderCharts(labels, values);
  };

  reloadBtn.addEventListener('click', render);
  topNInput.addEventListener('change', render);

  render();
  drawTimeline();
}

boot();
