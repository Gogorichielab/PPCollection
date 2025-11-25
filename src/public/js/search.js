// Search functionality for firearms table
(function() {
  const searchInput = document.getElementById('search-input');
  const searchField = document.getElementById('search-field');
  const tbody = document.getElementById('firearms-tbody');
  
  if (!searchInput || !searchField || !tbody) return;
  
  function performSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const field = searchField.value;
    const rows = tbody.getElementsByTagName('tr');
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let shouldShow = false;
      
      if (searchTerm === '') {
        shouldShow = true;
      } else if (field === 'all') {
        // Search across all fields
        const make = row.getAttribute('data-make').toLowerCase();
        const model = row.getAttribute('data-model').toLowerCase();
        const caliber = row.getAttribute('data-caliber').toLowerCase();
        const serial = row.getAttribute('data-serial').toLowerCase();
        const status = row.getAttribute('data-status').toLowerCase();
        
        shouldShow = make.includes(searchTerm) || 
                     model.includes(searchTerm) || 
                     caliber.includes(searchTerm) || 
                     serial.includes(searchTerm) ||
                     status.includes(searchTerm);
      } else {
        // Search in specific field
        const fieldValue = row.getAttribute('data-' + field).toLowerCase();
        shouldShow = fieldValue.includes(searchTerm);
      }
      
      row.style.display = shouldShow ? '' : 'none';
    }
  }
  
  // Add event listeners
  searchInput.addEventListener('input', performSearch);
  searchField.addEventListener('change', performSearch);
})();
