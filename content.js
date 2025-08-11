const DEBUG = false;

function isMac() {
  return navigator.platform.toUpperCase().includes("MAC");
}

function showToast(message) {
  // Remove any existing toast
  const existingToast = document.getElementById('mute-toast');
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.id = 'mute-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    transition: opacity 0.3s ease;
  `;

  document.body.appendChild(toast);

  // Auto-remove after 2 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function toggleViaHotkey() {
  if (DEBUG) console.log('Attempting hotkey toggle');
  const evt = new KeyboardEvent("keydown", {
    key: "d",
    code: "KeyD",
    bubbles: true,
    cancelable: true,
    ctrlKey: !isMac(),
    metaKey: isMac()
  });
  document.dispatchEvent(evt);
}

function findMicButton() {
  // Google Meet mic button often has aria-label like "Turn off microphone" or "Turn on microphone"
  const selectors = [
    'button[aria-label*="microphone"]',
    'button[aria-label*="Microphone"]',
    'div[role="button"][aria-label*="microphone"]',
    'div[role="button"][data-tooltip*="microphone"]',
    'button[aria-pressed][data-is-muted]', // fallback patterns
  ];
  
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  
  // Try icon-based search
  const icons = Array.from(document.querySelectorAll('svg, path, i, span'));
  const micIcon = icons.find(el => {
    const t = (el.getAttribute("aria-label") || el.getAttribute("data-tooltip") || el.textContent || "").toLowerCase();
    return t.includes("microphone") || t.includes("mic");
  });
  
  return micIcon ? micIcon.closest('button,[role="button"]') : null;
}

function toggleViaClick() {
  if (DEBUG) console.log('Attempting DOM click toggle');
  const btn = findMicButton();
  if (btn) {
    btn.click();
    return true;
  }
  return false;
}

function getMuteStatus() {
  const btn = findMicButton();
  if (btn) {
    const ariaLabel = btn.getAttribute('aria-label') || '';
    const isPressed = btn.getAttribute('aria-pressed') === 'true';
    const isMuted = btn.hasAttribute('data-is-muted');
    
    // Determine mute status from various indicators
    if (ariaLabel.toLowerCase().includes('turn off')) return false; // currently unmuted
    if (ariaLabel.toLowerCase().includes('turn on')) return true;   // currently muted
    if (isPressed || isMuted) return true;
  }
  return null; // unknown status
}

function toggleMute() {
  const wasPressed = getMuteStatus();
  if (DEBUG) console.log('Current mute status:', wasPressed);
  
  // Try hotkey first (primary method)
  toggleViaHotkey();
  
  // Fallback to DOM click if hotkey doesn't work
  setTimeout(() => {
    const newStatus = getMuteStatus();
    if (newStatus === wasPressed) {
      // Status didn't change, try DOM click as fallback
      if (DEBUG) console.log('Hotkey failed, trying DOM click fallback');
      toggleViaClick();
    }
    
    // Show status toast
    setTimeout(() => {
      const finalStatus = getMuteStatus();
      const message = finalStatus === true ? 'Muted' : finalStatus === false ? 'Unmuted' : 'Toggled';
      showToast(message);
    }, 100);
  }, 100);
}

chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
  if (msg?.type === "TOGGLE_MUTE") {
    try {
      toggleMute();
    } catch (e) {
      if (DEBUG) console.error('Toggle mute error:', e);
      // swallow
    }
  }
});
