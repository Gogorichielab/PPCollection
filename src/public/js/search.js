// Search functionality for firearms table
(function() {
  const searchInput = document.getElementById('search-input');
  const searchField = document.getElementById('search-field');
  const tbody = document.getElementById('firearms-tbody');
  const resetButton = document.getElementById('search-reset');
  const noResults = document.getElementById('no-results');
  const statusMessage = document.getElementById('results-status');
  const sortButtons = document.querySelectorAll('.table-sort');

  const rows = tbody ? Array.from(tbody.getElementsByTagName('tr')) : [];

  if (!searchInput || !searchField || !tbody) return;

  rows.forEach((row, index) => {
    row.dataset.index = index;
  });

  function setSortIcon(button, direction) {
    const icon = button.querySelector('.sort-icon');

    if (!icon) return;

    if (direction === 'asc') {
      icon.textContent = '▲';
    } else if (direction === 'desc') {
      icon.textContent = '▼';
    } else {
      icon.textContent = '⇅';
    }
  }

  function updateStatus(visibleCount) {
    const countMessage =
      visibleCount === 0
        ? 'No matches found.'
        : `${visibleCount} result${visibleCount === 1 ? '' : 's'} shown`;

    if (statusMessage) {
      statusMessage.textContent = countMessage;
    }

    if (noResults) {
      noResults.hidden = visibleCount !== 0;
    }
  }

  function performSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const field = searchField.value;
    const rows = tbody.getElementsByTagName('tr');
    let visibleCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let shouldShow = false;
      
      if (searchTerm === '') {
        shouldShow = true;
      } else if (field === 'all') {
        // Search across all fields
        const make = (row.getAttribute('data-make') || '').toLowerCase();
        const model = (row.getAttribute('data-model') || '').toLowerCase();
        const caliber = (row.getAttribute('data-caliber') || '').toLowerCase();
        const serial = (row.getAttribute('data-serial') || '').toLowerCase();
        const status = (row.getAttribute('data-status') || '').toLowerCase();

        shouldShow = make.includes(searchTerm) ||
                     model.includes(searchTerm) ||
                     caliber.includes(searchTerm) ||
                     serial.includes(searchTerm) ||
                     status.includes(searchTerm);
      } else {
        // Search in specific field
        const fieldValue = (row.getAttribute('data-' + field) || '').toLowerCase();
        shouldShow = fieldValue.includes(searchTerm);
      }

      row.style.display = shouldShow ? '' : 'none';

      if (shouldShow) {
        visibleCount += 1;
      }
    }

    updateStatus(visibleCount);
  }

  function resetSorting() {
    sortButtons.forEach((button) => {
      button.dataset.direction = 'none';
      button.setAttribute('aria-sort', 'none');
      button.classList.remove('sorted-asc', 'sorted-desc');
      setSortIcon(button, 'none');
    });

    const sortedRows = Array.from(tbody.rows).sort((a, b) => {
      return Number(a.dataset.index) - Number(b.dataset.index);
    });

    sortedRows.forEach((row) => tbody.appendChild(row));
  }

  function sortRows(key, direction) {
    const rowsArray = Array.from(tbody.rows);

    rowsArray.sort((a, b) => {
      const aValue = (a.getAttribute('data-' + key) || '').toLowerCase();
      const bValue = (b.getAttribute('data-' + key) || '').toLowerCase();

      if (aValue < bValue) return -1;
      if (aValue > bValue) return 1;
      return Number(a.dataset.index) - Number(b.dataset.index);
    });

    if (direction === 'desc') {
      rowsArray.reverse();
    }

    rowsArray.forEach((row) => tbody.appendChild(row));
  }

  function toggleSort(event) {
    const button = event.currentTarget;
    const key = button.dataset.sortKey;
    const currentDirection = button.dataset.direction || 'none';

    let nextDirection = 'asc';

    if (currentDirection === 'asc') {
      nextDirection = 'desc';
    } else if (currentDirection === 'desc') {
      nextDirection = 'none';
    }

    sortButtons.forEach((btn) => {
      if (btn === button) return;
      btn.dataset.direction = 'none';
      btn.setAttribute('aria-sort', 'none');
      btn.classList.remove('sorted-asc', 'sorted-desc');
      setSortIcon(btn, 'none');
    });

    if (nextDirection === 'none') {
      resetSorting();
    } else {
      sortRows(key, nextDirection);
    }

    button.dataset.direction = nextDirection;
    button.setAttribute(
      'aria-sort',
      nextDirection === 'none'
        ? 'none'
        : nextDirection === 'asc'
          ? 'ascending'
          : 'descending'
    );
    button.classList.toggle('sorted-asc', nextDirection === 'asc');
    button.classList.toggle('sorted-desc', nextDirection === 'desc');
    setSortIcon(button, nextDirection);
  }

  function resetFilters() {
    searchInput.value = '';
    searchField.value = 'all';
    resetSorting();
    performSearch();
    searchInput.focus();
  }

  // Add event listeners
  searchInput.addEventListener('input', performSearch);
  searchField.addEventListener('change', performSearch);

  if (resetButton) {
    resetButton.addEventListener('click', resetFilters);
  }

  sortButtons.forEach((button) => {
    button.addEventListener('click', toggleSort);
  });

  performSearch();
})();
