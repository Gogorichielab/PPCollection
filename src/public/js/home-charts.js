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

  const parsedData = safeParseData();

  const valueByYear = Array.isArray(parsedData.valueByYear) ? parsedData.valueByYear : [];
  const valueCanvas = document.getElementById('collection-value-chart');

  const charts = [];

  function chartFont() {
    return { canvas: "12px 'Trebuchet MS', Verdana, sans-serif" };
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
          label: 'Cumulative purchase value',
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
    const valueChart = buildValueChart();
    if (valueChart) charts.push(valueChart);
  }

  renderCharts();

  if (valueCanvas && typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(() => renderCharts());
    resizeObserver.observe(valueCanvas.parentElement);
  }

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
