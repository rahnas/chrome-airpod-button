// Options page functionality for Chrome AirPods Button Extension

// Default settings
const DEFAULT_SETTINGS = {
  mediaSessionCapture: true,
  debugLogging: false
};

// DOM elements
let mediaSessionCheckbox;
let debugLoggingCheckbox;
let saveButton;
let statusDiv;

// Initialize the options page
document.addEventListener('DOMContentLoaded', async () => {
  // Get DOM elements
  mediaSessionCheckbox = document.getElementById('mediaSessionCapture');
  debugLoggingCheckbox = document.getElementById('debugLogging');
  saveButton = document.getElementById('saveOptions');
  statusDiv = document.getElementById('status');

  // Load current settings
  await loadSettings();

  // Add event listeners
  saveButton.addEventListener('click', saveSettings);
  mediaSessionCheckbox.addEventListener('change', onSettingChange);
  debugLoggingCheckbox.addEventListener('change', onSettingChange);
});

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    
    // Update checkboxes with saved settings
    mediaSessionCheckbox.checked = result.mediaSessionCapture;
    debugLoggingCheckbox.checked = result.debugLogging;
    
    console.log('Loaded settings:', result);
  } catch (error) {
    console.error('Error loading settings:', error);
    
    // Fall back to default settings
    mediaSessionCheckbox.checked = DEFAULT_SETTINGS.mediaSessionCapture;
    debugLoggingCheckbox.checked = DEFAULT_SETTINGS.debugLogging;
  }
}

// Save settings to storage
async function saveSettings() {
  const settings = {
    mediaSessionCapture: mediaSessionCheckbox.checked,
    debugLogging: debugLoggingCheckbox.checked
  };

  try {
    await chrome.storage.sync.set(settings);
    
    console.log('Settings saved:', settings);
    showStatus('Settings saved successfully!', 'success');
    
    // Notify background script of settings change
    try {
      await chrome.runtime.sendMessage({
        type: 'SETTINGS_UPDATED',
        settings: settings
      });
    } catch (error) {
      console.log('Background script not available, settings will be applied on next extension reload');
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings. Please try again.', 'error');
  }
}

// Handle individual setting changes
function onSettingChange() {
  // Auto-save when settings change
  saveSettings();
}

// Show status message
function showStatus(message, type = 'success') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  // Hide status after 3 seconds
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}

// Handle runtime errors
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SETTINGS_ERROR') {
    showStatus(message.error, 'error');
  }
});

// Export for debugging
if (typeof window !== 'undefined') {
  window.optionsPage = {
    loadSettings,
    saveSettings,
    showStatus
  };
}
