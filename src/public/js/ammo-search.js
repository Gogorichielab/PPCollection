// Search functionality for the ammo table
(function() {
  const searchInput = document.getElementById('search-input');
  const searchField = document.getElementById('search-field');
  const tbody = document.getElementById('ammo-tbody');
  const resetButton = document.getElementById('search-reset');
  const clearButton = document.getElementById('search-clear');
  const noResults = document.getElementById('no-results');
  const statusMessage = document.getElementById('results-status');
  const sortButtons = document.querySelectorAll('.table-sort');
  const facetLabels = {
    manufacturer: 'Manufacturer',
    caliber: 'Caliber',
    load_type: 'Load Type',
    location: 'Location'
  };
  const facetInputs = document.querySelectorAll('.facet-input');
  const activeFiltersContainer = document.getElementById('active-filters');
  const emptyFiltersMessage = activeFiltersContainer
    ? activeFiltersContainer.querySelector('[data-empty-message]')
    : null;
  const allItemsBadge = document.getElementById('all-items-badge');
  const allItemsCount = allItemsBadge
    ? allItemsBadge.querySelector('.badge-count')
    : null;
  const allItemsLabel = allItemsBadge
    ? allItemsBadge.querySelector('.badge-label')
    : null;
  const initialTotalCount = allItemsCount
    ? Number.parseInt(allItemsCount.textContent, 10) || 0
    : 0;

  const rows = tbody ? Array.from(tbody.getElementsByTagName('tr')) : [];
  const totalRowCount = rows.length;

  if (!searchInput || !searchField || !tbody) return;

  rows.forEach((row, index) => {
    row.dataset.index = index;
  });

  let currentSort = { column: null, direction: 'none' };
  let searchDebounce;

  const ALLOWED_SORT_KEYS = ['manufacturer', 'product_line', 'caliber', 'load_type', 'boxes', 'total_rounds', 'location'];

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

    if (allItemsBadge && allItemsCount) {
      const isFiltered = visibleCount !== totalRowCount;
      const isPaginated = initialTotalCount !== totalRowCount;
      if (isFiltered) {
        allItemsCount.textContent = `${visibleCount} / ${totalRowCount}`;
        allItemsBadge.setAttribute(
          'aria-label',
          isPaginated
            ? `Showing ${visibleCount} of ${totalRowCount} on this page (${initialTotalCount} total)`
            : `Showing ${visibleCount} of ${totalRowCount}`
        );
      } else {
        allItemsCount.textContent = String(initialTotalCount);
        allItemsBadge.setAttribute('aria-label', 'All items');
      }
      if (allItemsLabel) {
        allItemsLabel.textContent = isFiltered
          ? (isPaginated ? 'On this page' : 'Showing')
          : 'All items';
      }
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

      const rowValue = (row.getAttribute(`data-${facet}`) || '').toLowerCase();

      return values.includes(rowValue);
    });
  }

  function updatePaginationLinks(currentParams) {
    const paginationBtns = document.querySelectorAll('.pagination-btn[href]');
    paginationBtns.forEach((btn) => {
      const url = new URL(btn.href, location.href);
      const page = url.searchParams.get('page');
      const merged = new URLSearchParams(currentParams);
      if (page) {
        merged.set('page', page);
      } else {
        merged.delete('page');
      }
      const qs = merged.toString();
      btn.href = qs ? `?${qs}` : location.pathname;
    });
  }

  function syncUrl() {
    const params = new URLSearchParams();
    if (searchInput.value) params.set('q', searchInput.value);
    if (searchField.value !== 'all') params.set('field', searchField.value);
    Object.entries(getSelectedFacets()).forEach(([facet, vals]) => {
      if (vals.length) params.set(facet, vals.join(','));
    });
    if (currentSort.column && currentSort.direction !== 'none') {
      params.set('sort', `${currentSort.column}:${currentSort.direction}`);
    }
    const qs = params.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
    updatePaginationLinks(params);
  }

  function hydrateFromUrl() {
    const params = new URLSearchParams(location.search);

    const q = params.get('q');
    if (q) searchInput.value = q;

    const field = params.get('field');
    if (field) searchField.value = field;

    facetInputs.forEach((input) => {
      const facet = input.dataset.facet;
      if (!facet) return;
      const paramVal = params.get(facet);
      if (paramVal) {
        const vals = paramVal.split(',').map((v) => v.toLowerCase());
        if (vals.includes(input.value.toLowerCase())) {
          input.checked = true;
        }
      }
    });

    const sort = params.get('sort');
    if (sort) {
      const [col, dir] = sort.split(':');
      if (ALLOWED_SORT_KEYS.includes(col) && (dir === 'asc' || dir === 'desc')) {
        currentSort = { column: col, direction: dir };
        sortButtons.forEach((button) => {
          if (button.dataset.sortKey === col) {
            button.dataset.direction = dir;
            const th = button.closest('th');
            if (th) {
              th.setAttribute('aria-sort', dir === 'asc' ? 'ascending' : 'descending');
            }
            button.classList.toggle('sorted-asc', dir === 'asc');
            button.classList.toggle('sorted-desc', dir === 'desc');
            setSortIcon(button, dir);
          }
        });
      }
    }

    updateClearVisibility();
  }

  function performSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const field = searchField.value;
    const currentRows = tbody.getElementsByTagName('tr');
    const selectedFacets = getSelectedFacets();
    let visibleCount = 0;

    for (let i = 0; i < currentRows.length; i++) {
      const row = currentRows[i];
      let matchesSearch = false;

      if (searchTerm === '') {
        matchesSearch = true;
      } else if (field === 'all') {
        const manufacturer = (row.getAttribute('data-manufacturer') || '').toLowerCase();
        const productLine = (row.getAttribute('data-product_line') || '').toLowerCase();
        const caliber = (row.getAttribute('data-caliber') || '').toLowerCase();
        const loadType = (row.getAttribute('data-load_type') || '').toLowerCase();
        const location = (row.getAttribute('data-location') || '').toLowerCase();

        matchesSearch =
          manufacturer.includes(searchTerm) ||
          productLine.includes(searchTerm) ||
          caliber.includes(searchTerm) ||
          loadType.includes(searchTerm) ||
          location.includes(searchTerm);
      } else {
        const fieldValue = (row.getAttribute(`data-${field}`) || '').toLowerCase();
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

    if (currentSort.column && currentSort.direction !== 'none') {
      sortRows(currentSort.column, currentSort.direction);
    }

    syncUrl();
  }

  function resetSorting() {
    sortButtons.forEach((button) => {
      button.dataset.direction = 'none';
      const th = button.closest('th');
      if (th) th.setAttribute('aria-sort', 'none');
      button.classList.remove('sorted-asc', 'sorted-desc');
      setSortIcon(button, 'none');
    });

    currentSort = { column: null, direction: 'none' };

    const sortedRows = Array.from(tbody.rows).sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index));

    sortedRows.forEach((row) => tbody.appendChild(row));
  }

  function sortRows(key, direction) {
    const rowsArray = Array.from(tbody.rows);
    const numericKeys = ['boxes', 'total_rounds'];

    rowsArray.sort((a, b) => {
      if (numericKeys.includes(key)) {
        const aNum = Number(a.getAttribute(`data-${key}`)) || 0;
        const bNum = Number(b.getAttribute(`data-${key}`)) || 0;
        if (aNum !== bNum) return aNum - bNum;
        return Number(a.dataset.index) - Number(b.dataset.index);
      }

      const aValue = (a.getAttribute(`data-${key}`) || '').toLowerCase();
      const bValue = (b.getAttribute(`data-${key}`) || '').toLowerCase();

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
      const btnTh = btn.closest('th');
      if (btnTh) btnTh.setAttribute('aria-sort', 'none');
      btn.classList.remove('sorted-asc', 'sorted-desc');
      setSortIcon(btn, 'none');
    });

    if (nextDirection === 'none') {
      resetSorting();
    } else {
      sortRows(key, nextDirection);
    }

    button.dataset.direction = nextDirection;
    const activeTh = button.closest('th');
    if (activeTh) {
      activeTh.setAttribute(
        'aria-sort',
        nextDirection === 'none'
          ? 'none'
          : nextDirection === 'asc'
            ? 'ascending'
            : 'descending'
      );
    }
    button.classList.toggle('sorted-asc', nextDirection === 'asc');
    button.classList.toggle('sorted-desc', nextDirection === 'desc');
    setSortIcon(button, nextDirection);

    if (nextDirection === 'none') {
      currentSort = { column: null, direction: 'none' };
    } else {
      currentSort = { column: key, direction: nextDirection };
    }

    syncUrl();
  }

  function initFilterGroups() {
    const filterGroups = document.querySelectorAll('details.filter-group');

    filterGroups.forEach((details) => {
      const facet = details.dataset.facetGroup;

      if (facet) {
        const stored = localStorage.getItem(`filter-group-${facet}`);
        if (stored === 'open') {
          details.open = true;
        } else if (stored === 'closed') {
          details.open = false;
        }
      }

      details.addEventListener('toggle', () => {
        if (facet) {
          localStorage.setItem(`filter-group-${facet}`, details.open ? 'open' : 'closed');
        }
      });

      const showMoreBtn = details.querySelector('.filter-show-more');
      if (showMoreBtn) {
        const filterOptions = details.querySelector('.filter-options');
        const overflowCount = Number.parseInt(showMoreBtn.dataset.overflowCount, 10) || 0;

        showMoreBtn.addEventListener('click', () => {
          const isExpanded = filterOptions && filterOptions.classList.toggle('filter-options--expanded');
          if (isExpanded) {
            showMoreBtn.textContent = 'Show less';
          } else {
            showMoreBtn.textContent = `+${overflowCount} more`;
          }
        });
      }
    });
  }

  function resetFilters() {
    searchInput.value = '';
    searchField.value = 'all';
    facetInputs.forEach((input) => {
      input.checked = false;
    });
    resetSorting();

    document.querySelectorAll('.filter-options--expanded').forEach((filterOptions) => {
      filterOptions.classList.remove('filter-options--expanded');
      const showMoreBtn = filterOptions.parentElement
        ? filterOptions.parentElement.querySelector('.filter-show-more')
        : null;
      if (showMoreBtn) {
        const overflowCount = Number.parseInt(showMoreBtn.dataset.overflowCount, 10) || 0;
        showMoreBtn.textContent = `+${overflowCount} more`;
      }
    });

    performSearch();
    searchInput.focus();
  }

  function updateClearVisibility() {
    if (!clearButton) return;
    clearButton.hidden = searchInput.value.length === 0;
  }

  searchInput.addEventListener('input', () => {
    updateClearVisibility();
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(performSearch, 250);
  });
  searchField.addEventListener('change', performSearch);

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      searchInput.value = '';
      updateClearVisibility();
      performSearch();
      searchInput.focus();
    });
  }

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      resetFilters();
      updateClearVisibility();
    });
  }

  facetInputs.forEach((input) => {
    input.addEventListener('change', performSearch);
  });

  sortButtons.forEach((button) => {
    button.addEventListener('click', toggleSort);
  });

  updateClearVisibility();
  initFilterGroups();
  hydrateFromUrl();
  performSearch();
})();
