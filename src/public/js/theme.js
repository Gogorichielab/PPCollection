// Theme toggle functionality
(function() {
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.querySelector('.theme-icon');
  
  // Get CSRF token from page
  function getCsrfToken() {
    const csrfInput = document.querySelector('input[name="_csrf"]');
    return csrfInput ? csrfInput.value : null;
  }
  
  // Get current theme from document
  function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }
  
  // Apply theme to document
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeIcon) {
      themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }
  
  // Initialize icon based on server-rendered theme
  const currentTheme = getCurrentTheme();
  if (themeIcon) {
    themeIcon.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
  }
  
  // Toggle theme on button click
  if (themeToggle) {
    themeToggle.addEventListener('click', async function() {
      const csrfToken = getCsrfToken();
      if (!csrfToken) {
        console.error('CSRF token not found');
        return;
      }
      
      try {
        const response = await fetch('/toggle-theme', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'CSRF-Token': csrfToken
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          applyTheme(data.theme);
        }
      } catch (error) {
        console.error('Failed to toggle theme:', error);
      }
    });
  }
})();
