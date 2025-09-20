/**
 * Fetches and processes historical job data.
 * @returns {Promise<Object|null>} The processed data or null if an error occurs.
 */
export async function loadHistoryData() {
    try {
        const res = await fetch('history.json', { cache: 'no-store' });
        if (!res.ok) throw new Error("Can't fetch history.json");
        const rawData = await res.json();
        
        return processHistoryData(rawData);
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