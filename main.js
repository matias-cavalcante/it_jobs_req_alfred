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
  if (!historyData?.dates?.length) return null;
  const len = historyData.dates.length;
  return {
    counts: Object.fromEntries(
      Object.entries(historyData.series).map(([tech, values]) => [tech, values[len - 1]])
    )
  };
}

function toSortedArrays(obj, topN) {
  return Object.entries(obj)
    .filter(([, v]) => Number.isFinite(v) && v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .reduce((acc, [k, v]) => {
      acc.labels.push(k);
      acc.values.push(v);
      return acc;
    }, { labels: [], values: [] });
}

function palette(n) {
  return Array.from({ length: n }, (_, i) => `hsl(${Math.round(360 / Math.max(1, n) * i)} 70% 55%)`);
}

// Global chart defaults
Chart.defaults.color = '#fff';
Chart.defaults.plugins.legend.labels.color = '#fff';
Chart.defaults.plugins.tooltip.bodyColor = '#fff';
Chart.defaults.plugins.title.color = '#fff';
Chart.defaults.scales = {
  x: {
    ticks: { color: '#fff' },
    title: { color: '#fff' }
  },
  y: {
    ticks: { color: '#fff' },
    title: { color: '#fff' }
  }
};

function renderCharts(labels, values) {
  const colors = palette(values.length);
  donutChart?.destroy();
  barChart?.destroy();

donutChart = new Chart(document.getElementById('donutChart'), {
  type: 'doughnut',
  data: {
    labels,
    datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          padding: 20,   // space between legend items
        }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.parsed}`
        }
      }
    },
    layout: {
      padding: {
        right: 40   // extra space between donut and legend
      }
    }
  }
});

}

function drawTimeline() {
  if (!historyData) return;

  const { dates: labels, series } = historyData;

  const datasets = Object.entries(series).map(([label, data]) => ({
    label,
    data,
    fill: false,
    tension: 0.2
  }));

  new Chart(document.getElementById('timeline').getContext('2d'), {
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
  update.setUTCHours(8, 10, 0, 0); // expected update time (08:10 UTC)

  if (now < update) update.setUTCDate(update.getUTCDate() - 1);

  const diffHours = Math.floor((now - update) / 3600000);
  document.getElementById("lastUpdated").textContent =
    `Updated about ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
}

async function boot() {
  const topNInput = document.getElementById('topN');
  const topNValue = document.getElementById('topNValue');

  await loadHistory();
  const latest = getLatestDay();
  if (!latest) return;

  showApproxLastUpdated();

  const render = () => {
    const n = Math.max(3, Math.min(30, parseInt(topNInput.value || '5', 10)));
    topNValue.textContent = n; // update text next to slider
    const { labels, values } = toSortedArrays(latest.counts, n);
    renderCharts(labels, values);
  };

  topNInput.addEventListener('input', render); // slider updates live

  render();        // initial render
  drawTimeline();  // render line chart
}


boot();

