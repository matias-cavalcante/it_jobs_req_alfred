const { DateTime } = require('luxon');

/**
 * Gets the first and last date of a specified month and year.
 * @param {string} monthYear - A string like "January 2024".
 * @returns {{firstDay: string, lastDay: string}} An object containing the first and last date in 'YYYY-MM-DD' format.
 */

function getMonthDateRange(monthYear) {
  const date = DateTime.fromFormat(monthYear, 'MMMM yyyy');

  if (!date.isValid) {
    throw new Error('Invalid month/year string provided.');
  }

  return {
    firstDay: date.startOf('month').toISODate(),
    lastDay: date.endOf('month').toISODate()
  };
}

/*
try {

  const testMonth2 = 'September 2025';
  const result2 = getMonthDateRange(testMonth2);
  console.log(`The range for ${testMonth2} is:`, result2);

} catch (error) {
  console.error("An error occurred:", error.message);
}*/

// Get the dropdown menu element.
// Wait for the DOM to be fully loaded before running the script

const dropdownButton = document.getElementById('.dropdown-button');
const dropdownMenu = document.getElementsByClassName('.dropdown-menu');

document.addEventListener('DOMContentLoaded', () => {   
    document.addEventListener('click', (event) => {
        // Log every click to see if the listener is active
        console.log("Click event fired.");

        if (event.target === dropdownButton) {
            dropdownMenu.classList.toggle('show');
            return;
        }

        const clickedButton = event.target.closest('.month-button');
        if (clickedButton) {
            const monthName = clickedButton.textContent.trim();
            console.log("Button pressed:", monthName);

            dropdownMenu.classList.remove('show');
            return; 
        }

        if (dropdownMenu.classList.contains('show')) {
            dropdownMenu.classList.remove('show');
        }
    });
});
