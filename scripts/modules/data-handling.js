import { setupMonthSelector, getMonthDateRange } from "./select-data-period.js";


function filterDataByDateRange(rawData, dateRange) {
    const filteredData = {
        categories: rawData.categories // Always include categories
    };
    
    const { firstDay, lastDay } = dateRange;
    
    // Loop through all dates in rawData (excluding 'categories')
    Object.keys(rawData).forEach(date => {
        if (date !== 'categories') {
            // Check if date is within the month range
            if (date >= firstDay && date <= lastDay) {
                filteredData[date] = rawData[date];
            }
        }
    });
    
    return filteredData;
}

function showNoDataMessage(monthName) {
    console.log(`No data available for ${monthName}`);
    const messageElement = document.getElementById('data-message');
    if (messageElement) {
        messageElement.textContent = `No data available for ${monthName}`;
        messageElement.style.display = 'block';
        
        // Hide message after 3 seconds
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 3000);
    }
}


/**
 * Fetches and processes historical job data.
 * @returns {Promise<Object|null>} The processed data or null if an error occurs.
 */

export async function loadHistoryData(onDataUpdate) {
    try {
        const res = await fetch('history.json', { cache: 'no-store' });
        if (!res.ok) throw new Error("Can't fetch history.json");
        const rawData = await res.json();

        // Get current month for initial load
        const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
        const currentYear = new Date().getFullYear();
        const initialRange = getMonthDateRange(`${currentMonth} ${currentYear}`);
        
        // Filter to current month initially
        const initialData = filterDataByDateRange(rawData, initialRange);
        
        setupMonthSelector(function(monthName) {
            const year = new Date().getFullYear();
            const monthRange = getMonthDateRange(`${monthName} ${year}`);
            const filteredData = filterDataByDateRange(rawData, monthRange);
            
            // Check if we have any actual date entries (excluding categories)
            const hasData = Object.keys(filteredData).some(key => key !== 'categories');
            
            if (!hasData) {
                // Show message but keep current data displayed
                showNoDataMessage(monthName);
                return; 
            } else {
                // Call the update function to refresh charts
                onDataUpdate(filteredData);
                document.getElementById('current-month-name').textContent = monthName;

            }
        });
        
        // Return current month's data for initial load
        return processHistoryData(initialData);
        
    } catch (e) {
        console.error(e);
        return null;
    }
}

/**
 * Processes the raw history data into a structured format.
 * @param {Object} rawData The raw JSON data.
 * @returns {Object} The structured history data.
 */
export function processHistoryData(rawData) {
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

/**
 * Calculates the total job count for each category on the latest day.
 * @param {Object} historyData The processed history data object.
 * @returns {Object|null} An object with category counts or null if no data.
 */
export function getLatestDayCounts(historyData) {
    if (!historyData?.dates?.length) {
        return { counts: {} }; // Return an empty object instead of null
    }
    const lastDayIndex = historyData.dates.length - 1;
    
    const categoryCounts = {};
    for (const [categoryName, techs] of Object.entries(historyData.categories)) {
        let dailyTotal = 0;
        techs.forEach(tech => {
            dailyTotal += historyData.series[tech][lastDayIndex];
        });
        
        if (dailyTotal > 0) {
            categoryCounts[categoryName] = dailyTotal;
        }
    }
    
    return { counts: categoryCounts };
}
