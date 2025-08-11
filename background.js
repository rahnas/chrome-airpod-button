// Debug flag to control logging
const DEBUG = false;

// In-memory flag to control media session capture
let mediaSessionCaptureEnabled = true;

chrome.runtime.onInstalled.addListener(() => {
  if (DEBUG) console.log('Extension installed');
  // Optional initialization
});

async function getActiveMeetTab() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const active = tabs[0];
  if (active && active.url && active.url.includes("meet.google.com")) return active;
  // If current active tab isn't a Meet tab, search all tabs for an active Meet call
  const meetTabs = await chrome.tabs.query({ url: ["*://meet.google.com/*"] });
  // Prefer audible or camera/mic capturing tab if detectable
  const candidate = meetTabs.find(t => t.audible) || meetTabs[0];
  return candidate || null;
}

// Send a message to the content script to toggle mute
async function sendToggleMute() {
  const tab = await getActiveMeetTab();
  if (!tab) {
    if (DEBUG) console.log('No active Meet tab found');
    return;
  }
  try {
    if (DEBUG) console.log('Sending toggle mute to tab:', tab.id);
    await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_MUTE" });
  } catch (e) {
    if (DEBUG) console.log('Content script not injected, injecting and retrying');
    // If content script isn't injected (e.g., navigated), inject and retry
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
    await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_MUTE" });
  }
}

// Function to setup media session handlers
function setupMediaSessionHandlers() {
  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.setActionHandler("play", sendToggleMute);
      navigator.mediaSession.setActionHandler("pause", sendToggleMute);
      navigator.mediaSession.setActionHandler("playpause", sendToggleMute);
      if (DEBUG) console.log('Media session handlers registered');
    } catch (e) {
      if (DEBUG) console.log('Failed to register media session handlers:', e);
      // Handlers may throw if unsupported; ignore
    }
  }
}

// Function to remove media session handlers
function removeMediaSessionHandlers() {
  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("playpause", null);
      if (DEBUG) console.log('Media session handlers removed');
    } catch (e) {
      if (DEBUG) console.log('Failed to remove media session handlers:', e);
    }
  }
}

// Handle keyboard command
chrome.commands.onCommand.addListener((command) => {
  if (DEBUG) console.log('Command received:', command);
  if (command === "toggle-mute" || command === "media-play-pause") {
    sendToggleMute();
  }
});

// Handle runtime messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (DEBUG) console.log('Message received:', message);
  
  if (message.type === "SET_MEDIA_CAPTURE") {
    mediaSessionCaptureEnabled = message.value;
    if (DEBUG) console.log('Media capture enabled set to:', mediaSessionCaptureEnabled);
    
    if (mediaSessionCaptureEnabled) {
      setupMediaSessionHandlers();
    } else {
      removeMediaSessionHandlers();
    }
    
    sendResponse({ success: true, enabled: mediaSessionCaptureEnabled });
  }
  
  return true; // Keep message channel open for async response
});

// Initialize media session handlers if enabled
if (mediaSessionCaptureEnabled) {
  setupMediaSessionHandlers();
}
