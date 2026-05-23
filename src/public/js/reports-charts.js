(function() {
  const chartDataScript = document.getElementById('reports-charts-data');
  if (!chartDataScript || typeof Chart === 'undefined') {
    return;
  }

  function safeParseData() {
    try {
      return JSON.parse(chartDataScript.textContent || '{}');
    } catch (error) {
      console.error('Failed to parse reports chart data', error);
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

  const palette = ['#1f4b5f', '#c2894f', '#4f7a8d', '#7b5a3a', '#8ca7b3', '#5f3f1f', '#3f5f4f', '#7a4f6e', '#4f6e7a', '#6e7a4f'];
  const parsedData = safeParseData();

  const charts = [];

  function chartFont() {
    return { canvas: "12px 'DM Sans', system-ui, sans-serif" };
  }

  function buildDoughnutChart(canvasId, data, labelKey) {
    const canvas = document.getElementById(canvasId);
    if (!(canvas && data && data.length)) return null;

    const textColor = getCssVar('--text', '#eef1f5');
    const borderColor = getCssVar('--border', '#233141');

    return new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: data.map((item) => `${item[labelKey]} (${item.count})`),
        datasets: [{
          data: data.map((item) => item.count),
          backgroundColor: data.map((_, i) => palette[i % palette.length]),
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

  function buildBarChart(canvasId, data, labelKey, valueKey, valueFormatter) {
    const canvas = document.getElementById(canvasId);
    if (!(canvas && data && data.length)) return null;

    const textColor = getCssVar('--text', '#eef1f5');
    const gridColor = getCssVar('--border', '#233141');
    const accentColor = getCssVar('--accent', '#1f4b5f');

    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map((item) => item[labelKey]),
        datasets: [{
          label: valueFormatter ? 'Value' : 'Count',
          data: data.map((item) => Number(item[valueKey])),
          backgroundColor: accentColor,
          borderRadius: 6,
          maxBarThickness: 48
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        font: chartFont(),
        scales: {
          x: {
            ticks: { color: textColor, maxRotation: 45 },
            grid: { color: gridColor }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: textColor,
              callback(value) {
                return valueFormatter ? valueFormatter(value) : value;
              }
            },
            grid: { color: gridColor }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(context) {
                const val = context.parsed.y;
                return valueFormatter ? valueFormatter(val) : val;
              }
            }
          }
        }
      }
    });
  }

  function renderCharts() {
    charts.forEach((c) => c.destroy());
    charts.length = 0;

    const typeData = Array.isArray(parsedData.byType) ? parsedData.byType : [];
    const caliberData = Array.isArray(parsedData.byCaliber) ? parsedData.byCaliber : [];
    const makeData = Array.isArray(parsedData.byMake) ? parsedData.byMake : [];
    const acquisitionData = Array.isArray(parsedData.acquisitionByMonth) ? parsedData.acquisitionByMonth : [];
    const avgPriceData = Array.isArray(parsedData.avgPriceByYear) ? parsedData.avgPriceByYear : [];
    const conditionData = Array.isArray(parsedData.byCondition) ? parsedData.byCondition : [];

    const typeChart = buildDoughnutChart('reports-type-chart', typeData, 'label');
    if (typeChart) charts.push(typeChart);

    const caliberChart = buildBarChart('reports-caliber-chart', caliberData, 'label', 'count', null);
    if (caliberChart) charts.push(caliberChart);

    const acquisitionChart = buildBarChart('reports-acquisition-chart', acquisitionData, 'month', 'count', null);
    if (acquisitionChart) charts.push(acquisitionChart);

    const avgPriceChart = buildBarChart('reports-avgprice-chart', avgPriceData, 'year', 'avg_price', formatCurrency);
    if (avgPriceChart) charts.push(avgPriceChart);

    const conditionChart = buildDoughnutChart('reports-condition-chart', conditionData, 'label');
    if (conditionChart) charts.push(conditionChart);

    const makeChart = buildBarChart('reports-make-chart', makeData, 'label', 'count', null);
    if (makeChart) charts.push(makeChart);
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
