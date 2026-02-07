# 🚀 Quick Installation Guide

## Step 1: Load Extension in Chrome

1. Open Chrome and go to: `chrome://extensions/`

2. Enable **Developer mode** (toggle in top-right corner)

3. Click **"Load unpacked"**

4. Select the `tab-intent-extension` folder (this folder)

5. Done! You should see "Tab Intent Tracker" in your extensions

## Step 2: Test It

1. Open a **new tab** and navigate to a **real website** (like google.com, reddit.com, etc.)
   - ⚠️ **Important**: The extension CANNOT run on:
     - `chrome://` pages (like chrome://extensions)
     - `chrome-extension://` pages
     - `about:blank` or empty new tab pages
     - Other browser internal pages

2. Navigate to any HTTP/HTTPS website (e.g., type "reddit.com" in address bar)

3. You should see the popup asking "Why did you open this tab?"

4. Select an intent (Research, Shopping, etc.)

5. Optionally add a note

6. Click the extension icon (puzzle piece → Tab Intent Tracker) to see your dashboard

## Step 3: Wait for Reminders

- After 30 minutes, you'll get a reminder about your tab
- Click "Mark Done" or "Snooze 30min"
- At 9 PM, you'll get a daily summary

## Troubleshooting

### Popup doesn't appear?

**Most Common Issue**: You're on a restricted page!
- Chrome extensions CANNOT run on `chrome://` URLs
- They CANNOT run on `chrome-extension://` URLs  
- They CANNOT run on `about:blank` or the default new tab page
- **Solution**: Navigate to ANY real website (google.com, github.com, reddit.com, etc.)

**Other checks**:
- Check if the extension is enabled in `chrome://extensions/`
- Make sure you're on an http:// or https:// website
- Open Developer Tools → Console to check for errors

### How to test properly:
1. Open a new tab
2. Type a real URL like "github.com" or "reddit.com"
3. Press Enter
4. The popup should appear as the page loads!

### No notifications?
- Make sure Chrome has notification permissions
- Check your OS notification settings
- Click the background service worker in extensions page to see logs

### View extension logs
1. Go to `chrome://extensions/`
2. Find "Tab Intent Tracker"
3. Click "Inspect views: service worker"
4. Check Console tab

## Testing the Extension

```javascript
// Open extension console and run:

// View all stored data
chrome.storage.local.get(null, (data) => console.log(data));

// Test notification
chrome.notifications.create('test', {
  type: 'basic',
  iconUrl: 'icons/icon128.png',
  title: 'Test Notification',
  message: 'Notifications are working!'
});

// Trigger daily summary manually
chrome.runtime.sendMessage({ action: 'getTodayStats' }, (stats) => {
  console.log('Today Stats:', stats);
});
```

## What to Expect

### When you open a new tab:
- Popup appears with intent options
- Takes 2 seconds to capture why you opened it
- Can skip if you want

### After 30 minutes:
- Notification: "You opened 'Article' 30min ago for Research"
- Options to mark done or snooze

### At 9 PM daily:
- Summary: "You opened 18 tabs today, 12 still open, 3 marked useful"

### Click extension icon anytime:
- See today's stats
- View tabs grouped by intent
- Recent tabs list

---

## Need Help?

Open an issue or check the main README.md for architecture details!
