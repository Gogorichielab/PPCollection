(function() {
  const chartDataScript = document.getElementById('home-charts-data');
  if (!chartDataScript || typeof Chart === 'undefined') {
    return;
  }

  function safeParseData() {
    try {
      return JSON.parse(chartDataScript.textContent || '{}');
    } catch (error) {
      console.error('Failed to parse dashboard chart data', error);
      return {};
    }
  }

  function getCssVar(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  }

  const palette = ['#1f4b5f', '#c2894f', '#4f7a8d', '#7b5a3a', '#8ca7b3'];
  const parsedData = safeParseData();

  const typeBreakdown = Array.isArray(parsedData.typeBreakdown) ? parsedData.typeBreakdown : [];
  const valueByYear = Array.isArray(parsedData.valueByYear) ? parsedData.valueByYear : [];
  const typeCanvas = document.getElementById('collection-type-chart');
  const valueCanvas = document.getElementById('collection-value-chart');

  const charts = [];

  function chartFont() {
    return { canvas: "12px 'DM Sans', system-ui, sans-serif" };
  }

  function buildTypeChart() {
    if (!(typeCanvas && typeBreakdown.length)) {
      return null;
    }
    const textColor = getCssVar('--text', '#eef1f5');
    const borderColor = getCssVar('--border', '#233141');

    return new Chart(typeCanvas, {
      type: 'doughnut',
      data: {
        labels: typeBreakdown.map((item) => `${item.firearm_type} (${item.count})`),
        datasets: [{
          data: typeBreakdown.map((item) => item.count),
          backgroundColor: typeBreakdown.map((_, index) => palette[index % palette.length]),
          borderColor,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        font: chartFont(),
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: textColor,
              boxWidth: 14,
              padding: 14
            }
          },
          tooltip: {
            callbacks: {
              label(context) {
                return `${context.label}: ${context.parsed}`;
              }
            }
          }
        }
      }
    });
  }

  function buildValueChart() {
    if (!(valueCanvas && valueByYear.length)) {
      return null;
    }
    const textColor = getCssVar('--text', '#eef1f5');
    const gridColor = getCssVar('--border', '#233141');
    const accentColor = getCssVar('--accent', '#1f4b5f');

    return new Chart(valueCanvas, {
      type: 'bar',
      data: {
        labels: valueByYear.map((item) => item.year),
        datasets: [{
          label: 'Purchase Value',
          data: valueByYear.map((item) => Number(item.total_value)),
          backgroundColor: accentColor,
          borderRadius: 8,
          maxBarThickness: 56
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        font: chartFont(),
        scales: {
          x: {
            ticks: { color: textColor },
            grid: { color: gridColor }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: textColor,
              callback(value) {
                return formatCurrency(value);
              }
            },
            grid: { color: gridColor }
          }
        },
        plugins: {
          legend: {
            labels: { color: textColor }
          },
          tooltip: {
            callbacks: {
              label(context) {
                return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
              }
            }
          }
        }
      }
    });
  }

  function renderCharts() {
    charts.length = 0;
    const typeChart = buildTypeChart();
    if (typeChart) charts.push(typeChart);
    const valueChart = buildValueChart();
    if (valueChart) charts.push(valueChart);
  }

  renderCharts();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
        renderCharts();
        break;
      }
    }
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
