import { createDataset, createTimelineChartLegend, createDonutChartLegend, updatePointSizes, toSortedArrays, palette, isMobileView, showApproxLastUpdated } from'./utilities.js';
// ===== GLOBAL STATE =====
const state = {
    donutChart: null,
    timelineChart: null,
    historyData: null,
    currentView: 'overview',
    currentCategory: null,
    isCurrentlyMobile: false,
    resizeTimeout: null
};

// ===== CHART CONFIGURATIONS =====
const chartConfig = {
    defaults: {
        color: '#fff',
        plugins: {
            legend: {
                labels: { color: '#fff' }
            },
            tooltip: {
                bodyColor: '#fff'
            },
            title: { color: '#fff' }
        },
        scales: {
            x: {
                ticks: { color: '#fff' },
                title: { color: '#fff' }
            },
            y: {
                ticks: { color: '#fff' },
                title: { color: '#fff' }
            }
        }
    },
    
    timeline: {
        type: 'line',
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 2.5,
            interaction: { mode: 'nearest', intersect: false },
            plugins: {
                legend: { 
                    display: false, 
                    position: 'bottom',
                    labels: {
                        usePointStyle: false,
                        pointStyle: 'circle',
                        boxWidth: 20,
                        boxHeight: 1,
                        padding: 15,
                        font: { size: 13.28 },
                        color: 'rgb(156, 163, 175)'
                    }
                }
            },
            scales: {
                x: { 
                    title: { display: true, text: "Total days counted", align: 'end' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: { 
                    title: { display: false }, 
                    beginAtZero: true,
                    min: 0,
                    suggestedMax: 12,
                    ticks: { precision: 0 },
                }
            }
        }
    },
    
    donut: {
        type: 'doughnut',
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
    }
};

// ===== DATA PROCESSING =====
async function loadHistory() {
    try {
        const res = await fetch('history.json', { cache: 'no-store' });
        if (!res.ok) throw new Error("Can't fetch history.json");
        const rawData = await res.json();
        
        state.historyData = processHistoryData(rawData);
        console.log("Data loaded and processed:", state.historyData);
    } catch (e) {
        console.error(e);
        state.historyData = null;
    }
}

function processHistoryData(rawData) {
    const dateKeys = Object.keys(rawData).filter(key => key !== 'categories');
    const allDates = dateKeys.sort();
    const allTechnologies = new Set();
    
    if (rawData.categories) {
        for (const categoryTechs of Object.values(rawData.categories)) {
            categoryTechs.forEach(tech => allTechnologies.add(tech));
        }
    }

    const series = {};
    allTechnologies.forEach(tech => {
        series[tech] = new Array(allDates.length).fill(0);
    });

    allDates.forEach((date, dateIndex) => {
        const daysJobs = rawData[date] || [];
        
        daysJobs.forEach(job => {
            Object.entries(job.technologies).forEach(([tech, count]) => {
                if (allTechnologies.has(tech)) {
                    series[tech][dateIndex] += count;
                }
            });
        });
    });

    return {
        dates: allDates,
        series: series,
        categories: rawData.categories
    };
}

function getLatestDay() {
    if (!state.historyData?.dates?.length) return null;
    const lastDayIndex = state.historyData.dates.length - 1;
    
    const categoryCounts = {};
    for (const [categoryName, techs] of Object.entries(state.historyData.categories)) {
        let dailyTotal = 0;
        techs.forEach(tech => {
            dailyTotal += state.historyData.series[tech][lastDayIndex];
        });
        
        if (dailyTotal > 0) {
            categoryCounts[categoryName] = dailyTotal;
        }
    }
    
    return { counts: categoryCounts };
}

// ===== CHART MANAGEMENT =====
function updateDonutLegend(labels, colors) {
    createDonutChartLegend(labels, colors);
   
}

function renderDonutChart(labels, values) {
    const containerElement = document.getElementById('donutContainer');
    const chartElement = document.getElementById('donutChart');
    
    const messageDivs = containerElement.querySelectorAll('div:not(#donutChart)');
    messageDivs.forEach(div => div.remove());
    
    if (chartElement) {
        chartElement.style.display = 'block';
    } else {
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'donutChart';
        newCanvas.className = 'w-full h-full';
        containerElement.appendChild(newCanvas);
    }
    
    const colors = palette(values.length);
    updateDonutLegend(labels, colors);
    
    state.donutChart?.destroy();
    
    state.donutChart = new Chart(document.getElementById('donutChart'), {
        type: chartConfig.donut.type,
        data: {
            labels,
            datasets: [{ 
                data: values, 
                backgroundColor: colors, 
                borderWidth: 0,
            }]
        },
        options: chartConfig.donut.options
    });
}

function createTimelineChart(labels, datasets) {
    if (state.timelineChart) {
        state.timelineChart.destroy();
    }

    state.timelineChart = new Chart(document.getElementById('timeline').getContext('2d'), {
        type: chartConfig.timeline.type,
        data: { labels, datasets },
        options: chartConfig.timeline.options
    });
    
    state.isCurrentlyMobile = null; 
    updatePointSizes(state.timelineChart, isMobileView, state);
     createTimelineChartLegend(state.timelineChart);
}

// ===== VIEW MANAGEMENT =====
function activateTab(tabId) {
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.classList.add('active');
    }
}

function showCategory(categoryKey) {
    state.currentView = 'detail';
    state.currentCategory = categoryKey;
    
    if (!state.historyData?.categories[categoryKey]) {
        console.error('Category not found:', categoryKey);
        return;
    }

    const technologies = state.historyData.categories[categoryKey];
    const datasets = technologies.map((tech, index) => {
        const techData = state.historyData.series[tech] || new Array(state.historyData.dates.length).fill(0);
        return createDataset(tech, techData, index);
    });

    createTimelineChart(state.historyData.dates, datasets);
}

function showAllCategories() {
    state.currentView = 'overview';
    state.currentCategory = null;
    activateTab('tab-all');
    drawTimeline();
}

function drawTimeline() {
    if (!state.historyData) return;

    const { dates: labels } = state.historyData;
    const categories = Object.entries(state.historyData.categories);
    
    const datasets = categories.map(([categoryName, techs], index) => {
        const categoryData = state.historyData.dates.map((_, dayIndex) => {
            let dailyTotal = 0;
            techs.forEach(tech => {
                dailyTotal += state.historyData.series[tech][dayIndex];
            });
            return dailyTotal;
        });
        
        return createDataset(categoryName, categoryData, index);
    });

    createTimelineChart(labels, datasets);
}

// ===== LEGEND MANAGEMENT =====
function handleResize() {
    if (state.timelineChart) {
        state.timelineChart.resize();
        createCustomLegend(state.timelineChart);
    }
}

// ===== DONUT CHART MANAGEMENT =====
function updateDonutForCategory(categoryKey) {
    if (!state.historyData) return;
    
    let categoryData = {};
    const lastDayIndex = state.historyData.dates.length - 1;
    
    if (categoryKey === 'all') {
        for (const [categoryName, techs] of Object.entries(state.historyData.categories)) {
            let dailyTotal = 0;
            techs.forEach(tech => {
                dailyTotal += state.historyData.series[tech][lastDayIndex];
            });
            if (dailyTotal > 0) {
                categoryData[categoryName] = dailyTotal;
            }
        }
    } else {
        const techs = state.historyData.categories[categoryKey];
        let hasAnyData = false;
        
        techs.forEach(tech => {
            const count = state.historyData.series[tech][lastDayIndex] || 0;
            if (count > 0) {
                categoryData[tech] = count;
                hasAnyData = true;
            }
        });
        
        if (!hasAnyData) {
            const chartElement = document.getElementById('donutContainer');
            chartElement.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full w-full text-center p-6">
                    <div class="w-14 h-14 mb-3 text-gray-400 opacity-70">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                        </svg>
                    </div>
                    <p class="text-gray-300 font-medium text-sm mb-1">No Data Available</p>
                    <p class="text-gray-400 text-xs">${categoryKey} skills weren't mentioned today</p>
                </div>
            `;
            state.donutChart?.destroy();
            state.donutChart = null;
            updateDonutLegend([], []);
            return;
        }
    }
    
    const { labels, values } = toSortedArrays(categoryData, 30);
    renderDonutChart(labels, values);
}

function setActiveTab(activeButton) {
    document.querySelectorAll('.donut-tab').forEach(tab => {
        tab.classList.remove('active', 'bg-white', 'bg-opacity-15', 'text-white', 'shadow-sm');
    });
    activeButton.classList.add('active', 'bg-white', 'bg-opacity-15', 'text-white', 'shadow-sm');
}

function initDonutTabs() {
    const tabsContainer = document.getElementById('donutTabs');
    if (!tabsContainer || !state.historyData?.categories) return;

    document.querySelectorAll('.donut-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            setActiveTab(this);
            updateDonutForCategory(this.dataset.category);
        });
    });

    Object.keys(state.historyData.categories).forEach(category => {
        if (category === "all") return;
        const button = document.createElement('button');
        button.className = 'donut-tab';
        button.textContent = category;
        button.dataset.category = category;
        button.addEventListener('click', function() {
            setActiveTab(this);
            updateDonutForCategory(category);
        });

        tabsContainer.appendChild(button);
    });
}

// ===== TAB CONFIGURATION =====
const tabConfig = {
    'tab-all': showAllCategories,
    'tab-web/js': () => showCategory('Web/JS'),
    'tab-backend': () => showCategory('Backend'),
    'tab-databases': () => showCategory('Databases'),
    'tab-devops/cloud': () => showCategory('DevOps/Cloud'),
    'tab-bitools': () => showCategory('BI Tools'),
    'tab-design': () => showCategory('Design'),
    'tab-netsec': () => showCategory('Net/Sec'),
    'tab-front': () => showCategory('Front Tools')
};

function setupTabHandlers() {
    Object.entries(tabConfig).forEach(([tabId, action]) => {
        const tabElement = document.getElementById(tabId);
        if (tabElement) {
            tabElement.addEventListener('click', () => {
                activateTab(tabId);
                action();
            });
        }
    });
}

// ===== INITIALIZATION =====
async function boot() {
    // Set global chart defaults
    Chart.defaults.color = chartConfig.defaults.color;
    Chart.defaults.plugins.legend.labels.color = chartConfig.defaults.plugins.legend.labels.color;
    Chart.defaults.plugins.tooltip.bodyColor = chartConfig.defaults.plugins.tooltip.bodyColor;
    Chart.defaults.plugins.title.color = chartConfig.defaults.plugins.title.color;
    Chart.defaults.scales = chartConfig.defaults.scales;

    await loadHistory();
    const latest = getLatestDay();
    if (!latest) return;

    showApproxLastUpdated();
    initDonutTabs();

    const { labels, values } = toSortedArrays(latest.counts, 20);
    renderDonutChart(labels, values);

    drawTimeline();
    activateTab('tab-all');

    // Setup all tab handlers
    setTimeout(setupTabHandlers, 100);
}

// ===== EVENT LISTENERS =====
window.addEventListener('resize', () => updatePointSizes(state.timelineChart, isMobileView, state));

// Start the application
boot();