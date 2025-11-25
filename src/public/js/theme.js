// Theme toggle functionality
(function() {
  const THEME_KEY = 'ppcollection-theme';
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.querySelector('.theme-icon');
  
  // Get saved theme or default to dark
  function getSavedTheme() {
    return localStorage.getItem(THEME_KEY) || 'dark';
  }
  
  // Apply theme to document
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeIcon) {
      themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }
  
  // Initialize theme on page load
  const currentTheme = getSavedTheme();
  applyTheme(currentTheme);
  
  // Toggle theme on button click
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      const currentTheme = getSavedTheme();
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, newTheme);
      applyTheme(newTheme);
    });
  }
})();
