let donutChart, timelineChart;
let historyData = null;
let currentView = 'overview';
let currentCategory = null;

async function loadHistory() {
    try {
        const res = await fetch('history.json', { cache: 'no-store' });
        if (!res.ok) throw new Error("Can't fetch history.json");
        const rawData = await res.json(); // Load the raw new format
        
        // PROCESS THE DATA into the old format
        historyData = processHistoryData(rawData);
        
        console.log("Data loaded and processed:", historyData); // For debugging
    } catch (e) {
        console.error(e);
        historyData = null;
    }
}

// Add this function to process the new JSON format into the old one
function processHistoryData(rawData) {
    // 1. Extract all unique dates and sort them
    const dateKeys = Object.keys(rawData).filter(key => key !== 'categories');
    const allDates = dateKeys.sort();

    // 2. Get the master list of all technologies we care about FROM THE CATEGORIES
    const allTechnologies = new Set();
    if (rawData.categories) {
        for (const categoryTechs of Object.values(rawData.categories)) {
            categoryTechs.forEach(tech => allTechnologies.add(tech));
        }
    }

    // 3. Initialize the series object with arrays of zeros for every tech
    const series = {};
    allTechnologies.forEach(tech => {
        series[tech] = new Array(allDates.length).fill(0);
    });

    // 4. Fill in the actual counts from the raw data
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

    // 5. Return the structure that the rest of the code expects
    return {
        dates: allDates,
        series: series,
        categories: rawData.categories
    };
}

function getLatestDay() {
    if (!historyData?.dates?.length) return null;
    const lastDayIndex = historyData.dates.length - 1;
    
    // REUSE THE LOGIC FROM drawTimeline() to get category totals for the last day
    const categoryCounts = {};
    
    for (const [categoryName, techs] of Object.entries(historyData.categories)) {
        // This is the exact same calculation done in drawTimeline()
        let dailyTotal = 0;
        techs.forEach(tech => {
            dailyTotal += historyData.series[tech][lastDayIndex];
        });
        
        if (dailyTotal > 0) {
            categoryCounts[categoryName] = dailyTotal;
        }
    }
    
    return {
        counts: categoryCounts
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
        '#E74C3C', '#2980B9', '#27AE60', '#F39C12', '#8E44AD',
        '#16A085', '#D35400', '#C0392B', '#2C3E50', '#9B59B6',
        '#34495E', '#E67E22', '#1ABC9C', '#7D3C98', '#F1C40F',
        '#2ECC71', '#E84393', '#3498DB', '#D68910', '#A569BD'
    ];
    
    if (n <= distinctColors.length) {
        return distinctColors.slice(0, n);
    }
    
    const goldenRatioConjugate = 0.618033988749895;
    const colors = distinctColors.slice();
    let hue = Math.random();
    
    for (let i = distinctColors.length; i < n; i++) {
        hue = (hue + goldenRatioConjugate) % 1;
        // More intense: increased saturation to 85%, reduced lightness to 50%
        colors.push(`hsl(${Math.round(hue * 360)}, 85%, 50%)`);
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
    document.querySelectorAll('[id^="tab-"]').forEach(tab => {
        tab.classList.remove('bg-white', 'bg-opacity-15', 'text-white', 'shadow-sm');
        tab.classList.add('text-gray-300');
    });
    
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
        // Use 0 if data is missing for a technology (shouldn't happen now, but safe)
        const techData = historyData.series[tech] || new Array(historyData.dates.length).fill(0);
        return {
            label: tech,
            data: techData,
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
        data: {
            labels: historyData.dates,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5,
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
                // Now we can safely assume every tech has data for every day
                dailyTotal += historyData.series[tech][dayIndex];
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
            aspectRatio: 2.5,
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
                        font: { size: 12 },
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



function updateDonutForCategory(categoryKey) {
    if (!historyData) return;
    
    let categoryData = {};
    const lastDayIndex = historyData.dates.length - 1;
    
    if (categoryKey === 'all') {
        // Show all categories - use existing logic
        for (const [categoryName, techs] of Object.entries(historyData.categories)) {
            let dailyTotal = 0;
            techs.forEach(tech => {
                dailyTotal += historyData.series[tech][lastDayIndex];
            });
            if (dailyTotal > 0) {
                categoryData[categoryName] = dailyTotal;
            }
        }
    } else {
        // Show specific category - show technologies within this category
        const techs = historyData.categories[categoryKey];
        techs.forEach(tech => {
            const count = historyData.series[tech][lastDayIndex];
            if (count > 0) {
                categoryData[tech] = count;
            }
        });
    }
    
    const { labels, values } = toSortedArrays(categoryData, 30);
    renderCharts(labels, values);
}

function initDonutTabs() {
    const tabsContainer = document.getElementById('donutTabs');
    if (!tabsContainer || !historyData?.categories) return;
    
    // Create tab for each category
    Object.keys(historyData.categories).forEach(category => {
        const button = document.createElement('button');
        button.className = 'donut-tab';
        button.textContent = category;
        button.dataset.category = category;
        button.addEventListener('click', function() {
            // Update active state
            document.querySelectorAll('.donut-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            this.classList.add('active');
            
            // Update chart and legend
            updateDonutForCategory(category);
        });
        tabsContainer.appendChild(button);
    });
}

async function boot() {
    await loadHistory();
    const latest = getLatestDay();
    if (!latest) return;

    showApproxLastUpdated();
    initDonutTabs()


    const { labels, values } = toSortedArrays(latest.counts, 20); // Show ample items
    renderCharts(labels, values);


    drawTimeline();

    // Add tab click handlers after everything is loaded
    setTimeout(() => {
        document.getElementById('tab-all')?.addEventListener('click', showAllCategories);
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
            showCategory('Design');
        });
        document.getElementById('tab-netsec')?.addEventListener('click', () => {
            activateTab('tab-netsec');
            showCategory('Net/Sec');
        });
        document.getElementById('tab-front')?.addEventListener('click', () => {
            activateTab('tab-front');
            showCategory('Front Tools');
        });
    }, 1000);
}

boot();