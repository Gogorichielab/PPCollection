const path = require('path');
const ejs = require('ejs');

const template = path.join(__dirname, '../../src/views/home/index-content.ejs');
const empty = {
  username: 'Collector',
  stats: { totalFirearms: 0, thisMonth: 0, categories: 0, lastUpdateDays: '—', dueForCleaning: 0 },
  recentActivity: [],
  cleaningDue: [],
  charts: { valueByYear: [], typeBreakdown: [] }
};

function render(overrides = {}) {
  return ejs.renderFile(template, { ...empty, ...overrides });
}

describe('collection ledger dashboard', () => {
  test('gives a fresh collection a real next step without blank chart canvases', async () => {
    const html = await render();
    expect(html).toContain('Create your first record');
    expect(html).toContain('href="/firearms/new"');
    expect(html).toContain('Cleaning reminders will appear here');
    expect(html).not.toContain('<canvas');
  });

  test('links activity and maintenance to the correct records and explains capped reminders', async () => {
    const html = await render({
      stats: { ...empty.stats, totalFirearms: 8, dueForCleaning: 6 },
      recentActivity: [{ id: 42, description: 'Updated Example Model', isRecent: true, timeAgo: '1h ago' }],
      cleaningDue: Array.from({ length: 5 }, (_, index) => ({ id: index + 10, label: `Record ${index}`, reason: 'Last cleaned 120 days ago' }))
    });
    expect(html).toContain('href="/firearms/42">Updated Example Model</a>');
    expect(html).toContain('href="/firearms/10"');
    expect(html).toContain('Showing 5 of 6 records due for cleaning');
    expect(html).toContain('href="/profile">Reminder settings');
  });

  test('exposes exact values and type counts without relying on color or JavaScript', async () => {
    const html = await render({
      stats: { ...empty.stats, totalFirearms: 3 },
      charts: { valueByYear: [{ year: '2025', total_value: 1234.56 }], typeBreakdown: [{ firearm_type: 'Rifle', count: 3 }] }
    });
    expect(html).toContain('Running total of recorded purchase prices through each year');
    expect(html).toContain('<th scope="row">2025</th><td>$1,234.56</td>');
    expect(html).toContain('<span>Rifle</span><strong>3</strong>');
    expect(html).toContain('max="3" value="3"');
  });

  test('escapes record text and script delimiters in chart data', async () => {
    const attack = '</script><script>alert(1)</script>';
    const html = await render({
      username: attack,
      recentActivity: [{ id: 1, description: attack, isRecent: false, timeAgo: '1d ago' }],
      cleaningDue: [{ id: 1, label: attack, reason: attack }],
      charts: { valueByYear: [], typeBreakdown: [{ firearm_type: attack, count: 1 }] }
    });
    expect(html).not.toContain(attack);
    expect(html).toContain('&lt;/script&gt;');
    expect(html).toContain('\\u003c/script>');
  });
});
