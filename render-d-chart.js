import { palette, updatePointSizes, createTimelineChartLegend, isMobileView } from './utilities.js';
import { createDonutChartLegend } from './utilities.js';




/*Handles the content of the donut chart container.
 * Clears old content and either renders a canvas or a 'no data' message.
 * @param {object} state - The global state object.
 * @param {Array<number>} values - The chart data values.
 * @returns {HTMLCanvasElement|null} A canvas element if data is present, otherwise null.
 */
function handleDonutContainerContent(state, values) {
    const containerElement = document.getElementById('donutContainer');
    const legendContainer = document.getElementById('donutLegend');

    // Always start with a clean slate
    containerElement.innerHTML = '';
    legendContainer.innerHTML = '';

    if (!values || values.length === 0) {
        // Display the "No Data Available" message
        const noDataMessage = document.createElement('div');
        noDataMessage.className = 'flex flex-col items-center justify-center h-full w-full text-center p-6';
        noDataMessage.innerHTML = `
            <div class="w-14 h-14 mb-3 text-gray-400 opacity-70">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
            </div>
            <p class="text-gray-300 font-medium text-sm mb-1">No Data Available</p>
            <p class="text-gray-400 text-xs">${state.currentCategory} skills weren't mentioned today</p>
        `;
        containerElement.appendChild(noDataMessage);
        return null; // Return null to indicate no chart should be rendered
    } else {
        // Create and return a new canvas for the chart
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'donutChart';
        newCanvas.className = 'w-full h-full';
        containerElement.appendChild(newCanvas);
        return newCanvas;
    }
}


// chart-renderer.js (within the file)

export function renderDonutChart(state, chartConfig, labels, values) {
    // This is the only place we need to destroy the chart instance
    if (state.donutChart) {
        state.donutChart.destroy();
        state.donutChart = null;
    }
    
    // Call the new helper function to prepare the container and handle 'no data'
    const chartElement = handleDonutContainerContent(state, values);

    // If no canvas was returned, we're done (message has been rendered)
    if (!chartElement) {
        return;
    }
    
    // The rest of the original logic now lives here
    const colors = palette(values.length);
    createDonutChartLegend(labels, colors);

    state.donutChart = new Chart(chartElement, {
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

export function createTimelineChart(state, chartConfig, labels, datasets) {
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