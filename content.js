function isMac() {
  return navigator.platform.toUpperCase().includes("MAC");
}

function toggleViaHotkey() {
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
  const btn = findMicButton();
  if (btn) {
    btn.click();
    return true;
  }
  return false;
}

function toggleMute() {
  // Try DOM click first as it mirrors UI state and avoids focus issues
  if (!toggleViaClick()) {
    // Fallback to hotkey if button not found
    toggleViaHotkey();
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
  if (msg?.type === "TOGGLE_MUTE") {
    try {
      toggleMute();
    } catch (e) {
      // swallow
    }
  }
});
