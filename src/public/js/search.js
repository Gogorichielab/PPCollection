// Search functionality for firearms table
(function() {
  const searchInput = document.getElementById('search-input');
  const searchField = document.getElementById('search-field');
  const tbody = document.getElementById('firearms-tbody');
  const resetButton = document.getElementById('search-reset');
  const noResults = document.getElementById('no-results');
  const statusMessage = document.getElementById('results-status');
  const sortButtons = document.querySelectorAll('.table-sort');
  const facetLabels = {
    status: 'Status',
    condition: 'Condition',
    firearm_type: 'Firearm Type'
  };
  const facetInputs = document.querySelectorAll('.facet-input');
  const activeFiltersContainer = document.getElementById('active-filters');
  const emptyFiltersMessage = activeFiltersContainer
    ? activeFiltersContainer.querySelector('[data-empty-message]')
    : null;

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

  function getFacetLabel(facet) {
    return facetLabels[facet] || facet;
  }

  function getSelectedFacets() {
    const selections = {};

    facetInputs.forEach((input) => {
      const facet = input.dataset.facet;

      if (!facet) return;

      selections[facet] = selections[facet] || [];

      if (input.checked) {
        selections[facet].push(input.value.toLowerCase());
      }
    });

    return selections;
  }

  function updateActiveFilters(facets) {
    if (!activeFiltersContainer) return;

    activeFiltersContainer.querySelectorAll('.filter-badge.active').forEach((badge) => badge.remove());

    const active = [];

    Object.entries(facets).forEach(([facet, values]) => {
      values.forEach((value) => {
        active.push({ facet, value });
      });
    });

    if (!active.length) {
      if (emptyFiltersMessage) {
        emptyFiltersMessage.hidden = false;
      }

      return;
    }

    if (emptyFiltersMessage) {
      emptyFiltersMessage.hidden = true;
    }

    active.forEach(({ facet, value }) => {
      const badge = document.createElement('span');
      badge.className = 'filter-badge active';
      badge.textContent = `${getFacetLabel(facet)}: ${value}`;

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'badge-remove';
      removeButton.setAttribute('aria-label', `Remove ${facet} filter for ${value}`);
      removeButton.dataset.facet = facet;
      removeButton.dataset.value = value;
      removeButton.textContent = '×';
      removeButton.addEventListener('click', () => {
        const matchingInput = Array.from(facetInputs).find(
          (input) => input.dataset.facet === facet && input.value.toLowerCase() === value
        );

        if (matchingInput) {
          matchingInput.checked = false;
          performSearch();
        }
      });

      badge.appendChild(removeButton);
      activeFiltersContainer.appendChild(badge);
    });
  }

  function matchesFacets(row, facets) {
    return Object.entries(facets).every(([facet, values]) => {
      if (!values.length) return true;

      const rowValue = (row.getAttribute('data-' + facet) || '').toLowerCase();

      return values.includes(rowValue);
    });
  }

  function performSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const field = searchField.value;
    const rows = tbody.getElementsByTagName('tr');
    const selectedFacets = getSelectedFacets();
    let visibleCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let matchesSearch = false;

      if (searchTerm === '') {
        matchesSearch = true;
      } else if (field === 'all') {
        // Search across all fields
        const make = (row.getAttribute('data-make') || '').toLowerCase();
        const model = (row.getAttribute('data-model') || '').toLowerCase();
        const caliber = (row.getAttribute('data-caliber') || '').toLowerCase();
        const serial = (row.getAttribute('data-serial') || '').toLowerCase();
        const status = (row.getAttribute('data-status') || '').toLowerCase();
        const condition = (row.getAttribute('data-condition') || '').toLowerCase();
        const firearmType = (row.getAttribute('data-firearm_type') || '').toLowerCase();
        const purchase_date = (row.getAttribute('data-purchase_date') || '').toLowerCase();

        matchesSearch =
          make.includes(searchTerm) ||
          model.includes(searchTerm) ||
          caliber.includes(searchTerm) ||
          serial.includes(searchTerm) ||
          status.includes(searchTerm) ||
          condition.includes(searchTerm) ||
          firearmType.includes(searchTerm) ||
          purchase_date.includes(searchTerm);
      } else {
        // Search in specific field
        const fieldValue = (row.getAttribute('data-' + field) || '').toLowerCase();
        matchesSearch = fieldValue.includes(searchTerm);
      }

      const shouldShow = matchesSearch && matchesFacets(row, selectedFacets);

      row.style.display = shouldShow ? '' : 'none';

      if (shouldShow) {
        visibleCount += 1;
      }
    }

    updateActiveFilters(selectedFacets);
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
    facetInputs.forEach((input) => {
      input.checked = false;
    });
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

  facetInputs.forEach((input) => {
    input.addEventListener('change', performSearch);
  });

  sortButtons.forEach((button) => {
    button.addEventListener('click', toggleSort);
  });

  // Add click handlers for clickable table rows
  function handleRowClick(event) {
    const row = event.currentTarget;
    const firearmId = row.dataset.firearmId;
    
    if (firearmId) {
      window.location.href = `/firearms/${firearmId}`;
    }
  }

  function handleRowKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleRowClick(event);
    }
  }

  // Attach handlers to all clickable rows
  const clickableRows = document.querySelectorAll('.table-row-clickable');
  clickableRows.forEach((row) => {
    row.addEventListener('click', handleRowClick);
    row.addEventListener('keydown', handleRowKeydown);
  });

  performSearch();
})();
