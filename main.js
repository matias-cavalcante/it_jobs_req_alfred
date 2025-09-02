let donutChart, timelineChart;
let historyData = null;
let currentView = 'overview';
let currentCategory = null;

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
    const distinctColors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA5A5', '#779ECB',
        '#AEC6CF', '#836953', '#CFCFC4', '#77DD77', '#FFB347',
        '#B19CD9', '#FF6961', '#CB99C9', '#FDFD96', '#87CEEB',
        '#F49AC2', '#FFD700', '#C23B22', '#6A5ACD', '#50C878'
    ];
    
    if (n <= distinctColors.length) {
        return distinctColors.slice(0, n);
    }
    
    const goldenRatioConjugate = 0.618033988749895;
    const colors = distinctColors.slice();
    let hue = Math.random();
    
    for (let i = distinctColors.length; i < n; i++) {
        hue = (hue + goldenRatioConjugate) % 1;
        colors.push(`hsl(${Math.round(hue * 360)}, 75%, 60%)`);
    }
    
    return colors;
}

function updateLegend(labels, colors) {
    const legendContainer = document.getElementById('donutLegend');
    legendContainer.innerHTML = '';
    
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
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${ctx.parsed}`
                    }
                }
            }
        }
    });
}

// Tab activation function
function activateTab(tabId) {
    // Remove active style from all tabs
    document.querySelectorAll('[id^="tab-"]').forEach(tab => {
        tab.classList.remove('bg-white', 'bg-opacity-15', 'text-white', 'shadow-sm');
        tab.classList.add('text-gray-300');
    });
    
    // Add active style to clicked tab
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.classList.add('bg-white', 'bg-opacity-15', 'text-white', 'shadow-sm');
        activeTab.classList.remove('text-gray-300');
    }
}

// Show technologies within a category
function showCategory(categoryKey) {
    currentView = 'detail';
    currentCategory = categoryKey;
    
    if (!historyData?.categories[categoryKey]) {
        console.error('Category not found:', categoryKey);
        return;
    }

    const technologies = historyData.categories[categoryKey];
    const datasets = technologies.map(tech => {
        return {
            label: tech,
            data: historyData.series[tech] || [],
            fill: false,
            fill: false,
            tension: 0.2,
            borderWidth: 1.5,
            pointRadius: 0,
            borderColor: `hsl(${Math.random() * 360}, 75%, 60%)`,
            borderCapStyle: 'round',
            borderJoinStyle: 'round'
        };
    });


    // Destroy and recreate chart
    if (timelineChart) {
        timelineChart.destroy();
    }

    timelineChart = new Chart(document.getElementById('timeline').getContext('2d'), {
        type: 'line',
        data: {
            labels: historyData.dates,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio:2.5,
            interaction: { mode: 'nearest', intersect: false },
            plugins: {
                legend: { 
                    display: true, 
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 8,
                        boxHeight: 8,
                        padding: 15,
                        font: { size: 12 }
                    }
                }
            },
            scales: {
                x: { 
                    title: { display: true, text: "Total days counted" },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: { 
                    title: { display: true, text: "Mentions per day" }, 
                    beginAtZero: true,
                    suggestedMax: 12,
                    ticks: { precision: 0 },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Show all categories overview
function showAllCategories() {
    currentView = 'overview';
    currentCategory = null;
    activateTab('tab-all');
    drawTimeline();
}

function drawTimeline() {
    if (!historyData) return;

    const { dates: labels } = historyData;
    const datasets = Object.entries(historyData.categories).map(([categoryName, techs]) => {
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
            borderWidth: 1.5,
            pointRadius: 0,
            borderColor: `hsl(${Math.random() * 360}, 75%, 60%)`,
            borderCapStyle: 'round',
            borderJoinStyle: 'round'
        };
    });

    if (timelineChart) {
        timelineChart.destroy();
    }

    timelineChart = new Chart(document.getElementById('timeline').getContext('2d'), {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio:2.5,
            interaction: { mode: 'nearest', intersect: false },
            plugins: {
                legend: { 
                    display: true, 
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 8,
                        boxHeight: 8,
                        padding: 15,
                        font: { size: 12 }
                    }
                }
            },
            scales: {
                x: { 
                    title: { display: true, text: "Total days counted" },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: { 
                    title: { display: true, text: "Mentions per day" }, 
                    beginAtZero: true,
                    suggestedMax: 12,
                    ticks: { precision: 0 },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

function showApproxLastUpdated() {
    const now = new Date();
    const update = new Date();
    update.setUTCHours(8, 10, 0, 0);

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
        topNValue.textContent = n;
        const { labels, values } = toSortedArrays(latest.counts, n);
        renderCharts(labels, values);
    };

    topNInput.addEventListener('input', render);
    render();
    drawTimeline();

    // Add tab click handlers after everything is loaded
    setTimeout(() => {
        // All categories tab
        document.getElementById('tab-all')?.addEventListener('click', showAllCategories);
        
        // Individual category tabs - use your actual JSON category keys
        document.getElementById('tab-web/js')?.addEventListener('click', () => {
            activateTab('tab-web/js');
            showCategory('Web/JS');
        });

         document.getElementById('tab-backend')?.addEventListener('click', () => {
            activateTab('tab-backend');
            showCategory('Backend');
        });
         document.getElementById('tab-databases')?.addEventListener('click', () => {
            activateTab('tab-databases');
            showCategory('Databases');
        });
         document.getElementById('tab-devops/cloud')?.addEventListener('click', () => {
            activateTab('tab-devops/cloud');
            showCategory('DevOps/Cloud');
        });
          document.getElementById('tab-bitools')?.addEventListener('click', () => {
            activateTab('tab-bitools');
            showCategory('BI Tools');
        });
        document.getElementById('tab-design')?.addEventListener('click', () => {
            activateTab('tab-design');
            showCategory('Design'); //Fails
        });
        document.getElementById('tab-netsec')?.addEventListener('click', () => {
            activateTab('tab-netsec');
            showCategory('Net/Sec'); //Fails cause number of results is 0?
        });
        document.getElementById('tab-front')?.addEventListener('click', () => {
            activateTab('tab-front');
            showCategory('Front Tools'); //Fails cause number of results is 0?
        });
        
        // Add more category handlers as needed...
        
    }, 1000);
}

boot();