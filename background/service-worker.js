// Background Service Worker - Core Logic

// Tab Schema as discussed in interview prep
const TAB_INTENTS = {
  RESEARCH: 'research',
  SHOPPING: 'shopping',
  READ_LATER: 'read_later',
  WORK: 'work_task',
  DISTRACTION: 'random'
};

const INTENT_GROUPS = {
  [TAB_INTENTS.RESEARCH]: { emoji: '📚', label: 'Learning' },
  [TAB_INTENTS.WORK]: { emoji: '💼', label: 'Work' },
  [TAB_INTENTS.SHOPPING]: { emoji: '🛒', label: 'Shopping' },
  [TAB_INTENTS.READ_LATER]: { emoji: '🧠', label: 'Ideas' },
  [TAB_INTENTS.DISTRACTION]: { emoji: '🎯', label: 'Other' }
};

// Reminder intervals (in minutes)
const REMINDER_TIMES = [30, 120, 240]; // 30min, 2hr, 4hr

// Listen for new tabs being created
chrome.tabs.onCreated.addListener(async (tab) => {
  console.log('New tab created:', tab.id);
  // Content script will handle showing the popup
});

// Listen for tab updates (when URL changes)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Content script will check if intent is needed
    // Just update last active time if tab data exists
    const tabData = await getTabData(tabId);
    if (tabData) {
      await updateTabActivity(tabId);
    }
  }
});

// Listen for tab closure
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const tabData = await getTabData(tabId);
  if (tabData) {
    // Mark as closed
    tabData.status = 'closed';
    tabData.closedAt = new Date().toISOString();
    await saveTabData(tabData);
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTabId') {
    sendResponse({ tabId: sender.tab?.id });
    return true;
  }
  
  if (request.action === 'hasIntent') {
    getTabData(request.tabId).then(tabData => {
      sendResponse(!!tabData);
    });
    return true;
  }
  
  if (request.action === 'saveIntent') {
    handleSaveIntent(request.data, sender.tab.id).then(sendResponse);
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'markDone') {
    markTabDone(request.tabId).then(sendResponse);
    return true;
  }
  
  if (request.action === 'snoozeReminder') {
    snoozeReminder(request.tabId, request.duration).then(sendResponse);
    return true;
  }
  
  if (request.action === 'getTodayStats') {
    getTodayStats().then(sendResponse);
    return true;
  }
});

// Handle saving tab intent
async function handleSaveIntent(data, tabId) {
  const tab = await chrome.tabs.get(tabId);
  
  const tabData = {
    tabId: tabId,
    url: tab.url,
    title: tab.title,
    intent: data.intent,
    note: data.note || '',
    openedAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    status: 'open',
    remindersSent: 0,
    snoozedUntil: null
  };
  
  await saveTabData(tabData);
  
  // Schedule first reminder
  scheduleReminder(tabId, REMINDER_TIMES[0]);
  
  return { success: true };
}

// Save tab data to storage
async function saveTabData(tabData) {
  const key = `tab_${tabData.tabId}`;
  await chrome.storage.local.set({ [key]: tabData });
  
  // Also add to all tabs index
  const { allTabs = {} } = await chrome.storage.local.get('allTabs');
  allTabs[tabData.tabId] = {
    openedAt: tabData.openedAt,
    intent: tabData.intent,
    status: tabData.status
  };
  await chrome.storage.local.set({ allTabs });
}

// Get tab data
async function getTabData(tabId) {
  const key = `tab_${tabId}`;
  const result = await chrome.storage.local.get(key);
  return result[key];
}

// Update tab activity
async function updateTabActivity(tabId) {
  const tabData = await getTabData(tabId);
  if (tabData) {
    tabData.lastActive = new Date().toISOString();
    await saveTabData(tabData);
  }
}

// Mark tab as done
async function markTabDone(tabId) {
  const tabData = await getTabData(tabId);
  if (tabData) {
    tabData.status = 'done';
    tabData.completedAt = new Date().toISOString();
    await saveTabData(tabData);
  }
  return { success: true };
}

// Schedule reminder
function scheduleReminder(tabId, delayMinutes) {
  const alarmName = `reminder_${tabId}`;
  chrome.alarms.create(alarmName, {
    delayInMinutes: delayMinutes
  });
}

// Snooze reminder
async function snoozeReminder(tabId, durationMinutes) {
  const tabData = await getTabData(tabId);
  if (tabData) {
    tabData.snoozedUntil = new Date(Date.now() + durationMinutes * 60000).toISOString();
    await saveTabData(tabData);
    scheduleReminder(tabId, durationMinutes);
  }
  return { success: true };
}

// Listen for alarms (reminders)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('reminder_')) {
    const tabId = parseInt(alarm.name.split('_')[1]);
    await sendReminder(tabId);
  }
  
  if (alarm.name === 'dailySummary') {
    await sendDailySummary();
  }
});

// Send reminder notification
async function sendReminder(tabId) {
  const tabData = await getTabData(tabId);
  
  if (!tabData || tabData.status !== 'open') {
    return;
  }
  
  // Check if snoozed
  if (tabData.snoozedUntil && new Date(tabData.snoozedUntil) > new Date()) {
    return;
  }
  
  // Check if tab still exists
  try {
    const tab = await chrome.tabs.get(tabId);
    
    const timeAgo = getTimeAgo(new Date(tabData.openedAt));
    const intentLabel = INTENT_GROUPS[tabData.intent]?.label || 'Unknown';
    
    chrome.notifications.create(`reminder_${tabId}`, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '⏰ Tab Reminder',
      message: `You opened "${tabData.title}" ${timeAgo} ago for ${intentLabel}${tabData.note ? ': ' + tabData.note : ''}`,
      buttons: [
        { title: '✓ Mark Done' },
        { title: '⏰ Snooze 30min' }
      ],
      requireInteraction: true
    });
    
    tabData.remindersSent++;
    await saveTabData(tabData);
    
    // Schedule next reminder if not too many
    if (tabData.remindersSent < REMINDER_TIMES.length) {
      scheduleReminder(tabId, REMINDER_TIMES[tabData.remindersSent]);
    }
  } catch (error) {
    // Tab closed, mark as closed
    tabData.status = 'closed';
    await saveTabData(tabData);
  }
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (notificationId.startsWith('reminder_')) {
    const tabId = parseInt(notificationId.split('_')[1]);
    
    if (buttonIndex === 0) {
      // Mark done
      await markTabDone(tabId);
      chrome.notifications.clear(notificationId);
    } else if (buttonIndex === 1) {
      // Snooze
      await snoozeReminder(tabId, 30);
      chrome.notifications.clear(notificationId);
    }
  }
});

// Get today's stats
async function getTodayStats() {
  const { allTabs = {} } = await chrome.storage.local.get('allTabs');
  const today = new Date().toDateString();
  
  let todayTabs = [];
  for (const [tabId, tabInfo] of Object.entries(allTabs)) {
    const openedDate = new Date(tabInfo.openedAt).toDateString();
    if (openedDate === today) {
      todayTabs.push(tabInfo);
    }
  }
  
  const stillOpen = todayTabs.filter(t => t.status === 'open').length;
  const markedUseful = todayTabs.filter(t => t.status === 'done').length;
  
  return {
    total: todayTabs.length,
    stillOpen,
    markedUseful
  };
}

// Send daily summary
async function sendDailySummary() {
  const stats = await getTodayStats();
  
  if (stats.total === 0) return;
  
  chrome.notifications.create('dailySummary', {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: '📊 Your Tab Day Summary',
    message: `You opened ${stats.total} tabs today\n${stats.stillOpen} are still open\n${stats.markedUseful} were marked useful`,
    requireInteraction: false
  });
}

// Schedule daily summary at 9 PM
function scheduleDailySummary() {
  const now = new Date();
  const tonight = new Date();
  tonight.setHours(21, 0, 0, 0);
  
  if (now > tonight) {
    tonight.setDate(tonight.getDate() + 1);
  }
  
  const delayMinutes = (tonight - now) / 60000;
  
  chrome.alarms.create('dailySummary', {
    delayInMinutes: delayMinutes,
    periodInMinutes: 24 * 60 // Repeat daily
  });
}

// Helper: Get time ago string
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
  return `${Math.floor(seconds / 86400)} days`;
}

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('Tab Intent Tracker installed!');
  console.log('NOTE: Extension will only work on regular web pages (http/https)');
  console.log('It cannot run on chrome://, chrome-extension://, or new tab pages');
  scheduleDailySummary();
});

// Initialize on startup
scheduleDailySummary();
