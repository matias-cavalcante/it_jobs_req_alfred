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

// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {
    // Get the key elements from the DOM
    const dropdownButton = document.getElementById('.dropdown-button');
    const dropdownMenu = document.getElementsByClassName('.dropdown-menu');

    // Handle all dropdown interactions with a single event listener on the document
    document.addEventListener('click', (event) => {
        // Log every click to see if the listener is active
        console.log("Click event fired.");

        
        // Check if the click was on the dropdown button
        if (event.target === dropdownButton) {
            dropdownMenu.classList.toggle('show');
                  console.log("We are in!")

            return; // Stop further checks if the button was clicked
        }

        // Check if the click was inside the dropdown menu
        const clickedButton = event.target.closest('.month-button');
        if (clickedButton) {
            const monthName = clickedButton.textContent.trim();
            console.log("Button pressed:", monthName);

            // Hide the dropdown menu after a selection is made
            dropdownMenu.classList.remove('show');
            return; // Stop further checks if a month button was clicked
        }

        // If the click was anywhere else, hide the dropdown
        if (dropdownMenu.classList.contains('show')) {
            dropdownMenu.classList.remove('show');
        }
    });
});
