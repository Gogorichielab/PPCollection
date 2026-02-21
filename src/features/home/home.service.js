// Time window (in milliseconds) to distinguish "Added" from "Updated" events.
// If created_at and updated_at are within this threshold, we treat it as "Added".
const UPDATE_DETECTION_THRESHOLD_MS = 5000;

function createHomeService(firearmsRepository) {
  function toRelativeTime(dateString) {
    if (!dateString) {
      return '—';
    }

    const timestamp = new Date(`${dateString}Z`).getTime();
    if (Number.isNaN(timestamp)) {
      return '—';
    }

    const diffMs = Date.now() - timestamp;
    const hours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

    if (hours < 24) {
      return `${Math.max(1, hours)}h ago`;
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days}d ago`;
    }

    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
  }

  return {
    getDashboard(username) {
      const summary = firearmsRepository.getCollectionSummary();
      const recentRecords = firearmsRepository.getRecentActivity(5);
      const now = Date.now();

      const recentActivity = recentRecords.map((item) => {
        const createdAt = new Date(`${item.created_at}Z`).getTime();
        const updatedAt = new Date(`${item.updated_at}Z`).getTime();
        const eventAt = Number.isNaN(updatedAt) ? createdAt : updatedAt;
        const isAdded = Math.abs(updatedAt - createdAt) <= UPDATE_DETECTION_THRESHOLD_MS;

        return {
          id: item.id,
          description: `${isAdded ? 'Added' : 'Updated'} ${item.make} ${item.model}`.trim(),
          timeAgo: toRelativeTime(item.updated_at || item.created_at),
          isRecent: now - eventAt < 1000 * 60 * 60 * 24
        };
      });

      return {
        username,
        stats: {
          totalFirearms: summary.total_firearms || 0,
          thisMonth: summary.this_month || 0,
          categories: summary.categories || 0,
          lastUpdateDays: summary.last_update_days == null ? '—' : `${summary.last_update_days}d`
        },
        recentActivity
      };
    }
  };
}

module.exports = { createHomeService };
