export function setupMonthSelector(onMonthSelected) {
    const dropdownButton = document.querySelector('.dropdown-button');
    const dropdownMenu = document.querySelector('.dropdown-menu');

    if (!dropdownButton || !dropdownMenu) {
        console.error('Dropdown elements not found');
        return;
    }

    dropdownButton.addEventListener('click', () => {
        dropdownMenu.classList.toggle('show');
    });

    document.addEventListener('click', (event) => {
        const clickedButton = event.target.closest('.month-button');
        if (clickedButton) {
            const monthName = clickedButton.textContent.trim();
            onMonthSelected(monthName);
            dropdownMenu.classList.remove('show');
            dropdownButton.textContent = monthName;
        }
        
        // Close dropdown if clicking outside
        if (!event.target.closest('.dropdown')) {
            dropdownMenu.classList.remove('show');
        }
    });
}


/**
 * Gets the first and last date of a specified month and year.
 * @param {string} monthYear - A string like "January 2024".
 * @returns {{firstDay: string, lastDay: string}} An object containing the first and last date in 'YYYY-MM-DD' format.
 */

export function getMonthDateRange(monthYear) {
  const date = luxon.DateTime.fromFormat(monthYear, 'MMMM yyyy');


  if (!date.isValid) {
    console.log("date looks like this: ", date)
    throw new Error('Invalid month/year string provided.');
  }

  return {
    firstDay: date.startOf('month').toISODate(),
    lastDay: date.endOf('month').toISODate()
  };
}



