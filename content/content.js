// Content script - runs on all pages
// Shows intent popup when page loads

console.log('Tab Intent Tracker: Content script loaded');

let popupShown = false;

// Check if we should show the popup for this page
async function checkAndShowPopup() {
  // Don't show multiple times
  if (popupShown) return;
  
  // Don't show on restricted pages
  if (window.location.protocol === 'chrome:' || 
      window.location.protocol === 'chrome-extension:' ||
      window.location.protocol === 'about:') {
    return;
  }
  
  // Get current tab ID
  const response = await chrome.runtime.sendMessage({ action: 'getTabId' });
  if (!response) return;
  
  const tabId = response.tabId;
  
  // Check if this tab already has intent
  const hasIntent = await chrome.runtime.sendMessage({ 
    action: 'hasIntent', 
    tabId: tabId 
  });
  
  if (!hasIntent) {
    // Show the popup
    showIntentPopup();
    popupShown = true;
  }
}

// Show popup after a short delay (let page load a bit)
setTimeout(checkAndShowPopup, 1500);

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ status: 'alive' });
  }
  
  if (request.action === 'showIntentPopup') {
    showIntentPopup();
    sendResponse({ success: true });
  }
  
  return true;
});

// Function to show the intent popup
function showIntentPopup() {
  // Don't inject multiple times
  if (document.getElementById('tab-intent-overlay')) return;
  
  // Create the popup overlay
  const overlay = document.createElement('div');
  overlay.id = 'tab-intent-overlay';
  overlay.innerHTML = `
    <div class="tab-intent-popup">
      <div class="tab-intent-header">
        <span class="tab-intent-emoji">👉</span>
        <h2>Why did you open this tab?</h2>
        <button class="tab-intent-close" id="closeIntentPopup">×</button>
      </div>
      
      <div class="tab-intent-options">
        <button class="intent-btn" data-intent="research">
          <span class="intent-emoji">📚</span>
          <span class="intent-label">Research</span>
        </button>
        <button class="intent-btn" data-intent="shopping">
          <span class="intent-emoji">🛒</span>
          <span class="intent-label">Shopping</span>
        </button>
        <button class="intent-btn" data-intent="read_later">
          <span class="intent-emoji">📖</span>
          <span class="intent-label">Read Later</span>
        </button>
        <button class="intent-btn" data-intent="work_task">
          <span class="intent-emoji">💼</span>
          <span class="intent-label">Work Task</span>
        </button>
        <button class="intent-btn" data-intent="random">
          <span class="intent-emoji">🎲</span>
          <span class="intent-label">Random / Distraction</span>
        </button>
      </div>
      
      <div class="tab-intent-note">
        <input 
          type="text" 
          id="intentNote" 
          placeholder="Optional: Quick note (e.g., 'prepare for interview')"
          maxlength="100"
        />
      </div>
      
      <div class="tab-intent-footer">
        <button class="skip-btn" id="skipIntent">Skip</button>
      </div>
    </div>
  `;

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    #tab-intent-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483647;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .tab-intent-popup {
      background: white;
      border-radius: 20px;
      padding: 32px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .tab-intent-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      position: relative;
    }

    .tab-intent-emoji {
      font-size: 32px;
    }

    .tab-intent-header h2 {
      margin: 0;
      font-size: 22px;
      font-weight: 600;
      color: #1f2937;
      flex: 1;
    }

    .tab-intent-close {
      position: absolute;
      top: -8px;
      right: -8px;
      background: #f3f4f6;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      font-size: 24px;
      cursor: pointer;
      color: #6b7280;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .tab-intent-close:hover {
      background: #e5e7eb;
      transform: scale(1.1);
    }

    .tab-intent-options {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }

    .intent-btn {
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .intent-btn:hover {
      background: #f3f4f6;
      border-color: #6366f1;
      transform: translateY(-2px);
    }

    .intent-btn:active {
      transform: translateY(0);
    }

    .intent-emoji {
      font-size: 28px;
    }

    .intent-label {
      font-size: 14px;
      font-weight: 500;
      color: #374151;
    }

    .tab-intent-note {
      margin-bottom: 20px;
    }

    #intentNote {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }

    #intentNote:focus {
      outline: none;
      border-color: #6366f1;
    }

    #intentNote::placeholder {
      color: #9ca3af;
    }

    .tab-intent-footer {
      display: flex;
      justify-content: center;
    }

    .skip-btn {
      background: transparent;
      border: none;
      color: #6b7280;
      font-size: 14px;
      cursor: pointer;
      padding: 8px 16px;
      border-radius: 8px;
      transition: all 0.2s;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .skip-btn:hover {
      background: #f3f4f6;
      color: #374151;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  // Handle intent selection
  const intentButtons = overlay.querySelectorAll('.intent-btn');
  intentButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const intent = btn.dataset.intent;
      const note = document.getElementById('intentNote').value.trim();
      
      // Send to background script
      chrome.runtime.sendMessage({
        action: 'saveIntent',
        data: { intent, note }
      }, (response) => {
        closePopup();
      });
    });
  });

  // Handle close and skip
  function closePopup() {
    overlay.style.animation = 'fadeOut 0.2s ease';
    setTimeout(() => {
      overlay.remove();
    }, 200);
  }

  document.getElementById('closeIntentPopup').addEventListener('click', closePopup);
  document.getElementById('skipIntent').addEventListener('click', closePopup);

  // Close on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePopup();
    }
  });

  // Auto-focus note input when user starts typing
  document.addEventListener('keydown', (e) => {
    const noteInput = document.getElementById('intentNote');
    if (noteInput && e.target !== noteInput && 
        e.key.length === 1 && 
        !e.ctrlKey && 
        !e.metaKey) {
      noteInput.focus();
    }
  });
}

