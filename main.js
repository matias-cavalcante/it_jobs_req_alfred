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

// Update legend function
function updateLegend(labels, colors) {
    const legendContainer = document.getElementById('donutLegend');
    legendContainer.innerHTML = ''; // Clear previous legend
    
    labels.forEach((label, index) => {
        const legendItem = document.createElement('div');
        legendItem.className = 'flex items-center gap-1';
        
        legendItem.innerHTML = `
            <span class="w-2 h-2 rounded-full" style="background-color: ${colors[index]}"></span>
            <span class="text-sm">${label}</span>
             
        `;
        
        legendContainer.appendChild(legendItem);
    });
}




function renderCharts(labels, values) {
    const colors = palette(values.length);
    
    // Update the legend
    updateLegend(labels, colors);
    
    donutChart?.destroy();
    
    donutChart = new Chart(document.getElementById('donutChart'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{ 
                data: values, 
                backgroundColor: colors, 
                borderWidth: 0 
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: { display: false }, // Built-in legend disabled
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${ctx.parsed}`
                    }
                }
            }
        }
    });
}

function drawTimeline() {
    if (!historyData) return;

    const { dates: labels, series } = historyData;

    const datasets = Object.entries(historyData.categories).map(([categoryName, techs]) => {
    // Calculate category data for EACH day
    const categoryData = historyData.dates.map((_, dayIndex) => {
        let dailyTotal = 0;
        techs.forEach(tech => {
            if (historyData.series[tech] && historyData.series[tech][dayIndex]) {
                dailyTotal += historyData.series[tech][dayIndex];
            }
        });
        return dailyTotal;
    });
    
   return {
    label: categoryName,
    data: categoryData,
    fill: false,
    tension: 0.2,
    borderWidth: 1.5,  // Slightly thicker for better visibility
    pointRadius: 0,    // No points - cleaner look
    borderColor: `hsl(${Math.random() * 360}, 75%, 60%)`,  // Softer, more elegant colors
    // Minimal smoothness
    borderCapStyle: 'round',
    borderJoinStyle: 'round',
    cubicInterpolationMode: 'default'
};
});

    new Chart(document.getElementById('timeline').getContext('2d'), {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            interaction: { mode: 'nearest', intersect: false },
            plugins: {
                legend: { display: true, position: 'bottom',
                    labels: {
                        usePointStyle: true, // ← This changes rectangles to circles
                        pointStyle: 'circle', // ← Explicitly set to circle
                         boxWidth: 6.5,    // ← Smaller circle size
                        boxHeight: 6.5,   // ← Smaller circle size
                        padding: 15 // ← Optional: add some spacing
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: "Total days counted" },
            grid: {
                        color: 'rgba(255, 255, 255, 0.1)' // Lighter grid lines for x-axis
                    }},
                y: { title: { display: true, text: "Mentions per day" }, beginAtZero: true,  suggestedMax:12,  ticks: { precision: 0 },
            grid: {
                        color: 'rgba(255, 255, 255, 0.1)' // Lighter grid lines for x-axis
                    } }, 
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

    render(); // initial render
    drawTimeline(); // render line chart
}

boot();