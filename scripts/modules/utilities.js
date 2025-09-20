// A simple state object is used to maintain a consistent state within the utilities file.
const state = {
    isCurrentlyMobile: false,
};

// ===== UTILITY FUNCTIONS =====

export function isMobileView() {
    return window.innerWidth <= 767;
}

export function updatePointSizes(chart, isMobileViewFn, state) {
    if (!chart) return;
    
    const isMobile = isMobileViewFn();
    if (state.isCurrentlyMobile === isMobile) return;
    
    state.isCurrentlyMobile = isMobile;
    const newPointRadius = isMobile ? 2 : 3;
    
    chart.data.datasets.forEach(dataset => {
        dataset.pointRadius = newPointRadius;
    });
    
    chart.update('none');
}

export function toSortedArrays(obj, topN) {
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

export function palette(n) {
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
        colors.push(`hsl(${Math.round(hue * 360)}, 85%, 50%)`);
    }
    
    return colors;
}

export function showApproxLastUpdated() {
    const now = new Date();
    const update = new Date();
    update.setUTCHours(8, 10, 0, 0);

    if (now < update) update.setUTCDate(update.getUTCDate() - 1);

    const diffHours = Math.floor((now - update) / 3600000);
    document.getElementById("lastUpdated").textContent =
        `Updated about ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
}

export function createDataset(label, data, colorIndex) {
    const colors = palette(data.length);
    const pointRadius = isMobileView() ? 2 : 2.5;
    
    return {
        label,
        data,
        fill: false,
        tension: 0.26,
        borderWidth: 0.85,
        borderColor: colors[colorIndex],
        borderCapStyle: 'round',
        borderJoinStyle: 'round',
        pointRadius,
        pointHoverRadius: 5,
        pointBackgroundColor: colors[colorIndex],
        pointHoverBackgroundColor: colors[colorIndex],
        pointBorderColor: colors[colorIndex],
        pointHoverBorderColor: colors[colorIndex]
    };
}

// ===== LEGEND MANAGEMENT =====


export function createTimelineChartLegend(chart) {
    const legendContainer = document.getElementById('timeline-legend');
    legendContainer.innerHTML = '';
    
    chart.data.datasets.forEach((dataset, i) => {
        const legendItem = createTimelineLegendItem(dataset.label, dataset.borderColor);
        legendItem.dataset.index = i;
        
        legendItem.addEventListener('click', function() {
            const datasetIndex = parseInt(this.dataset.index);
            const meta = chart.getDatasetMeta(datasetIndex);
            meta.hidden = !meta.hidden;
            chart.update();
            updateLegendAppearance(chart);
        });
        
        legendContainer.appendChild(legendItem);
    });
    
    updateLegendAppearance(chart);
}

export function createDonutChartLegend(labels, colors) {
    const legendContainer = document.getElementById('donutLegend');
    legendContainer.innerHTML = '';
    
    labels.forEach((label, index) => {
        const legendItem = createDonutLegendItem(label, colors[index]);
        legendContainer.appendChild(legendItem);
    });
}

export function updateLegendAppearance(chart) {
    const legendItems = document.querySelectorAll('.legend-item');
    
    legendItems.forEach(item => {
        const datasetIndex = parseInt(item.dataset.index);
        const meta = chart.getDatasetMeta(datasetIndex);
        
        if (meta.hidden) {
            item.style.opacity = '0.5';
            item.style.textDecoration = 'line-through';
        } else {
            item.style.opacity = '1';
            item.style.textDecoration = 'none';
        }
    });
}

function createTimelineLegendItem(label, color) {
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.innerHTML = `
        <span class="legend-color" style="background:${color}"></span>
        <span>${label}</span>
    `;
    return legendItem;
}

function createDonutLegendItem(label, color) {
    const legendItem = document.createElement('div');
    legendItem.className = 'flex items-center gap-1';
    legendItem.innerHTML = `
        <span class="w-2 h-2" style="background-color: ${color}"></span>
        <span class="text-gray-400 text-[0.83rem] tracking-wider">${label}</span>
    `;
    return legendItem;
}
