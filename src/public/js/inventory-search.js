// The server filters and sorts before paging. Keep the search controls mounted
// so updating results does not interrupt typing or move keyboard focus.
(function () {
  const form = document.getElementById('inventory-search');
  const input = form.elements.q;
  let timer;
  let pending;

  function searchUrl() {
    const url = new URL(form.action);
    for (const [key, value] of new FormData(form)) {
      if (value && !(key === 'field' && value === 'all')) url.searchParams.append(key, value);
    }
    return url;
  }

  async function refresh() {
    clearTimeout(timer);
    if (pending) pending.abort();
    const request = new AbortController();
    pending = request;
    const url = searchUrl();
    try {
      const response = await fetch(url, { signal: request.signal });
      if (!response.ok || response.redirected) throw new Error('Navigation required');
      const next = new DOMParser().parseFromString(await response.text(), 'text/html');
      if (request.signal.aborted) return;
      for (const selector of ['[data-inventory-summary]', '[data-inventory-results]']) {
        document.querySelector(selector).replaceWith(next.querySelector(selector));
      }
      history.replaceState(null, '', url);
    } catch {
      if (!request.signal.aborted) location.assign(url);
    }
  }

  input.addEventListener('input', () => {
    if (pending) pending.abort();
    clearTimeout(timer);
    timer = setTimeout(refresh, 250);
  });
  form.addEventListener('submit', event => { event.preventDefault(); refresh(); });
  form.addEventListener('change', event => { if (event.target !== input) refresh(); });
  form.querySelectorAll('.filter-group').forEach(group => {
    const key = `filter-group-${group.dataset.facetGroup}`;
    group.classList.add('filter-group--enhanced');
    const saved = localStorage.getItem(key);
    if (saved && !group.querySelector(':checked')) group.open = saved === 'open';
    group.addEventListener('toggle', () => localStorage.setItem(key, group.open ? 'open' : 'closed'));
  });
  form.addEventListener('click', event => {
    const button = event.target.closest('.filter-show-more');
    if (!button) return;
    const expanded = button.parentElement.classList.toggle('filter-options--expanded');
    button.setAttribute('aria-expanded', String(expanded));
    button.textContent = expanded ? 'Show less' : 'Show more';
  });

  document.addEventListener('click', event => {
    const row = event.target.closest('.table-row-clickable');
    if (row && !event.target.closest('a, button, input')) row.querySelector('.table-row-actions a').click();
  });
  document.addEventListener('keydown', event => {
    const row = event.target;
    if (!row.matches('.table-row-clickable')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      row.querySelector('.table-row-actions a').click();
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = event.key === 'ArrowDown' ? row.nextElementSibling : row.previousElementSibling;
      if (next) {
        row.tabIndex = -1;
        next.tabIndex = 0;
        next.focus();
      }
    }
  });
})();
