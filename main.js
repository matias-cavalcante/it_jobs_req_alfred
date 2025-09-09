// ===== GLOBAL STATE =====
let activeObserver = null; // Track the active observer for cleanup



let donutChart, timelineChart;
let historyData = null;
let currentView = 'overview';
let currentCategory = null;

// ===== CORE FUNCTION =====
function manageTabInteractions() {
    const tabContainer = document.getElementById('tab-container');
    if (!tabContainer) return;
    
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const tabs = tabContainer.querySelectorAll('.tab-button');
    
    console.log(`🔄 Switching to ${isMobile ? 'MOBILE' : 'DESKTOP'} mode`);

    // === CLEANUP PHASE ===
    // 1. Always disconnect previous observer if it exists
    if (activeObserver) {
        activeObserver.disconnect();
        activeObserver = null;
        console.log('♻️ Disconnected previous observer');
    }
    
    // 2. Remove ALL existing click listeners by cloning buttons
    tabs.forEach(tab => {
        tab.replaceWith(tab.cloneNode(true));
    });
    
    // Get fresh references to the cloned buttons
    const freshTabs = tabContainer.querySelectorAll('.tab-button');
    
    // === SETUP PHASE ===
    if (isMobile) {
        setupMobileCarousel(tabContainer, freshTabs);
    } else {
        setupDesktopClicks(freshTabs);
    }
}

function highlightActiveTab(activeButton) {
    // 1. Remove 'active' class from ALL tabs
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // 2. Add 'active' class to the one that was just activated
    activeButton.classList.add('active');
}

// ===== MOBILE SYSTEM =====
function setupMobileCarousel(container, buttons) {
    console.log('📱 Setting up mobile carousel');
    
    let isScrolling = false;
    
    container.addEventListener('scroll', () => {
        isScrolling = true;
    });
    
    container.addEventListener('scrollend', () => {
        isScrolling = false;
        findAndActivateSnappedButton(container, buttons);
    });
    
    // Also check during scroll for smoother UX
    container.addEventListener('scroll', () => {
        if (isScrolling) {
            // Throttle this check to avoid performance issues
            clearTimeout(container.scrollTimeout);
            container.scrollTimeout = setTimeout(() => {
                findAndActivateSnappedButton(container, buttons);
            }, 10);
        }
    });
}

function findAndActivateSnappedButton(container, buttons) {
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;
    
    let snappedButton = null;
    let minDistance = Infinity;
    
    buttons.forEach(button => {
        const buttonRect = button.getBoundingClientRect();
        const buttonCenter = buttonRect.left + buttonRect.width / 2;
        const distance = Math.abs(buttonCenter - containerCenter);
        
        if (distance < minDistance) {
            minDistance = distance;
            snappedButton = button;
        }
    });
    
    if (snappedButton && minDistance < containerRect.width * 0.3) {
        const category = snappedButton.dataset.category;
        highlightActiveTab(snappedButton);
        showCategory(category);
    }
}

// ===== DESKTOP SYSTEM =====
function setupDesktopClicks(buttons) {
    console.log('💻 Setting up desktop click listeners');
    
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.dataset.category;
            highlightActiveTab(button); // ← FIX: Use 'button' instead of 'entry.target'
            console.log('🖱️ Click triggered:', category);
            showCategory(category);
        });
    });
}

// ===== INITIALIZATION =====
// Run on load and resize (with debounce)
let resizeTimeout;
function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(manageTabInteractions, 250);
}

// Start the system when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', manageTabInteractions);
} else {
    manageTabInteractions();
}

window.addEventListener('resize', handleResize);






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
            <span class="w-2 h-2" style="background-color: ${colors[index]}"></span>
            <span class="text-gray-400 text-[0.83rem] tracking-wider">${label}</span>
        `;
        legendContainer.appendChild(legendItem);
    });
}

function renderCharts(labels, values) {

    const containerElement = document.getElementById('donutContainer');
    const chartElement = document.getElementById('donutChart');
    
    // Remove any message divs that were added (but keep the canvas)
    const messageDivs = containerElement.querySelectorAll('div:not(#donutChart)');
    messageDivs.forEach(div => div.remove());
    
    // Ensure the canvas is visible (BUT ONLY IF IT EXISTS)
    if (chartElement) {
        chartElement.style.display = 'block';
    } else {
        // If canvas was destroyed, recreate it
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'donutChart';
        newCanvas.className = 'w-full h-full';
        containerElement.appendChild(newCanvas);
    }
    

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
    const colors = palette(technologies.length);
    
    const datasets = technologies.map((tech, index) => { // Added 'index' parameter here
        const techData = historyData.series[tech] || new Array(historyData.dates.length).fill(0);
        return {
            label: tech,
            data: techData,
            fill: false,
            tension: 0.2,
            borderWidth: 1,
    
            borderColor: colors[index], // Use the palette color
            // REMOVED the duplicate borderColor line: borderColor: `hsl(${Math.random() * 360}, 75%, 60%)`,
            borderCapStyle: 'round',
            borderJoinStyle: 'round',
              pointRadius: 2.8,               // Adds the points
        pointHoverRadius: 6,
        pointBackgroundColor: colors[index], // Match point color to line color
        pointHoverBackgroundColor: colors[index],
        pointBorderColor: colors[index],
        pointHoverBorderColor: colors[index],
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
            maintainAspectRatio: false,
            aspectRatio: 2.5,
            interaction: { mode: 'nearest', intersect: false },
            plugins: {
                legend: { 
                    display: true, 
                    position: 'bottom',
                    labels: {
                        usePointStyle: false,
                        pointStyle: 'circle',
                        boxWidth: 20,
                        boxHeight: 1,
                        padding: 15,
                        font: { size: 12 },
                        
                    }
                }
            },
            scales: {
                x: { 
                    title: { display: false, text: "Total days counted" },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: { 
                    title: { display: false}, 
                    beginAtZero: true,
                    suggestedMax: 12,
                    ticks: { precision: 0 },
                    grid: { display: false, color: 'rgba(255, 255, 255, 0.1)' }
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
    const categories = Object.entries(historyData.categories);
    
    // Generate colors for all categories using your palette function
    const colors = palette(categories.length);
    
    const datasets = categories.map(([categoryName, techs], index) => {
        const categoryData = historyData.dates.map((_, dayIndex) => {
            let dailyTotal = 0;
            techs.forEach(tech => {
                dailyTotal += historyData.series[tech][dayIndex];
            });
            return dailyTotal;
        });
        
        return {
            label: categoryName,
            data: categoryData,
            fill: false,
            tension: 0.2,
            borderWidth: 1,
            borderColor: colors[index], // Use color from palette instead of random
            borderCapStyle: 'round',
            borderJoinStyle: 'round',
             pointRadius: 2.8,               // Adds the points
        pointHoverRadius: 6,
             pointBackgroundColor: colors[index], // Match point color to line color
        pointHoverBackgroundColor: colors[index],
        pointBorderColor: colors[index],
        pointHoverBorderColor: colors[index],
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
            maintainAspectRatio: false,
            aspectRatio: 2.5,
            interaction: { mode: 'nearest', intersect: false },
            plugins: {
                legend: { 
                    display: true, 
                    position: 'bottom',
                    labels: {
                        usePointStyle: false,
                        pointStyle: 'circle',
                        boxWidth: 20,
                        boxHeight: 1,
                        padding: 15,
                        font: { size: 12 },
                    }
                }
            },
            scales: {
                x: { 
                    title: { display: true, text: "Total days counted", align: 'end' },
                    grid: {lineWidth: 0.1, color: 'rgba(255, 255, 255, 1)'},
                    beginAtZero:false,
                    min:1
                },
                y: { 
                    title: { display: false, text: "Mentions per day" }, 
                    beginAtZero: false,
                    min:1,
                    suggestedMax: 12,
                    ticks: { precision: 0 , font: { size: 11}},
                    
                    grid: {display:false, color: 'rgba(255, 255, 255, 0.1)' }
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
        let hasAnyData = false; // Track if we found ANY non-zero values
        
        techs.forEach(tech => {
            const count = historyData.series[tech][lastDayIndex] || 0; // Ensure it's a number
            if (count > 0) {
                categoryData[tech] = count;
                hasAnyData = true; // We found at least one non-zero value
            }
        });
        
        // === SIMPLE CHECK: If no data found, show message and return early === //
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
            donutChart?.destroy();
            donutChart = null;
            updateLegend([], []);
            return; // Exit the function early
        }
    }
    
    const { labels, values } = toSortedArrays(categoryData, 30);
    renderCharts(labels, values);
}


function setActiveTab(activeButton) {
    document.querySelectorAll('.donut-tab').forEach(tab => {
        tab.classList.remove('active', 'bg-white', 'bg-opacity-15', 'text-white', 'shadow-sm');
    });
    activeButton.classList.add('active', 'bg-white', 'bg-opacity-15', 'text-white', 'shadow-sm');
}

function initDonutTabs() {
    const tabsContainer = document.getElementById('donutTabs');
    if (!tabsContainer || !historyData?.categories) return;

    document.querySelectorAll('.donut-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            setActiveTab(this);
            updateDonutForCategory(this.dataset.category);
        });
    });



    
    
    // Create tab for each category
    Object.keys(historyData.categories).forEach(category => {
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


async function boot() {
    await loadHistory();
    const latest = getLatestDay();
    if (!latest) return;

    showApproxLastUpdated();
    initDonutTabs()


    const { labels, values } = toSortedArrays(latest.counts, 20); // Show ample items


    renderCharts(labels, values);


    drawTimeline();
    activateTab('tab-all'); // Activate "All Categories" tab by default

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