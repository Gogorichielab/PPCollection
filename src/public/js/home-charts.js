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
  const typeCanvas = document.getElementById('collection-type-chart');
  if (typeCanvas && typeBreakdown.length) {
    const textColor = getCssVar('--text', '#eef1f5');
    const borderColor = getCssVar('--border', '#233141');

    new Chart(typeCanvas, {
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

  const valueByYear = Array.isArray(parsedData.valueByYear) ? parsedData.valueByYear : [];
  const valueCanvas = document.getElementById('collection-value-chart');
  if (valueCanvas && valueByYear.length) {
    const textColor = getCssVar('--text', '#eef1f5');
    const gridColor = getCssVar('--border', '#233141');
    const accentColor = getCssVar('--accent', '#1f4b5f');

    new Chart(valueCanvas, {
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
        scales: {
          x: {
            ticks: {
              color: textColor
            },
            grid: {
              color: gridColor
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: textColor,
              callback(value) {
                return formatCurrency(value);
              }
            },
            grid: {
              color: gridColor
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: textColor
            }
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
})();
