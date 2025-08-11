chrome.runtime.onInstalled.addListener(() => {
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
  if (!tab) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_MUTE" });
  } catch (e) {
    // If content script isn't injected (e.g., navigated), inject and retry
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
    await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_MUTE" });
  }
}

// Handle keyboard command
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-mute" || command === "media-play-pause") {
    sendToggleMute();
  }
});

// Media Session integration for Play/Pause from AirPods
// In a service worker, we can't play media, but we can still set handlers.
// Some platforms deliver media keys to the last media-session-aware context.
// This may not work in all configurations; the keyboard command remains a fallback.
if ("mediaSession" in navigator) {
  try {
    navigator.mediaSession.setActionHandler("play", sendToggleMute);
    navigator.mediaSession.setActionHandler("pause", sendToggleMute);
    navigator.mediaSession.setActionHandler("playpause", sendToggleMute);
  } catch (e) {
    // Handlers may throw if unsupported; ignore
  }
}
