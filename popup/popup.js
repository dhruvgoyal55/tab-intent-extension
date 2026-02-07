// Popup JavaScript

const INTENT_GROUPS = {
  research: { emoji: '📚', label: 'Learning' },
  work_task: { emoji: '💼', label: 'Work' },
  shopping: { emoji: '🛒', label: 'Shopping' },
  read_later: { emoji: '🧠', label: 'Ideas' },
  random: { emoji: '🎯', label: 'Other' }
};

// Load stats on popup open
document.addEventListener('DOMContentLoaded', async () => {
  await loadTodayStats();
  await loadRecentTabs();
  await loadIntentCounts();
});

// Load today's stats
async function loadTodayStats() {
  chrome.runtime.sendMessage({ action: 'getTodayStats' }, (stats) => {
    if (stats) {
      document.getElementById('todayTotal').textContent = stats.total;
      document.getElementById('stillOpen').textContent = stats.stillOpen;
      document.getElementById('markedUseful').textContent = stats.markedUseful;
    }
  });
}

// Load intent counts
async function loadIntentCounts() {
  const { allTabs = {} } = await chrome.storage.local.get('allTabs');
  const today = new Date().toDateString();
  
  const intentCounts = {
    research: 0,
    work_task: 0,
    shopping: 0,
    read_later: 0,
    random: 0
  };
  
  for (const [tabId, tabInfo] of Object.entries(allTabs)) {
    const openedDate = new Date(tabInfo.openedAt).toDateString();
    if (openedDate === today && tabInfo.intent) {
      intentCounts[tabInfo.intent] = (intentCounts[tabInfo.intent] || 0) + 1;
    }
  }
  
  // Update counts
  for (const [intent, count] of Object.entries(intentCounts)) {
    const element = document.getElementById(`count-${intent}`);
    if (element) {
      element.textContent = count;
    }
  }
}

// Load recent tabs
async function loadRecentTabs() {
  const { allTabs = {} } = await chrome.storage.local.get('allTabs');
  const recentTabsList = document.getElementById('recentTabsList');
  
  // Get all tab IDs
  const tabIds = Object.keys(allTabs);
  
  if (tabIds.length === 0) {
    recentTabsList.innerHTML = '<div class="empty-state">No tabs tracked yet</div>';
    return;
  }
  
  // Load full tab data for recent tabs
  const recentTabs = [];
  for (const tabId of tabIds) {
    const result = await chrome.storage.local.get(`tab_${tabId}`);
    const tabData = result[`tab_${tabId}`];
    if (tabData && tabData.status === 'open') {
      recentTabs.push(tabData);
    }
  }
  
  // Sort by openedAt (most recent first)
  recentTabs.sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
  
  // Take only 5 most recent
  const displayTabs = recentTabs.slice(0, 5);
  
  if (displayTabs.length === 0) {
    recentTabsList.innerHTML = '<div class="empty-state">No open tabs tracked</div>';
    return;
  }
  
  // Render tabs
  recentTabsList.innerHTML = displayTabs.map(tab => {
    const intentInfo = INTENT_GROUPS[tab.intent] || { emoji: '📄', label: 'Unknown' };
    const timeAgo = getTimeAgo(new Date(tab.openedAt));
    
    return `
      <div class="tab-item" data-tab-id="${tab.tabId}">
        <div class="tab-title">${escapeHtml(tab.title)}</div>
        <div class="tab-meta">
          <span class="tab-intent-badge">
            ${intentInfo.emoji} ${intentInfo.label}
          </span>
          <span>${timeAgo}</span>
        </div>
      </div>
    `;
  }).join('');
  
  // Add click handlers to open tabs
  document.querySelectorAll('.tab-item').forEach(item => {
    item.addEventListener('click', () => {
      const tabId = parseInt(item.dataset.tabId);
      chrome.tabs.update(tabId, { active: true });
      window.close();
    });
  });
}

// View all tabs button
document.getElementById('viewAllBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'chrome://extensions' }); // TODO: Create a full dashboard page
  window.close();
});

// Helper: Get time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Helper: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
