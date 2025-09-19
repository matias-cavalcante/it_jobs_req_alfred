// ===== CHART CONFIGURATIONS =====

const defaults = {
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
    };

const timeline = {
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
    };

const donut = {
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

export const chartConfig = {defaults, timeline, donut};