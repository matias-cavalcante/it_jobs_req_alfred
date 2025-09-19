import { createDataset, createTimelineChartLegend, createDonutChartLegend, updatePointSizes, toSortedArrays, palette, isMobileView, showApproxLastUpdated } from'./utilities.js';
import { loadHistoryData, getLatestDayCounts } from './data-handling.js';
import { renderDonutChart, createTimelineChart} from './render-d-chart.js';
import { chartConfig } from './chart-config.js';


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

    const { dates: labels } = state.historyData;

    const technologies = state.historyData.categories[categoryKey];
    const datasets = technologies.map((tech, index) => {
        const techData = state.historyData.series[tech] || new Array(state.historyData.dates.length).fill(0);
        return createDataset(tech, techData, index);
    });

    createTimelineChart(state, chartConfig, labels, datasets);
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

    createTimelineChart(state, chartConfig, labels, datasets);

}


// ===== DONUT CHART MANAGEMENT =====

 

function calculateAndRenderAllData() {
    // This is the correct place to define lastDayIndex for this function
    const lastDayIndex = state.historyData.dates.length - 1;
    const categoryData = {};
    
    for (const [categoryName, techs] of Object.entries(state.historyData.categories)) {
        let dailyTotal = 0;
        techs.forEach(tech => {
            dailyTotal += state.historyData.series[tech][lastDayIndex];
        });
        if (dailyTotal > 0) {
            categoryData[categoryName] = dailyTotal;
        }
    }
    
    const { labels, values } = toSortedArrays(categoryData, 30);
    renderDonutChart(state, chartConfig, labels, values);
}

function calculateAndRenderCategoryData(categoryKey) {
    let categoryData = {};
    const techs = state.historyData.categories[categoryKey];
    const lastDayIndex = state.historyData.dates.length - 1;
    let hasAnyData = false;

    techs.forEach(tech => {
        const count = state.historyData.series[tech][lastDayIndex] || 0;
        if (count > 0) {
            categoryData[tech] = count;
            hasAnyData = true;
        }
    });

    if (!hasAnyData) {
        renderDonutChart(state, chartConfig, [], []);
        return;
    }

    const { labels, values } = toSortedArrays(categoryData, 30);
    renderDonutChart(state, chartConfig, labels, values);
}


function updateDonutForCategory(categoryKey) {
    if (!state.historyData) return;

    // This ensures a clean slate every time
    const containerElementErase = document.getElementById('donutContainer');
    containerElementErase.innerHTML = '';
    
    // The "painter" now decides which "brush" to use
    if (categoryKey === 'all') {
        calculateAndRenderAllData();
    } else {
        calculateAndRenderCategoryData(categoryKey);
    }
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

   

    state.historyData = await loadHistoryData();
    const latest = getLatestDayCounts(state.historyData);
    if (!latest) return;

    showApproxLastUpdated();
    initDonutTabs();



    const { labels, values } = toSortedArrays(latest.counts, 20);
    renderDonutChart(state, chartConfig, labels, values); 

    drawTimeline();
    activateTab('tab-all');

    // Setup all tab handlers
    setTimeout(setupTabHandlers, 100);
}

// ===== EVENT LISTENERS =====
window.addEventListener('resize', () => updatePointSizes(state.timelineChart, isMobileView, state));

// Start the application
boot();